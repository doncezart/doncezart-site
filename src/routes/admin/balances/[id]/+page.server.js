import { hashPin, getBalanceWithItems } from '$lib/server/balance.js';
import { db } from '$lib/server/db/index.js';
import { balance, balanceItem, auditEvent } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import crypto from 'node:crypto';

export async function load({ params }) {
    const data = await getBalanceWithItems(params.id);
    if (!data) {
        throw redirect(303, '/admin/balances');
    }
    return {
        balance: data.balance,
        items: data.items
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
        if (!initialAmountStr || isNaN(Number(initialAmountStr)) || Number(initialAmountStr) < 0) {
            return fail(400, { error: 'Valid initial amount is required.' });
        }
        if (newPin && (newPin.length !== 4 || !/^[a-zA-Z]{4}$/.test(newPin))) {
            return fail(400, { error: 'PIN must be exactly 4 letters.' });
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
        const title = data.get('title')?.toString().trim();
        const amountStr = data.get('amount')?.toString().trim();
        const type = data.get('type')?.toString().trim();
        const url = data.get('url')?.toString().trim() || null;
        const discountStr = data.get('discountPct')?.toString().trim() || '0';

        if (!title) return fail(400, { itemError: 'Title is required.' });
        if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) < 0) {
            return fail(400, { itemError: 'Valid amount is required.' });
        }
        if (!type) return fail(400, { itemError: 'Type is required.' });

        const discountPct = Math.min(100, Math.max(0, parseInt(discountStr) || 0));
        const amount = Math.round(Number(amountStr) * 100);
        const id = crypto.randomUUID();

        await db.insert(balanceItem).values({
            id,
            balanceId: params.id,
            title,
            amount,
            type,
            url,
            discountPct,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await logAudit(locals.user, 'balance_item.create', 'balance_item', id, { title, amount, type }, getClientAddress());

        return { success: true };
    },

    updateItem: async ({ request, locals, getClientAddress }) => {
        const data = await request.formData();
        const itemId = data.get('itemId')?.toString();
        const title = data.get('title')?.toString().trim();
        const amountStr = data.get('amount')?.toString().trim();
        const type = data.get('type')?.toString().trim();
        const url = data.get('url')?.toString().trim() || null;
        const discountStr = data.get('discountPct')?.toString().trim() || '0';

        if (!itemId) return fail(400, { itemError: 'Item ID is required.' });
        if (!title) return fail(400, { itemError: 'Title is required.' });
        if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) < 0) {
            return fail(400, { itemError: 'Valid amount is required.' });
        }
        if (!type) return fail(400, { itemError: 'Type is required.' });

        const discountPct = Math.min(100, Math.max(0, parseInt(discountStr) || 0));
        const amount = Math.round(Number(amountStr) * 100);

        await db.update(balanceItem).set({
            title,
            amount,
            type,
            url,
            discountPct,
            updatedAt: new Date()
        }).where(eq(balanceItem.id, itemId));

        await logAudit(locals.user, 'balance_item.update', 'balance_item', itemId, {
            changed: ['title', 'amount', 'type', 'url', 'discountPct']
        }, getClientAddress());

        return { success: true };
    },

    deleteItem: async ({ request, locals, getClientAddress }) => {
        const data = await request.formData();
        const itemId = data.get('itemId')?.toString();
        const mode = data.get('mode')?.toString(); // 'delete' or 'free'

        if (!itemId) return fail(400, { itemError: 'Item ID is required.' });

        const [item] = await db.select().from(balanceItem).where(eq(balanceItem.id, itemId)).limit(1);
        if (!item) return fail(400, { itemError: 'Item not found.' });

        if (mode === 'free') {
            await db.update(balanceItem).set({ discountPct: 100, updatedAt: new Date() }).where(eq(balanceItem.id, itemId));
            await logAudit(locals.user, 'balance_item.update', 'balance_item', itemId, {
                changed: ['discountPct'], newValue: 100
            }, getClientAddress());
        } else {
            await db.delete(balanceItem).where(eq(balanceItem.id, itemId));
            await logAudit(locals.user, 'balance_item.delete', 'balance_item', itemId, {
                title: item.title
            }, getClientAddress());
        }

        return { success: true };
    },

    reorderItems: async ({ request }) => {
        const data = await request.formData();
        const orderJson = data.get('order')?.toString();
        if (!orderJson) return fail(400, { itemError: 'Order data is required.' });

        const order = JSON.parse(orderJson);
        for (const { id, sortOrder } of order) {
            await db.update(balanceItem).set({ sortOrder }).where(eq(balanceItem.id, id));
        }

        return { success: true };
    }
};
