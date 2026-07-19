import { generateShortId, hashPin } from '$lib/server/balance.js';
import { db } from '$lib/server/db/index.js';
import { balance, auditEvent } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import crypto from 'node:crypto';

export const actions = {
    default: async ({ request, locals, getClientAddress }) => {
        const data = await request.formData();
        const label = data.get('label')?.toString().trim() || null;
        const initialAmountStr = data.get('initialAmount')?.toString().trim();
        const paymentDate = data.get('paymentDate')?.toString().trim();
        const paymentMethod = data.get('paymentMethod')?.toString().trim();
        const pin = data.get('pin')?.toString().trim();
        const expiresAtStr = data.get('expiresAt')?.toString().trim() || null;

        if (!initialAmountStr || isNaN(Number(initialAmountStr)) || Number(initialAmountStr) <= 0) {
            return fail(400, { error: 'Initial amount must be greater than 0.', values: { label, initialAmount: initialAmountStr, paymentDate, paymentMethod, expiresAt: expiresAtStr } });
        }
        if (!paymentDate) {
            return fail(400, { error: 'Payment date is required.', values: { label, initialAmount: initialAmountStr, paymentMethod, expiresAt: expiresAtStr } });
        }
        if (!paymentMethod) {
            return fail(400, { error: 'Payment method is required.', values: { label, initialAmount: initialAmountStr, paymentDate, expiresAt: expiresAtStr } });
        }
        if (!pin || pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
            return fail(400, { error: 'PIN must be exactly 4 digits.', values: { label, initialAmount: initialAmountStr, paymentDate, paymentMethod, expiresAt: expiresAtStr } });
        }

        const id = crypto.randomUUID();
        let shortId;
        for (let i = 0; i < 5; i++) {
            shortId = generateShortId();
            const exists = await db.select({ id: balance.id }).from(balance).where(eq(balance.shortId, shortId)).limit(1);
            if (exists.length === 0) break;
            if (i === 4) return fail(500, { error: 'Could not generate unique ID. Please try again.' });
        }

        const initialAmount = Math.round(Number(initialAmountStr) * 100);
        const pinHash = await hashPin(pin);
        const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

        await db.insert(balance).values({
            id,
            shortId,
            pinHash,
            initialAmount,
            paymentDate: new Date(paymentDate),
            paymentMethod,
            label,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await db.insert(auditEvent).values({
            actorId: locals.user?.id ?? null,
            actorUsername: locals.user?.username ?? null,
            action: 'balance.create',
            entityType: 'balance',
            entityId: id,
            payload: { label, initialAmount },
            ip: getClientAddress()
        });

        throw redirect(303, `/admin/balances/${id}`);
    }
};
