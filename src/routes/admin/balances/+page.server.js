import { db } from '$lib/server/db/index.js';
import { balance, balanceItem } from '$lib/server/db/schema.ts';
import { eq, inArray, sql } from 'drizzle-orm';

export async function load() {
    const balances = await db
        .select()
        .from(balance)
        .orderBy(sql`${balance.createdAt} DESC`);

    if (balances.length === 0) return { balances: [] };

    // Fetch all items for all balances in one query, compute totals in JS
    const balanceIds = balances.map(b => b.id);
    const allItems = await db
        .select()
        .from(balanceItem)
        .where(inArray(balanceItem.balanceId, balanceIds));

    // Build a map of balanceId → totalSpent (in cents, integer math)
    const spentByBalance = new Map();
    for (const item of allItems) {
        const discounted = Math.round(item.amount * (100 - item.discountPct) / 100); // integer cents
        spentByBalance.set(item.balanceId, (spentByBalance.get(item.balanceId) ?? 0) + discounted);
    }

    const result = balances.map(b => ({
        id: b.id,
        shortId: b.shortId,
        label: b.label,
        initialAmount: b.initialAmount,
        paymentDate: b.paymentDate,
        paymentMethod: b.paymentMethod,
        expiresAt: b.expiresAt,
        createdAt: b.createdAt,
        totalSpent: spentByBalance.get(b.id) ?? 0
    }));

    return { balances: result };
}
