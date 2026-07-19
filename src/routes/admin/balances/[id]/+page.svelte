<script>
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import Receipt from '$lib/components/Receipt.svelte';

    let { data, form } = $props();

    let balance = $derived(data.balance);
    let items = $derived(data.items);

    // Update local state when form returns success
    $effect(() => {
        if (form?.success) {
            invalidateAll();
        }
    });

    function displayCents(cents) {
        return (cents / 100).toFixed(2);
    }

    let showAddItem = $state(false);
    let editingItem = $state(null);

    let confirmDelete = $state(false);
    let deleteItemTarget = $state(null);
    let dragItem = $state(null);

    function dragStart(e, item) {
        dragItem = item;
        e.dataTransfer.effectAllowed = 'move';
    }
    function dragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    async function drop(e, targetItem) {
        e.preventDefault();
        if (!dragItem || dragItem.id === targetItem.id) return;
        const reordered = [...items];
        const fromIdx = reordered.findIndex(i => i.id === dragItem.id);
        const toIdx = reordered.findIndex(i => i.id === targetItem.id);
        reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, dragItem);
        const order = reordered.map((item, idx) => ({ id: item.id, sortOrder: idx }));
        const formData = new FormData();
        formData.set('order', JSON.stringify(order));
        await fetch('?/reorderItems', { method: 'POST', body: formData });
        invalidateAll();
    }

    let copied = $state(false);

    async function copyLink() {
        const url = `${window.location.origin}/balances/${balance.shortId}`;
        await navigator.clipboard.writeText(url);
        copied = true;
        setTimeout(() => copied = false, 2000);
    }
</script>

<svelte:head>
    <title>{balance.label || 'Balance'} — Admin</title>
</svelte:head>

<div class="edit-balance-page">
    <div class="page-header">
        <h1>{balance.label || 'Balance'}</h1>
        <div class="header-actions">
            <span class="short-id">/balances/{balance.shortId}</span>
            <button class="btn-sm copy-btn" onclick={copyLink}>
                {copied ? 'Copied!' : 'Copy link'}
            </button>
            <a href="/admin/balances" class="back-link">← Back</a>
        </div>
    </div>

    <div class="layout">
        <!-- Left: Edit Forms -->
        <div class="edit-panel">
            <!-- Balance Details -->
            <div class="section">
                <h2>Balance Details</h2>
                {#if form?.error}
                    <p class="form-error">{form.error}</p>
                {/if}
                <form method="POST" action="?/updateBalance" use:enhance>
                    <div class="form-grid">
                        <label>
                            <span>Label</span>
                            <input type="text" name="label" value={balance.label ?? ''} />
                        </label>
                        <label>
                            <span>Initial Amount ($)</span>
                            <input type="number" name="initialAmount" value={balance.initialAmount / 100} step="0.01" min="0" required />
                        </label>
                        <label>
                            <span>Payment Date</span>
                            <input type="date" name="paymentDate" value={new Date(balance.paymentDate).toISOString().slice(0, 10)} required />
                        </label>
                        <label>
                            <span>Payment Method</span>
                            <input type="text" name="paymentMethod" value={balance.paymentMethod} required />
                        </label>
                        <label>
                            <span>New PIN (leave blank to keep)</span>
                            <input type="text" name="newPin" maxlength="4" placeholder="1234" autocomplete="off" inputmode="numeric" style="letter-spacing:0.3em" />
                        </label>
                        <label>
                            <span>Expiry Date</span>
                            <input type="date" name="expiresAt" value={balance.expiresAt ? new Date(balance.expiresAt).toISOString().slice(0, 10) : ''} />
                        </label>
                    </div>
                    <div class="section-actions">
                        <button type="submit" class="btn-cta">Save Changes</button>
                        <button type="button" class="btn-danger" onclick={() => confirmDelete = true}>Delete Balance</button>
                    </div>
                </form>
            </div>

            <!-- Delete Confirmation -->
            {#if confirmDelete}
                <div class="section danger-zone">
                    <h2>Delete Balance?</h2>
                    <p>This will permanently delete this balance and all its items. This cannot be undone.</p>
                    <form method="POST" action="?/deleteBalance" use:enhance>
                        <div class="section-actions">
                            <button type="submit" class="btn-danger">Yes, Delete</button>
                            <button type="button" class="btn-secondary" onclick={() => confirmDelete = false}>Cancel</button>
                        </div>
                    </form>
                </div>
            {/if}

            <!-- Items -->
            <div class="section">
                <div class="section-header">
                    <h2>Items</h2>
                    <button class="btn-cta" onclick={() => { showAddItem = true; editingItem = null; }}>+ Add Item</button>
                </div>

                {#if form?.itemError}
                    <p class="form-error">{form.itemError}</p>
                {/if}

                {#if showAddItem || editingItem}
                    <div class="item-form">
                        <h3>{editingItem ? 'Edit Item' : 'Add Item'}</h3>
                        <form method="POST" action={editingItem ? '?/updateItem' : '?/addItem'} use:enhance>
                            {#if editingItem}
                                <input type="hidden" name="itemId" value={editingItem.id} />
                            {/if}
                            <div class="form-grid">
                                <label>
                                    <span>Title</span>
                                    <input type="text" name="title" value={editingItem?.title ?? ''} required />
                                </label>
                                <label>
                                    <span>Type</span>
                                    <input type="text" name="type" value={editingItem?.type ?? ''} required placeholder="Video editing, Thumbnail..." />
                                </label>
                                <label>
                                    <span>Amount ($)</span>
                                    <input type="number" name="amount" value={editingItem ? editingItem.amount / 100 : ''} step="0.01" min="0" required />
                                </label>
                                <label>
                                    <span>Discount %</span>
                                    <input type="number" name="discountPct" value={editingItem?.discountPct ?? 0} min="0" max="100" />
                                </label>
                                <label style="grid-column: span 2;">
                                    <span>URL (optional)</span>
                                    <input type="url" name="url" value={editingItem?.url ?? ''} placeholder="https://..." />
                                </label>
                            </div>
                            <div class="section-actions">
                                <button type="submit" class="btn-cta">{editingItem ? 'Save' : 'Add Item'}</button>
                                <button type="button" class="btn-secondary" onclick={() => { showAddItem = false; editingItem = null; }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                {/if}

                {#if items.length === 0}
                    <p class="empty-text">No items yet.</p>
                {:else}
                    <div class="items-table">
                        {#each items as item (item.id)}
                            <div class="item-row" ondragover={dragOver} ondrop={(e) => drop(e, item)}>
                                <span class="drag-handle" draggable="true" ondragstart={(e) => dragStart(e, item)} title="Drag to reorder">≡</span>
                                <div class="item-info">
                                    <span class="item-title">{item.title}</span>
                                    <span class="item-meta">{item.type} · ${displayCents(item.amount)}{#if item.discountPct > 0} · -{item.discountPct}%{/if}</span>
                                </div>
                                <div class="item-actions">
                                    <button class="btn-sm" onclick={() => { editingItem = item; showAddItem = false; }}>Edit</button>
                                    <button class="btn-sm danger" onclick={() => { deleteItemTarget = item; }}>Remove</button>
                                </div>
                            </div>
                        {/each}
                    </div>

                    {#if deleteItemTarget}
                        <div class="confirm-overlay">
                            <div class="confirm-box">
                                <p>Permanently delete this item?</p>
                                <p class="confirm-item-name">"{deleteItemTarget.title}"</p>
                                <form method="POST" action="?/deleteItem" use:enhance>
                                    <input type="hidden" name="itemId" value={deleteItemTarget.id} />
                                    <input type="hidden" name="mode" value="delete" />
                                    <div class="section-actions">
                                        <button type="submit" class="btn-danger">Yes, Delete</button>
                                        <button type="button" class="btn-secondary" onclick={() => deleteItemTarget = null}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>

        <!-- Right: Live Receipt Preview -->
        <div class="preview-panel">
            <h3 class="preview-heading">Receipt Preview</h3>
            <Receipt balance={balance} items={items} />
        </div>
    </div>
</div>

<style>
    .edit-balance-page {
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
    .header-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .short-id {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.4);
        font-family: monospace;
    }
    .back-link {
        color: rgba(255, 255, 255, 0.6);
        text-decoration: none;
        font-size: 0.9rem;
    }
    .layout {
        display: grid;
        grid-template-columns: 1fr 420px;
        gap: 2rem;
        align-items: start;
    }
    @media (max-width: 1000px) {
        .layout {
            grid-template-columns: 1fr;
        }
    }
    .section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }
    .section h2 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 1rem;
    }
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .section-header h2 {
        margin: 0;
    }
    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }
    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    label span {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.55);
    }
    input {
        padding: 0.5rem 0.7rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.35rem;
        color: #fff;
        font-size: 0.9rem;
    }
    input:focus {
        border-color: rgba(255, 255, 255, 0.3);
        outline: none;
    }
    input[type="date"]::-webkit-calendar-picker-indicator,
    input[type="date"]::-webkit-inner-spin-button {
        display: none;
        -webkit-appearance: none;
    }
    input[type="date"] {
        -moz-appearance: textfield;
    }
    .form-error {
        background: rgba(248, 113, 113, 0.1);
        border: 1px solid rgba(248, 113, 113, 0.3);
        color: #f87171;
        padding: 0.5rem 0.8rem;
        border-radius: 0.4rem;
        margin-bottom: 0.8rem;
        font-size: 0.85rem;
    }
    .section-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
    }
    .btn-danger {
        padding: 0.5rem 1rem;
        background: rgba(248, 113, 113, 0.15);
        border: 1px solid rgba(248, 113, 113, 0.3);
        border-radius: 0.4rem;
        color: #f87171;
        font-size: 0.85rem;
        cursor: pointer;
    }
    .btn-danger:hover {
        background: rgba(248, 113, 113, 0.25);
    }
    .btn-secondary {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.4rem;
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.85rem;
        cursor: pointer;
    }
    .btn-sm {
        padding: 0.25rem 0.6rem;
        font-size: 0.8rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.3rem;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
    }
    .btn-sm:hover {
        background: rgba(255, 255, 255, 0.12);
    }
    .btn-sm.danger {
        color: #f87171;
        border-color: rgba(248, 113, 113, 0.3);
    }
    .copy-btn {
        font-family: inherit;
        white-space: nowrap;
    }
    .danger-zone {
        border-color: rgba(248, 113, 113, 0.25);
    }
    .danger-zone h2 {
        color: #f87171;
    }
    .danger-zone p {
        color: rgba(255, 255, 255, 0.55);
        font-size: 0.9rem;
        margin: 0 0 0.75rem;
    }
    .item-form {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1rem;
    }
    .item-form h3 {
        font-size: 0.95rem;
        font-weight: 600;
        margin: 0 0 0.75rem;
    }
    .items-table {
        display: flex;
        flex-direction: column;
    }
    .item-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .drag-handle {
        cursor: grab;
        color: rgba(255, 255, 255, 0.25);
        font-size: 1.2rem;
        user-select: none;
        flex-shrink: 0;
        padding: 0 0.25rem;
        transition: color 0.15s;
    }
    .drag-handle:hover {
        color: rgba(255, 255, 255, 0.5);
    }
    .drag-handle:active {
        cursor: grabbing;
    }
    .item-row:last-child {
        border-bottom: none;
    }
    .item-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }
    .item-title {
        font-weight: 500;
        font-size: 0.9rem;
    }
    .item-meta {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.4);
    }
    .item-actions {
        display: flex;
        gap: 0.3rem;
    }
    .empty-text {
        color: rgba(255, 255, 255, 0.35);
        font-style: italic;
        font-size: 0.9rem;
        margin: 0;
    }
    .confirm-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
    }
    .confirm-box {
        background: #1a1a1a;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.75rem;
        padding: 1.5rem;
        max-width: 360px;
        width: 100%;
    }
    .confirm-box p {
        margin: 0 0 0.3rem;
    }
    .confirm-item-name {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 1rem !important;
    }
    .preview-panel {
        position: sticky;
        top: 1rem;
        padding-right: 1rem;
    }
    .preview-heading {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.4);
        margin: 0 0 0.75rem;
    }
</style>
