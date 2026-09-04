<script>
    let { balance, items } = $props();

    function displayPrice(cents, discountPct = 0) {
        const discounted = Math.round(cents * (100 - discountPct) / 100);
        return (discounted / 100).toFixed(2);
    }

    function displayCents(cents) {
        return (cents / 100).toFixed(2);
    }

    function isFree(cents, discountPct = 0) {
        return cents === 0 || discountPct === 100 || Math.round(cents * (100 - discountPct) / 100) === 0;
    }

    // Group into main services with their sub-services nested underneath.
    // Items arrive ordered (sort_order, created_at), so group order is preserved.
    let groups = $derived.by(() => {
        const byParent = new Map();
        for (const item of items) {
            const key = item.parentId ?? '__root__';
            if (!byParent.has(key)) byParent.set(key, []);
            byParent.get(key).push(item);
        }
        return (byParent.get('__root__') ?? []).map(item => ({
            item,
            children: byParent.get(item.id) ?? []
        }));
    });

    let totalSpent = $derived(items.reduce((sum, item) => {
        return sum + Math.round(item.amount * (100 - item.discountPct) / 100);
    }, 0));

    let remaining = $derived(balance.initialAmount - totalSpent);

    function formatDate(d) {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
</script>

<div class="receipt">
    <div class="receipt-meta">
        <div class="meta-row">
            <span class="meta-label">Payment date</span>
            <span class="meta-value">{formatDate(balance.paymentDate)}</span>
        </div>
        <div class="meta-row">
            <span class="meta-label">Payment method</span>
            <span class="meta-value">{balance.paymentMethod}</span>
        </div>
        <div class="meta-row">
            <span class="meta-label">Initial amount</span>
            <span class="meta-value">${displayCents(balance.initialAmount)}</span>
        </div>
    </div>

    <hr class="receipt-divider" />

    <div class="receipt-items">
        <h3 class="items-heading">Items</h3>
        {#if items.length === 0}
            <p class="items-empty">No items yet.</p>
        {:else}
            {#each groups as group}
                <div class="receipt-group">
                    <div class="item-row" class:has-subs={group.children.length > 0}>
                        <div class="item-info">
                            <span class="item-title" title={group.item.title}>
                                {#if group.item.url}
                                    <a href={group.item.url} target="_blank" rel="noopener noreferrer">{group.item.title}</a>
                                {:else}
                                    {group.item.title}
                                {/if}
                            </span>
                            <span class="item-type">{group.item.type}</span>
                        </div>
                        <div class="item-price">
                            {#if isFree(group.item.amount, group.item.discountPct)}
                                <span class="price-free">FREE</span>
                            {:else if group.item.discountPct > 0}
                                <span class="price-original">${displayCents(group.item.amount)}</span>
                                <span class="price-discounted">${displayPrice(group.item.amount, group.item.discountPct)}</span>
                                <span class="discount-badge">-{group.item.discountPct}%</span>
                            {:else}
                                <span class="price-normal">${displayPrice(group.item.amount)}</span>
                            {/if}
                        </div>
                    </div>
                    {#each group.children as sub}
                        <div class="item-row sub-row">
                            <span class="sub-type" title={sub.title}>{sub.title}</span>
                            <div class="item-price sub-price">
                                {#if isFree(sub.amount, sub.discountPct)}
                                    <span class="price-free">FREE</span>
                                {:else if sub.discountPct > 0}
                                    <span class="price-original">${displayCents(sub.amount)}</span>
                                    <span class="price-discounted">${displayPrice(sub.amount, sub.discountPct)}</span>
                                    <span class="discount-badge">-{sub.discountPct}%</span>
                                {:else}
                                    <span class="price-normal sub-price-normal">${displayPrice(sub.amount)}</span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/each}
        {/if}
    </div>

    <hr class="receipt-divider" />

    <div class="receipt-totals">
        <div class="total-row">
            <span>Total spent</span>
            <span>${displayCents(totalSpent)}</span>
        </div>
        <div class="total-row remaining">
            <span>Remaining</span>
            <span>${displayCents(remaining)}</span>
        </div>
    </div>

    {#if balance.expiresAt}
        <div class="receipt-expiry" class:expired={new Date(balance.expiresAt) < new Date()}>
            {new Date(balance.expiresAt) < new Date() ? 'Expired:' : 'Expires:'} {formatDate(balance.expiresAt)}
        </div>
    {/if}
</div>

<style>
    .receipt {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1rem;
        color: rgba(255, 255, 255, 0.85);
        box-sizing: border-box;
        overflow-wrap: break-word;
        overflow-x: hidden;
    }
    .receipt-meta {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .meta-row {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.25rem;
    }
    .meta-label {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.9rem;
    }
    .meta-value {
        font-weight: 500;
    }
    .receipt-divider {
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin: 1.2rem 0;
    }
    .items-heading {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(255, 255, 255, 0.4);
        margin: 0 0 0.8rem;
    }
    .items-empty {
        color: rgba(255, 255, 255, 0.35);
        font-style: italic;
        margin: 0;
        font-size: 0.9rem;
    }
    .receipt-group {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .receipt-group:last-child {
        border-bottom: none;
    }
    .item-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 0.6rem 0;
        gap: 1rem;
    }
    .item-row.has-subs {
        padding-bottom: 0.3rem;
    }
    /* Sub-services: a single subtle line — type on the left, price on the right.
       No indentation, no rail, no title/url. */
    .item-row.sub-row {
        padding: 0.2rem 0 0.45rem;
        gap: 0.75rem;
        align-items: center;
    }
    .sub-type {
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.42);
        min-width: 0;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .sub-price {
        font-size: 0.82rem;
    }
    .sub-price-normal {
        font-weight: 500;
        color: rgba(255, 255, 255, 0.55);
    }
    .item-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
        flex: 1;
        overflow: hidden;
    }
    .item-title {
        display: block;
        width: 100%;
        font-weight: 500;
        font-size: 0.95rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .item-title a {
        color: #60a5fa;
        text-decoration: none;
    }
    .item-title a:hover {
        text-decoration: underline;
    }
    .item-title:has(a) {
        color: #60a5fa;
    }
    .item-type {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.4);
    }
    .item-price {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-shrink: 0;
        font-size: 0.95rem;
    }
    .price-normal {
        font-weight: 600;
    }
    .price-free {
        font-weight: 700;
        color: #4ade80;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    .price-original {
        text-decoration: line-through;
        color: rgba(255, 255, 255, 0.3);
        font-size: 0.85rem;
    }
    .price-discounted {
        font-weight: 600;
    }
    .discount-badge {
        font-size: 0.72rem;
        background: rgba(74, 222, 128, 0.15);
        color: #4ade80;
        padding: 0.1rem 0.4rem;
        border-radius: 0.25rem;
        font-weight: 600;
    }
    .receipt-totals {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 1rem;
    }
    .total-row.remaining {
        font-weight: 700;
        font-size: 1.15rem;
    }
    .receipt-expiry {
        text-align: center;
        margin-top: 1rem;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.4);
    }
    .receipt-expiry.expired {
        color: #f87171;
        font-weight: 600;
    }

    @media (max-width: 480px) {
        .receipt {
            padding: 1rem;
            border-radius: 0.75rem;
        }
        .item-row {
            flex-direction: column;
            align-items: stretch;
            gap: 0.25rem;
        }
        /* Sub-services stay on one line: title left, price right, price aligned with the title */
        .item-row.sub-row {
            flex-direction: row;
            align-items: center;
            gap: 0.75rem;
        }
        .item-info {
            flex: none;
        }
        .item-title {
            font-size: 0.9rem;
        }
    }
</style>
