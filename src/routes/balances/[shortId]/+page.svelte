<script>
    import PinInput from '$lib/components/PinInput.svelte';
    import Receipt from '$lib/components/Receipt.svelte';

    let { data, form } = $props();
</script>

{#if form?.success}
    <div class="balance-page">
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
</style>
