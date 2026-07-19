import { db } from '$lib/server/db/index.js';
import { balance, balanceItem } from '$lib/server/db/schema.ts';
import { eq, sql } from 'drizzle-orm';

export async function load() {
    const balances = await db
        .select({
            id: balance.id,
            shortId: balance.shortId,
            label: balance.label,
            initialAmount: balance.initialAmount,
            paymentDate: balance.paymentDate,
            paymentMethod: balance.paymentMethod,
            expiresAt: balance.expiresAt,
            createdAt: balance.createdAt,
            totalSpent: sql`COALESCE(SUM(${balanceItem.amount} * (1.0 - ${balanceItem.discountPct} / 100.0)), 0)`.mapWith(Number)
        })
        .from(balance)
        .leftJoin(balanceItem, eq(balance.id, balanceItem.balanceId))
        .groupBy(balance.id)
        .orderBy(sql`${balance.createdAt} DESC`);

    return { balances };
}
