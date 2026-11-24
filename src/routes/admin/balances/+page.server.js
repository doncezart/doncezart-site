import { db } from '$lib/server/db/index.js';
import { balance } from '$lib/server/db/schema.ts';
import { getLedger } from '$lib/server/balance.js';
import { sql } from 'drizzle-orm';

export async function load() {
    const balances = await db
        .select()
        .from(balance)
        .orderBy(sql`${balance.paymentDate} DESC`, sql`${balance.createdAt} DESC`);

    if (balances.length === 0) return { balances: [] };

    const { ledger } = await getLedger();

    return {
        balances: balances.map((b) => ({
            id: b.id,
            shortId: b.shortId,
            label: b.label,
            paymentDate: b.paymentDate,
            paymentMethod: b.paymentMethod,
            expiresAt: b.expiresAt,
            createdAt: b.createdAt,
            ...ledger.get(b.id)
        }))
    };
}
