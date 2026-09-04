<script>
    import PinInput from '$lib/components/PinInput.svelte';
    import Receipt from '$lib/components/Receipt.svelte';

    let { data, form } = $props();

    function formatDate(d) {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
</script>

{#if form?.success}
    <div class="balance-page">
        {#if form.previousBalances?.length}
            <div class="prev-balances">
                <span class="prev-label">Previous balances:</span>
                <div class="prev-links">
                    {#each form.previousBalances as pb}
                        <a href={`/balances/${pb.shortId}`} class="prev-link" title={pb.label || 'Previous balance'}>
                            {pb.label || 'Balance'} · {formatDate(pb.paymentDate)}
                        </a>
                    {/each}
                </div>
            </div>
        {/if}
        <Receipt balance={form.balance} items={form.items} />
    </div>
{:else}
    <div class="pin-page">
        <PinInput error={form?.error} />
    </div>
{/if}

<style>
    .balance-page {
        width: 100%;
        max-width: 640px;
        margin: 1.5rem auto;
        padding: 0 1rem;
        box-sizing: border-box;
        overflow-x: hidden;
    }
    .pin-page {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 4rem 1rem;
    }
    .prev-balances {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding: 0.6rem 1rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.75rem;
        font-size: 0.85rem;
    }
    .prev-label {
        color: rgba(255, 255, 255, 0.5);
        font-weight: 500;
        white-space: nowrap;
    }
    .prev-links {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1rem;
    }
    .prev-link {
        color: #60a5fa;
        text-decoration: none;
        white-space: nowrap;
    }
    .prev-link:hover {
        text-decoration: underline;
    }
</style>
