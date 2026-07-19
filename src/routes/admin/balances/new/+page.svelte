<script>
    import { enhance } from '$app/forms';

    let { form } = $props();
</script>

<svelte:head>
    <title>New Balance — Admin</title>
</svelte:head>

<div class="new-balance-page">
    <div class="page-header">
        <h1>New Balance</h1>
        <a href="/admin/balances" class="back-link">← Back to Balances</a>
    </div>

    <div class="form-card">
        {#if form?.error}
            <p class="form-error">{form.error}</p>
        {/if}
        <form method="POST" use:enhance>
            <div class="form-grid">
                <label>
                    <span>Label (internal)</span>
                    <input type="text" name="label" value={form?.values?.label ?? ''} placeholder="e.g. Client name or project" />
                </label>
                <label>
                    <span>Initial Amount ($)</span>
                    <input type="number" name="initialAmount" value={form?.values?.initialAmount ?? ''} step="0.01" min="0" placeholder="500.00" required />
                </label>
                <label>
                    <span>Payment Date</span>
                    <input type="date" name="paymentDate" value={form?.values?.paymentDate ?? ''} required />
                </label>
                <label>
                    <span>Payment Method</span>
                    <input type="text" name="paymentMethod" value={form?.values?.paymentMethod ?? ''} placeholder="Bank transfer, Revolut..." required />
                </label>
                <label>
                    <span>PIN (4 digits)</span>
                    <input type="text" name="pin" maxlength="4" placeholder="1234" required autocomplete="off" inputmode="numeric" style="letter-spacing:0.3em" />
                </label>
                <label>
                    <span>Expiry Date (optional)</span>
                    <input type="date" name="expiresAt" value={form?.values?.expiresAt ?? ''} />
                </label>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-cta">Create Balance</button>
            </div>
        </form>
    </div>
</div>

<style>
    .new-balance-page {
        padding: 2rem;
        max-width: 600px;
    }
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    .page-header h1 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
    }
    .back-link {
        color: rgba(255, 255, 255, 0.6);
        text-decoration: none;
        font-size: 0.9rem;
    }
    .back-link:hover {
        color: #fff;
    }
    .form-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
        padding: 1.5rem;
    }
    .form-error {
        background: rgba(248, 113, 113, 0.1);
        border: 1px solid rgba(248, 113, 113, 0.3);
        color: #f87171;
        padding: 0.6rem 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
    label span {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
    }
    input {
        padding: 0.55rem 0.75rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.4rem;
        color: #fff;
        font-size: 0.9rem;
    }
    input:focus {
        border-color: rgba(255, 255, 255, 0.3);
        outline: none;
    }
    .form-actions {
        margin-top: 1.5rem;
    }
</style>
