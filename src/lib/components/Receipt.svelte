<script>
    let { balance, items } = $props();

    function displayPrice(cents, discountPct = 0) {
        const discounted = cents * (1 - discountPct / 100);
        return (discounted / 100).toFixed(2);
    }

    function displayCents(cents) {
        return (cents / 100).toFixed(2);
    }

    function isFree(cents, discountPct = 0) {
        return cents === 0 || discountPct === 100 || cents * (1 - discountPct / 100) === 0;
    }

    let totalSpent = $derived(items.reduce((sum, item) => {
        return sum + item.amount * (1 - item.discountPct / 100);
    }, 0));

    let remaining = $derived(balance.initialAmount - totalSpent);

    function formatDate(d) {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    let pdfLoading = $state(false);

    async function downloadPdf() {
        pdfLoading = true;
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ]);
            const el = document.querySelector('[data-pdf]');
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0a0a0a' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`receipt-${balance.shortId}.pdf`);
        } catch (e) {
            console.error('PDF generation failed:', e);
        } finally {
            pdfLoading = false;
        }
    }
</script>

<div class="receipt" data-pdf>
    <div class="receipt-header">
        <h2 class="receipt-title">&#x1F9FE; Digital Receipt</h2>
    </div>

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
            <span class="meta-value">{displayCents(balance.initialAmount)} RON</span>
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
                        <span class="item-title">
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
                            <span class="price-original">{displayCents(item.amount)}</span>
                            <span class="price-discounted">{displayPrice(item.amount, item.discountPct)}</span>
                            <span class="discount-badge">-{item.discountPct}%</span>
                        {:else}
                            <span class="price-normal">{displayPrice(item.amount)}</span>
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
            <span>{displayCents(totalSpent)} RON</span>
        </div>
        <div class="total-row remaining">
            <span>Remaining</span>
            <span>{displayCents(remaining)} RON</span>
        </div>
    </div>

    {#if balance.expiresAt}
        <div class="receipt-expiry" class:expired={new Date(balance.expiresAt) < new Date()}>
            {new Date(balance.expiresAt) < new Date() ? 'Expired:' : 'Expires:'} {formatDate(balance.expiresAt)}
        </div>
    {/if}
</div>

<div class="pdf-button-wrapper no-pdf">
    <button class="pdf-button" onclick={downloadPdf} disabled={pdfLoading}>
        {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
    </button>
</div>

<style>
    .receipt {
        max-width: 480px;
        margin: 0 auto;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1rem;
    }
    .receipt-header {
        text-align: center;
        margin-bottom: 1.5rem;
    }
    .receipt-title {
        font-size: 1.3rem;
        font-weight: 600;
        margin: 0;
    }
    .receipt-meta {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .meta-row {
        display: flex;
        justify-content: space-between;
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
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.5);
        margin: 0 0 0.8rem;
    }
    .items-empty {
        color: rgba(255, 255, 255, 0.35);
        font-style: italic;
        margin: 0;
    }
    .item-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 0.6rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .item-row:last-child {
        border-bottom: none;
    }
    .item-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }
    .item-title {
        font-weight: 500;
    }
    .item-title a {
        color: #60a5fa;
        text-decoration: none;
    }
    .item-title a:hover {
        text-decoration: underline;
    }
    .item-type {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.45);
    }
    .item-price {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-shrink: 0;
    }
    .price-normal {
        font-weight: 600;
    }
    .price-free {
        font-weight: 700;
        color: #4ade80;
        font-size: 0.9rem;
    }
    .price-original {
        text-decoration: line-through;
        color: rgba(255, 255, 255, 0.35);
        font-size: 0.85rem;
    }
    .price-discounted {
        font-weight: 600;
    }
    .discount-badge {
        font-size: 0.75rem;
        background: rgba(74, 222, 128, 0.15);
        color: #4ade80;
        padding: 0.1rem 0.4rem;
        border-radius: 0.25rem;
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
        font-size: 1.1rem;
    }
    .receipt-expiry {
        text-align: center;
        margin-top: 1rem;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.45);
    }
    .receipt-expiry.expired {
        color: #f87171;
        font-weight: 600;
    }
    .pdf-button-wrapper {
        max-width: 480px;
        margin: 1.5rem auto 0;
        text-align: center;
    }
    .pdf-button {
        padding: 0.6rem 1.5rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.5rem;
        color: #fff;
        font-size: 0.9rem;
        cursor: pointer;
    }
    .pdf-button:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.14);
    }
    .pdf-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
