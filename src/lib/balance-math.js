// Balance money math, shared by the server (ledger) and the receipt (live
// preview). All amounts are integer cents.

/** What an item costs after its discount, in cents. */
export function itemCost(item) {
    return Math.round((item.amount * (100 - (item.discountPct ?? 0))) / 100);
}

/** Total spent across items (main services and sub-services alike). */
export function totalSpent(items) {
    return items.reduce((sum, item) => sum + itemCost(item), 0);
}

/** "$1,234.50" / "−$180.00" (true minus sign). */
export function money(cents, { sign = false } = {}) {
    const abs = Math.abs(cents) / 100;
    const str = '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (cents < 0) return '−' + str;
    if (sign && cents > 0) return '+' + str;
    return str;
}

/**
 * Work out every balance's numbers, including carry-over.
 *
 * When balance P is linked as a previous balance of N, whatever P has left
 * (positive or negative) moves into N, and P itself ends at zero. This is
 * computed on the fly every time, so editing P later always flows through
 * to N (and on down the chain).
 *
 * A balance carries into one successor only: if legacy data links it to
 * several, the earliest link wins and the others are plain links.
 * Cycles are ignored (they can't be created through the admin UI).
 *
 * @param {Array<{id, shortId, label, paymentDate, initialAmount}>} balances
 * @param {Array<{balanceId, amount, discountPct}>} items
 * @param {Array<{balanceId, previousId, position, createdAt}>} links
 * @returns {Map<string, Ledger>}
 *
 * @typedef {object} Ledger
 * @property {number} initial
 * @property {number} spent
 * @property {number} carryIn       sum of what previous balances carried in
 * @property {Array<{id, shortId, label, paymentDate, amount}>} carriedFrom
 * @property {number} remaining     initial + carryIn − spent (before carrying out)
 * @property {{id, shortId, label, paymentDate} | null} carriedTo
 * @property {number} balance       what's left on this balance (0 once carried on)
 */
export function buildLedger(balances, items, links) {
    const byId = new Map(balances.map((b) => [b.id, b]));
    const spent = new Map();
    for (const it of items) spent.set(it.balanceId, (spent.get(it.balanceId) ?? 0) + itemCost(it));

    // previousId → the one balance it carries into (earliest link wins)
    const sorted = [...links].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.position - b.position
    );
    const carryTarget = new Map();
    for (const l of sorted) {
        if (!byId.has(l.balanceId) || !byId.has(l.previousId)) continue;
        if (!carryTarget.has(l.previousId)) carryTarget.set(l.previousId, l.balanceId);
    }
    // balanceId → previous ids that carry into it, in link order
    const sources = new Map();
    for (const l of [...links].sort((a, b) => a.position - b.position)) {
        if (carryTarget.get(l.previousId) !== l.balanceId) continue;
        if (!sources.has(l.balanceId)) sources.set(l.balanceId, []);
        sources.get(l.balanceId).push(l.previousId);
    }

    const remaining = new Map();
    const visiting = new Set();
    function remainingOf(id) {
        if (remaining.has(id)) return remaining.get(id);
        if (visiting.has(id)) return 0; // cycle guard
        visiting.add(id);
        const b = byId.get(id);
        let carry = 0;
        for (const p of sources.get(id) ?? []) carry += remainingOf(p);
        const r = b.initialAmount + carry - (spent.get(id) ?? 0);
        visiting.delete(id);
        remaining.set(id, r);
        return r;
    }

    const pick = (b) => ({ id: b.id, shortId: b.shortId, label: b.label, paymentDate: b.paymentDate });
    const out = new Map();
    for (const b of balances) {
        const carriedFrom = (sources.get(b.id) ?? []).map((p) => ({ ...pick(byId.get(p)), amount: remainingOf(p) }));
        const target = carryTarget.get(b.id);
        const r = remainingOf(b.id);
        out.set(b.id, {
            initial: b.initialAmount,
            spent: spent.get(b.id) ?? 0,
            carryIn: carriedFrom.reduce((s, c) => s + c.amount, 0),
            carriedFrom,
            remaining: r,
            carriedTo: target ? pick(byId.get(target)) : null,
            balance: target ? 0 : r
        });
    }
    return out;
}

/**
 * Would linking `previousId` as a previous balance of `balanceId` create a
 * loop? True when balanceId already sits somewhere before previousId.
 */
export function wouldCycle(links, balanceId, previousId) {
    if (balanceId === previousId) return true;
    const prevsOf = new Map();
    for (const l of links) {
        if (!prevsOf.has(l.balanceId)) prevsOf.set(l.balanceId, []);
        prevsOf.get(l.balanceId).push(l.previousId);
    }
    const stack = [previousId];
    const seen = new Set();
    while (stack.length) {
        const id = stack.pop();
        if (id === balanceId) return true;
        if (seen.has(id)) continue;
        seen.add(id);
        stack.push(...(prevsOf.get(id) ?? []));
    }
    return false;
}
