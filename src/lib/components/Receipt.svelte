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
            {#each items as item}
                <div class="item-row">
                    <div class="item-info">
                        <span class="item-title" title={item.title}>
                            {#if item.url}
                                <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                            {:else}
                                {item.title}
                            {/if}
                        </span>
                        <span class="item-type">{item.type}</span>
                    </div>
                    <div class="item-price">
                        {#if isFree(item.amount, item.discountPct)}
                            <span class="price-free">FREE</span>
                        {:else if item.discountPct > 0}
                            <span class="price-original">${displayCents(item.amount)}</span>
                            <span class="price-discounted">${displayPrice(item.amount, item.discountPct)}</span>
                            <span class="discount-badge">-{item.discountPct}%</span>
                        {:else}
                            <span class="price-normal">${displayPrice(item.amount)}</span>
                        {/if}
                    </div>
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
    .item-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 0.6rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        gap: 1rem;
    }
    .item-row:last-child {
        border-bottom: none;
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
        .item-info {
            flex: none;
        }
        .item-title {
            font-size: 0.9rem;
        }
    }
</style>
