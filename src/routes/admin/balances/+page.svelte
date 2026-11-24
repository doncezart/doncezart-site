<script>
    import { goto } from '$app/navigation';
    import { money } from '$lib/balance-math.js';

    let { data } = $props();

    const shortDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    function isExpired(b) {
        return b.expiresAt && new Date(b.expiresAt) < new Date();
    }
</script>

<svelte:head>
    <title>Balances | Admin</title>
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
                        <th>Carried in</th>
                        <th>Spent</th>
                        <th>Remaining</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.balances as b}
                        <tr class="clickable" onclick={() => goto(`/admin/balances/${b.id}`)}>
                            <td class="cell-label"><a href={`/admin/balances/${b.id}`}>{b.label || '–'}</a></td>
                            <td>{shortDate(b.paymentDate)}</td>
                            <td>{money(b.initial)}</td>
                            <td class="muted" class:negative={b.carryIn < 0} class:positive={b.carryIn > 0}>{b.carriedFrom.length ? money(b.carryIn, { sign: true }) : '–'}</td>
                            <td>{money(b.spent)}</td>
                            <td>
                                {#if b.carriedTo}
                                    <span class="carried" title="Remaining moved to the next balance">
                                        <span class:negative={b.remaining < 0}>{money(b.remaining)}</span>
                                        <i class="fa-solid fa-arrow-right"></i> {shortDate(b.carriedTo.paymentDate)}
                                    </span>
                                {:else}
                                    <strong class:negative={b.remaining < 0}>{money(b.remaining)}</strong>
                                {/if}
                            </td>
                            <td>
                                {#if b.carriedTo}
                                    <span class="status-badge closed">Carried over</span>
                                {:else if isExpired(b)}
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
        -webkit-overflow-scrolling: touch;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
    }
    table {
        width: 100%;
        min-width: 600px;
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
    .cell-label a {
        color: inherit;
        text-decoration: none;
    }
    .muted {
        color: rgba(255, 255, 255, 0.45);
    }
    .negative {
        color: #f87171;
    }
    .positive {
        color: #4ade80;
    }
    .carried {
        color: rgba(255, 255, 255, 0.45);
        white-space: nowrap;
        font-size: 0.85rem;
    }
    .carried i {
        font-size: 0.7rem;
        margin: 0 0.2rem;
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
    .status-badge.closed {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.55);
    }
    .status-badge.expired {
        background: rgba(248, 113, 113, 0.15);
        color: #f87171;
    }

    @media (max-width: 666px) {
        .balances-page {
            padding: 1rem;
        }
        .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
        }
        th, td {
            padding: 0.6rem 0.75rem;
            font-size: 0.8rem;
        }
    }
</style>
