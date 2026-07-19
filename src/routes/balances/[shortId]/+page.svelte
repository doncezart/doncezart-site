<script>
    import PinInput from '$lib/components/PinInput.svelte';
    import Receipt from '$lib/components/Receipt.svelte';

    let { data, form } = $props();
</script>

{#if data.authenticated}
    <div class="balance-page">
        <Receipt balance={data.balance} items={data.items} />
    </div>
{:else}
    <div class="pin-page">
        <div class="pin-card">
            <h1 class="pin-heading">Balance</h1>
            <PinInput error={form?.error} />
        </div>
    </div>
{/if}

<style>
    .balance-page {
        padding: 2rem 1rem;
        min-height: 60vh;
    }
    .pin-page {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 60vh;
        padding: 2rem 1rem;
    }
    .pin-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1rem;
        width: 100%;
        max-width: 400px;
    }
    .pin-heading {
        text-align: center;
        font-size: 1.2rem;
        font-weight: 600;
        padding-top: 1.5rem;
        margin: 0;
    }
</style>
