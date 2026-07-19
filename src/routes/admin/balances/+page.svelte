<script>
    let { data } = $props();

    function displayCents(cents) {
        return (cents / 100).toFixed(2);
    }

    function isExpired(b) {
        return b.expiresAt && new Date(b.expiresAt) < new Date();
    }
</script>

<svelte:head>
    <title>Balances — Admin</title>
</svelte:head>

<div class="balances-page">
    <div class="page-header">
        <h1>Balances</h1>
        <a href="/admin/balances/new" class="btn-cta">+ New Balance</a>
    </div>

    {#if data.balances.length === 0}
        <div class="empty-state">
            <p>No balances yet. Create your first one.</p>
        </div>
    {:else}
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Label</th>
                        <th>Payment Date</th>
                        <th>Initial</th>
                        <th>Spent</th>
                        <th>Remaining</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.balances as b}
                        {@const remaining = b.initialAmount - b.totalSpent}
                        <tr class="clickable" onclick={() => window.location = `/admin/balances/${b.id}`}>
                            <td class="cell-label">{b.label || '—'}</td>
                            <td>{new Date(b.paymentDate).toLocaleDateString('en-GB')}</td>
                            <td>{displayCents(b.initialAmount)} RON</td>
                            <td>{displayCents(b.totalSpent)} RON</td>
                            <td class:negative={remaining < 0}>{displayCents(remaining)} RON</td>
                            <td>
                                {#if isExpired(b)}
                                    <span class="status-badge expired">Expired</span>
                                {:else}
                                    <span class="status-badge active">Active</span>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .balances-page {
        padding: 2rem;
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
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: rgba(255, 255, 255, 0.4);
    }
    .table-wrap {
        overflow-x: auto;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th {
        text-align: left;
        padding: 0.75rem 1rem;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.5);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    td {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
    }
    tr.clickable {
        cursor: pointer;
        transition: background 0.15s;
    }
    tr.clickable:hover {
        background: rgba(255, 255, 255, 0.04);
    }
    .cell-label {
        font-weight: 500;
    }
    .negative {
        color: #f87171;
    }
    .status-badge {
        font-size: 0.75rem;
        padding: 0.15rem 0.5rem;
        border-radius: 0.25rem;
    }
    .status-badge.active {
        background: rgba(74, 222, 128, 0.15);
        color: #4ade80;
    }
    .status-badge.expired {
        background: rgba(248, 113, 113, 0.15);
        color: #f87171;
    }
</style>
