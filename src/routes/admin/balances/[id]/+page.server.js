import { hashPin, getBalanceWithItems, getPreviousBalances } from '$lib/server/balance.js';
import { db } from '$lib/server/db/index.js';
import { balance, balanceItem, balancePrevious, auditEvent } from '$lib/server/db/schema.ts';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import crypto from 'node:crypto';

export async function load({ params }) {
    const data = await getBalanceWithItems(params.id);
    if (!data) {
        throw redirect(303, '/admin/balances');
    }

    const previousBalances = await getPreviousBalances(params.id);

    // Everything except this balance and already-linked ones can be linked.
    const allOther = await db
        .select({ id: balance.id, shortId: balance.shortId, label: balance.label, paymentDate: balance.paymentDate })
        .from(balance)
        .where(ne(balance.id, params.id))
        .orderBy(sql`${balance.createdAt} DESC`);
    const linkedIds = new Set(previousBalances.map(p => p.id));

    return {
        balance: data.balance,
        items: data.items,
        previousBalances,
        linkableBalances: allOther.filter(b => !linkedIds.has(b.id))
    };
}

function logAudit(actor, action, entityType, entityId, payload, ip) {
    return db.insert(auditEvent).values({
        actorId: actor?.id ?? null,
        actorUsername: actor?.username ?? null,
        action,
        entityType,
        entityId,
        payload,
        ip
    });
}

/** Parse + validate the shared add/update item form fields. Returns { error } or the parsed values.
 *  `typeRequired` is false for sub-services, which are just a title + amount. */
function parseItemFields(data, { typeRequired = true } = {}) {
    const title = data.get('title')?.toString().trim();
    const amountStr = data.get('amount')?.toString().trim();
    const type = data.get('type')?.toString().trim() ?? '';
    const url = data.get('url')?.toString().trim() || null;
    const discountStr = data.get('discountPct')?.toString().trim() || '0';

    if (!title) return { error: 'Title is required.' };
    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) < 0) {
        return { error: 'Valid amount is required.' };
    }
    if (typeRequired && !type) return { error: 'Type is required.' };
    if (url && !/^https?:\/\//i.test(url)) {
        return { error: 'URL must start with http:// or https://' };
    }

    const discountPct = Math.min(100, Math.max(0, parseInt(discountStr) || 0));
    return {
        title,
        amount: Math.round(Number(amountStr) * 100),
        type,
        url,
        discountPct
    };
}

/**
 * Resolve the next sortOrder for a sibling group within a balance:
 * the max sortOrder among existing siblings + 1, so new items land at
 * the bottom (not at 0 like the old behaviour, which pushed them to the
 * top after the first reorder).
 *
 * @param {string} balanceId       The parent balance.
 * @param {string|null} parentId   The sub-service parent, or null for top-level services.
 */
async function nextSortOrder(balanceId, parentId) {
    const whereClause = parentId
        ? and(eq(balanceItem.balanceId, balanceId), eq(balanceItem.parentId, parentId))
        : and(eq(balanceItem.balanceId, balanceId), isNull(balanceItem.parentId));
    const [row] = await db
        .select({ maxSort: sql`COALESCE(MAX(${balanceItem.sortOrder}), -1)::int` })
        .from(balanceItem)
        .where(whereClause);
    return Number(row?.maxSort ?? -1) + 1;
}

export const actions = {
    updateBalance: async ({ request, params, locals, getClientAddress }) => {
        const data = await request.formData();
        const label = data.get('label')?.toString().trim() || null;
        const paymentDate = data.get('paymentDate')?.toString().trim();
        const paymentMethod = data.get('paymentMethod')?.toString().trim();
        const initialAmountStr = data.get('initialAmount')?.toString().trim();
        const expiresAtStr = data.get('expiresAt')?.toString().trim() || null;
        const newPin = data.get('newPin')?.toString().trim() || null;

        if (!paymentDate) return fail(400, { error: 'Payment date is required.' });
        if (!paymentMethod) return fail(400, { error: 'Payment method is required.' });
        if (!initialAmountStr || isNaN(Number(initialAmountStr)) || Number(initialAmountStr) <= 0) {
            return fail(400, { error: 'Initial amount must be greater than 0.' });
        }
        if (newPin && (newPin.length !== 4 || !/^[0-9]{4}$/.test(newPin))) {
            return fail(400, { error: 'PIN must be exactly 4 digits.' });
        }

        const updateData = {
            label,
            paymentDate: new Date(paymentDate),
            paymentMethod,
            initialAmount: Math.round(Number(initialAmountStr) * 100),
            expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
            updatedAt: new Date()
        };

        if (newPin) {
            updateData.pinHash = await hashPin(newPin);
        }

        await db.update(balance).set(updateData).where(eq(balance.id, params.id));

        await logAudit(locals.user, 'balance.update', 'balance', params.id, {
            changed: Object.keys(updateData).filter(k => k !== 'updatedAt')
        }, getClientAddress());

        return { success: true };
    },

    deleteBalance: async ({ params, locals, getClientAddress }) => {
        const [bal] = await db.select({ label: balance.label }).from(balance).where(eq(balance.id, params.id)).limit(1);
        await db.delete(balance).where(eq(balance.id, params.id));
        await logAudit(locals.user, 'balance.delete', 'balance', params.id, { label: bal?.label }, getClientAddress());
        throw redirect(303, '/admin/balances');
    },

    addItem: async ({ request, params, locals, getClientAddress }) => {
        const data = await request.formData();
        const parentId = data.get('parentId')?.toString() || null;
        // Sub-services are a simple title + amount, so a type is not required.
        const parsed = parseItemFields(data, { typeRequired: !parentId });
        if (parsed.error) return fail(400, { itemError: parsed.error });

        // Sub-services can only hang off a top-level main service (parent_id IS NULL).
        if (parentId) {
            const [parent] = await db
                .select({ id: balanceItem.id, parentId: balanceItem.parentId })
                .from(balanceItem)
                .where(and(eq(balanceItem.id, parentId), eq(balanceItem.balanceId, params.id)))
                .limit(1);
            if (!parent || parent.parentId) {
                return fail(400, { itemError: 'Sub-services can only be added under a main service.' });
            }
        }

        const id = crypto.randomUUID();
        const sortOrder = await nextSortOrder(params.id, parentId);

        await db.insert(balanceItem).values({
            id,
            balanceId: params.id,
            parentId,
            title: parsed.title,
            amount: parsed.amount,
            type: parsed.type,
            url: parsed.url,
            discountPct: parsed.discountPct,
            sortOrder,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await logAudit(locals.user, 'balance_item.create', 'balance_item', id, {
            title: parsed.title,
            amount: parsed.amount,
            type: parsed.type,
            parentId
        }, getClientAddress());

        return { success: true };
    },

    updateItem: async ({ request, params, locals, getClientAddress }) => {
        const data = await request.formData();
        const itemId = data.get('itemId')?.toString();

        if (!itemId) return fail(400, { itemError: 'Item ID is required.' });

        // Scope the update to this balance so we can never touch another balance's item.
        const [existing] = await db
            .select({ id: balanceItem.id, parentId: balanceItem.parentId })
            .from(balanceItem)
            .where(and(eq(balanceItem.id, itemId), eq(balanceItem.balanceId, params.id)))
            .limit(1);
        if (!existing) return fail(400, { itemError: 'Item not found.' });

        // Sub-services are just a title + amount, so a type is not required.
        const parsed = parseItemFields(data, { typeRequired: !existing.parentId });
        if (parsed.error) return fail(400, { itemError: parsed.error });

        await db.update(balanceItem).set({
            title: parsed.title,
            amount: parsed.amount,
            type: parsed.type,
            url: parsed.url,
            discountPct: parsed.discountPct,
            updatedAt: new Date()
        }).where(eq(balanceItem.id, itemId));

        await logAudit(locals.user, 'balance_item.update', 'balance_item', itemId, {
            changed: ['title', 'amount', 'type', 'url', 'discountPct']
        }, getClientAddress());

        return { success: true };
    },

    deleteItem: async ({ request, params, locals, getClientAddress }) => {
        const data = await request.formData();
        const itemId = data.get('itemId')?.toString();
        const mode = data.get('mode')?.toString(); // 'delete' or 'free'

        if (!itemId) return fail(400, { itemError: 'Item ID is required.' });

        const [item] = await db
            .select()
            .from(balanceItem)
            .where(and(eq(balanceItem.id, itemId), eq(balanceItem.balanceId, params.id)))
            .limit(1);
        if (!item) return fail(400, { itemError: 'Item not found.' });

        if (mode === 'free') {
            await db.update(balanceItem).set({ discountPct: 100, updatedAt: new Date() }).where(eq(balanceItem.id, itemId));
            await logAudit(locals.user, 'balance_item.update', 'balance_item', itemId, {
                changed: ['discountPct'], newValue: 100
            }, getClientAddress());
        } else {
            // Deleting a main service cascades to its sub-services in the DB; note that in the audit.
            const [childCount] = await db
                .select({ count: sql`COUNT(*)::int` })
                .from(balanceItem)
                .where(eq(balanceItem.parentId, itemId));
            await db.delete(balanceItem).where(eq(balanceItem.id, itemId));
            await logAudit(locals.user, 'balance_item.delete', 'balance_item', itemId, {
                title: item.title,
                subServicesDeleted: Number(childCount?.count ?? 0)
            }, getClientAddress());
        }

        return { success: true };
    },

    linkPreviousBalance: async ({ request, params, locals, getClientAddress }) => {
        const data = await request.formData();
        const previousId = data.get('previousId')?.toString();
        if (!previousId) return fail(400, { previousError: 'Select a balance to link.' });
        if (previousId === params.id) return fail(400, { previousError: 'A balance cannot link to itself.' });

        const [prev] = await db.select({ id: balance.id }).from(balance).where(eq(balance.id, previousId)).limit(1);
        if (!prev) return fail(400, { previousError: 'Balance not found.' });

        const [existing] = await db
            .select()
            .from(balancePrevious)
            .where(and(eq(balancePrevious.balanceId, params.id), eq(balancePrevious.previousId, previousId)))
            .limit(1);
        if (existing) return fail(400, { previousError: 'That balance is already linked.' });

        const [agg] = await db
            .select({ maxPos: sql`COALESCE(MAX(${balancePrevious.position}), -1)::int` })
            .from(balancePrevious)
            .where(eq(balancePrevious.balanceId, params.id));

        await db.insert(balancePrevious).values({
            balanceId: params.id,
            previousId,
            position: Number(agg?.maxPos ?? -1) + 1
        });

        await logAudit(locals.user, 'balance.previous_link', 'balance', params.id, { previousId }, getClientAddress());

        return { success: true };
    },

    unlinkPreviousBalance: async ({ request, params, locals, getClientAddress }) => {
        const data = await request.formData();
        const previousId = data.get('previousId')?.toString();
        if (!previousId) return fail(400, { previousError: 'Balance is required.' });

        await db.delete(balancePrevious).where(and(
            eq(balancePrevious.balanceId, params.id),
            eq(balancePrevious.previousId, previousId)
        ));

        await logAudit(locals.user, 'balance.previous_unlink', 'balance', params.id, { previousId }, getClientAddress());

        return { success: true };
    },

    reorderItems: async ({ request, params }) => {
        const data = await request.formData();
        const orderJson = data.get('order')?.toString();
        if (!orderJson) return fail(400, { itemError: 'Order data is required.' });

        let order;
        try {
            order = JSON.parse(orderJson);
        } catch {
            return fail(400, { itemError: 'Invalid order data.' });
        }
        if (!Array.isArray(order) || order.length === 0) {
            return fail(400, { itemError: 'Invalid order data.' });
        }

        // Validate every id belongs to this balance and every parent is a real
        // top-level main service (sub-services can't have sub-services).
        const allItems = await db
            .select({ id: balanceItem.id, parentId: balanceItem.parentId })
            .from(balanceItem)
            .where(eq(balanceItem.balanceId, params.id));
        const itemMap = new Map(allItems.map(r => [r.id, r]));

        const cleaned = [];
        for (const entry of order) {
            const it = itemMap.get(entry.id);
            if (!it) return fail(400, { itemError: 'Order contains an item from another balance.' });
            const parentId = entry.parentId || null;
            if (parentId) {
                const parent = itemMap.get(parentId);
                if (!parent || parent.parentId) {
                    return fail(400, { itemError: 'Sub-services can only live under a main service.' });
                }
            }
            const sortOrder = Number(entry.sortOrder);
            if (!Number.isInteger(sortOrder) || sortOrder < 0) {
                return fail(400, { itemError: 'Invalid sort order.' });
            }
            cleaned.push({ id: entry.id, parentId, sortOrder });
        }

        for (const { id, parentId, sortOrder } of cleaned) {
            await db.update(balanceItem).set({
                parentId,
                sortOrder,
                updatedAt: new Date()
            }).where(eq(balanceItem.id, id));
        }

        return { success: true };
    }
};