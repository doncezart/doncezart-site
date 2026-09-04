<script>
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import Receipt from '$lib/components/Receipt.svelte';

    let { data, form } = $props();

    let balance = $derived(data.balance);
    let items = $derived(data.items);
    let previousBalances = $derived(data.previousBalances ?? []);
    let linkableBalances = $derived(data.linkableBalances ?? []);

    function formatShortDate(d) {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ── Item grouping ─────────────────────────────────────
    // Items arrive flat (sorted by sort_order, created_at). Group them into
    // main services with their sub-services nested underneath.
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

    function displayCents(cents) {
        return (cents / 100).toFixed(2);
    }

    // ── Item form state ───────────────────────────────────
    // One form, three modes: add (top-level), addSub (under a parent), edit (by id).
    // We track the id, not the object, so after a reload/reorder the form always
    // resolves against the freshest item — never a stale one ("edits wrong item" bug).
    let itemForm = $state(null); // null | { type: 'add' } | { type: 'addSub', parentId } | { type: 'edit', id }

    let editingItem = $derived(
        itemForm?.type === 'edit' ? items.find(i => i.id === itemForm.id) ?? null : null
    );

    function openAdd() { itemForm = { type: 'add' }; }
    function openAddSub(parentId) { itemForm = { type: 'addSub', parentId }; }
    function openEdit(item) { itemForm = { type: 'edit', id: item.id }; }
    function closeItemForm() { itemForm = null; }

    // Clear the form and reload fresh data after a successful add/update.
    // On validation failure the form stays open so the error is visible.
    function resetItemFormOnSubmit() {
        return async ({ result, update }) => {
            if (result.type === 'success') itemForm = null;
            await update();
        };
    }

    let confirmDelete = $state(false);
    let deleteItemTarget = $state(null);

    // ── Reordering ────────────────────────────────────────
    // Pointer-based drag on the grip handles with live drop indicators,
    // plus up/down buttons for precise moves. Each scope is a sibling group:
    // 'root' for main services, or a parent item id for its sub-services.
    let drag = $state(null);      // { scope, id }
    let dragHover = $state(null); // { id, pos: 'before' | 'after' }
    let dragPointerId = $state(null);

    function scopeIds(scope) {
        if (scope === 'root') return groups.map(g => g.item.id);
        const group = groups.find(g => g.item.id === scope);
        return group ? group.children.map(c => c.id) : [];
    }

    function rowAt(scope, clientX, clientY) {
        const rows = document.querySelectorAll(`[data-drag-scope="${scope}"]`);
        for (const el of rows) {
            const r = el.getBoundingClientRect();
            if (clientY >= r.top && clientY <= r.bottom && clientX >= r.left && clientX <= r.right) {
                return {
                    id: el.getAttribute('data-drag-id'),
                    pos: clientY < r.top + r.height / 2 ? 'before' : 'after'
                };
            }
        }
        return null;
    }

    function onGripPointerDown(e, scope, item) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        drag = { scope, id: item.id };
        dragHover = null;
        dragPointerId = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function onGripPointerMove(e) {
        if (!drag || e.pointerId !== dragPointerId) return;
        dragHover = rowAt(drag.scope, e.clientX, e.clientY);
    }

    async function onGripPointerUp(e) {
        if (!drag || e.pointerId !== dragPointerId) return;
        const scope = drag.scope;
        const fromId = drag.id;
        const hit = dragHover;
        const ids = scopeIds(scope);
        const fromIdx = ids.indexOf(fromId);
        drag = null;
        dragHover = null;
        dragPointerId = null;
        if (fromIdx === -1) return;

        let toIdx = fromIdx;
        if (hit && hit.id !== fromId) {
            const atIdx = ids.indexOf(hit.id);
            let insertIdx = hit.pos === 'before' ? atIdx : atIdx + 1;
            if (insertIdx > fromIdx) insertIdx -= 1;
            toIdx = insertIdx;
        }
        if (toIdx === fromIdx) return;

        const newIds = [...ids];
        newIds.splice(fromIdx, 1);
        newIds.splice(toIdx, 0, fromId);
        await submitOrder(scope, newIds);
    }

    function onGripPointerCancel(e) {
        if (!drag || e.pointerId !== dragPointerId) return;
        drag = null;
        dragHover = null;
        dragPointerId = null;
    }

    async function submitOrder(scope, ids) {
        const order = ids.map((id, idx) => ({
            id,
            parentId: scope === 'root' ? '' : scope,
            sortOrder: idx
        }));
        const formData = new FormData();
        formData.set('order', JSON.stringify(order));
        const res = await fetch('?/reorderItems', { method: 'POST', body: formData });
        if (res.ok) invalidateAll();
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

            <!-- Previous Balances -->
            <div class="section">
                <h2>Previous Balances</h2>
                <p class="section-hint">Linked balances show as links at the top of the client's balance page.</p>

                {#if form?.previousError}
                    <p class="form-error">{form.previousError}</p>
                {/if}

                {#if previousBalances.length === 0}
                    <p class="empty-text">No previous balances linked yet.</p>
                {:else}
                    <div class="prev-list">
                        {#each previousBalances as pb}
                            <div class="prev-row">
                                <div class="prev-info">
                                    <span class="prev-name">{pb.label || 'Unlabeled balance'}</span>
                                    <span class="prev-meta">{formatShortDate(pb.paymentDate)} · <a href={`/balances/${pb.shortId}`} target="_blank" rel="noopener noreferrer" class="item-link">/balances/{pb.shortId}</a></span>
                                </div>
                                <form method="POST" action="?/unlinkPreviousBalance" use:enhance>
                                    <input type="hidden" name="previousId" value={pb.id} />
                                    <button class="btn-sm danger">Remove</button>
                                </form>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if linkableBalances.length > 0}
                    <form method="POST" action="?/linkPreviousBalance" use:enhance class="prev-link-form">
                        <div class="form-grid" style="grid-template-columns: 1fr auto;">
                            <label>
                                <span>Link a previous balance</span>
                                <select name="previousId">
                                    <option value="">— Select a balance —</option>
                                    {#each linkableBalances as lb}
                                        <option value={lb.id}>{lb.label || 'Unlabeled'} · {formatShortDate(lb.paymentDate)}</option>
                                    {/each}
                                </select>
                            </label>
                            <div class="section-actions" style="align-self: end;">
                                <button type="submit" class="btn-cta">Link</button>
                            </div>
                        </div>
                    </form>
                {/if}
            </div>

            <!-- Items -->
            <div class="section">
                <div class="section-header">
                    <h2>Services</h2>
                    <button class="btn-cta" onclick={openAdd}>+ Add Service</button>
                </div>

                {#if form?.itemError}
                    <p class="form-error">{form.itemError}</p>
                {/if}

                {#if groups.length === 0}
                    <p class="empty-text">No services yet.</p>
                {:else}
                    <div class="items-table">
                        {#each groups as group (group.item.id)}
                            <!-- Main service -->
                            <div class="item-group">
                                <div
                                    class="item-row main-row"
                                    data-drag-scope="root"
                                    data-drag-id={group.item.id}
                                    class:is-dragging={drag?.id === group.item.id}
                                    class:indicator-before={dragHover?.id === group.item.id && dragHover.pos === 'before'}
                                    class:indicator-after={dragHover?.id === group.item.id && dragHover.pos === 'after'}
                                >
                                    <span
                                        class="drag-handle"
                                        role="button"
                                        tabindex="0"
                                        aria-label="Drag to reorder"
                                        title="Drag to reorder"
                                        onpointerdown={(e) => onGripPointerDown(e, 'root', group.item)}
                                        onpointermove={onGripPointerMove}
                                        onpointerup={onGripPointerUp}
                                        onpointercancel={onGripPointerCancel}
                                    ><i class="fa-solid fa-grip-vertical"></i></span>
                                    <div class="item-info">
                                        <span class="item-title">{group.item.title}</span>
                                        <span class="item-meta">
                                            {group.item.type}
                                            {#if group.item.url} · <a href={group.item.url} target="_blank" rel="noopener noreferrer" class="item-link">link</a>{/if}
                                            · ${displayCents(group.item.amount)}{#if group.item.discountPct > 0} · -{group.item.discountPct}%{/if}
                                        </span>
                                    </div>
                                    <div class="item-actions">
                                        <button class="btn-sm" title="Add a sub-service under this one" onclick={() => openAddSub(group.item.id)}>+ Sub</button>
                                        <button class="btn-sm" onclick={() => openEdit(group.item)}>Edit</button>
                                        <button class="btn-sm danger" onclick={() => deleteItemTarget = group.item}>Remove</button>
                                    </div>
                                </div>

                                <!-- Inline form for a new sub-service of this group -->
                                {#if itemForm?.type === 'addSub' && itemForm.parentId === group.item.id}
                                    <div class="inline-form">
                                        <h4>Add sub-service under "{group.item.title}"</h4>
                                        <form method="POST" action="?/addItem" use:enhance={resetItemFormOnSubmit}>
                                            <input type="hidden" name="parentId" value={group.item.id} />
                                            <div class="form-grid">
                                                <label>
                                                    <span>Title</span>
                                                    <input type="text" name="title" required placeholder="e.g. 200k views bonus" />
                                                </label>
                                                <label>
                                                    <span>Amount ($)</span>
                                                    <input type="number" name="amount" step="0.01" min="0" required />
                                                </label>
                                            </div>
                                            <div class="section-actions">
                                                <button type="submit" class="btn-cta">Add Sub-Service</button>
                                                <button type="button" class="btn-secondary" onclick={closeItemForm}>Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                {/if}

                                <!-- Sub-services -->
                                {#each group.children as child (child.id)}
                                    <div class="sub-row-wrap">
                                        <div
                                            class="item-row sub-row"
                                            data-drag-scope={group.item.id}
                                            data-drag-id={child.id}
                                            class:is-dragging={drag?.id === child.id}
                                            class:indicator-before={dragHover?.id === child.id && dragHover.pos === 'before'}
                                            class:indicator-after={dragHover?.id === child.id && dragHover.pos === 'after'}
                                        >
                                            <span
                                                class="drag-handle sub-handle"
                                                role="button"
                                                tabindex="0"
                                                aria-label="Drag to reorder"
                                                title="Drag to reorder"
                                                onpointerdown={(e) => onGripPointerDown(e, group.item.id, child)}
                                                onpointermove={onGripPointerMove}
                                                onpointerup={onGripPointerUp}
                                                onpointercancel={onGripPointerCancel}
                                            ><i class="fa-solid fa-grip-vertical"></i></span>
                                            <div class="item-info">
                                                <span class="sub-title">{child.title}</span>
                                                <span class="item-meta">
                                                    {#if child.type}{child.type} · {/if}
                                                    {#if child.url}<a href={child.url} target="_blank" rel="noopener noreferrer" class="item-link">link</a> · {/if}
                                                    ${displayCents(child.amount)}{#if child.discountPct > 0} · -{child.discountPct}%{/if}
                                                </span>
                                            </div>
                                            <div class="item-actions">
                                                <button class="btn-sm" onclick={() => openEdit(child)}>Edit</button>
                                                <button class="btn-sm danger" onclick={() => deleteItemTarget = child}>Remove</button>
                                            </div>
                                        </div>

                                        <!-- Inline edit form for a sub-service -->
                                        {#if itemForm?.type === 'edit' && itemForm.id === child.id}
                                            <div class="inline-form sub-inline">
                                                <h4>Edit sub-service</h4>
                                                <ItemFieldsForm item={editingItem ?? child} {resetItemFormOnSubmit} />
                                            </div>
                                        {/if}
                                    </div>
                                {/each}

                                <!-- Inline edit form for the main service -->
                                {#if itemForm?.type === 'edit' && itemForm.id === group.item.id}
                                    <div class="inline-form">
                                        <h4>Edit "{group.item.title}"</h4>
                                        <ItemFieldsForm item={editingItem ?? group.item} {resetItemFormOnSubmit} />
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>

                    {#if deleteItemTarget}
                        <div class="confirm-overlay">
                            <div class="confirm-box">
                                <p>Permanently delete this item?</p>
                                <p class="confirm-item-name">"{deleteItemTarget.title}"</p>
                                {#if !deleteItemTarget.parentId}
                                    {@const subCount = groups.find(g => g.item.id === deleteItemTarget.id)?.children.length ?? 0}
                                    {#if subCount > 0}
                                        <p class="confirm-warning">This will also delete its {subCount} sub-service{subCount !== 1 ? 's' : ''}.</p>
                                    {/if}
                                {/if}
                                <form method="POST" action="?/deleteItem" use:enhance={() => { return async ({ result, update }) => { if (result.type === 'success') deleteItemTarget = null; await update(); }; }}>
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

                <!-- Inline add-item form (shown below the list, so new services land at the bottom) -->
                {#if itemForm?.type === 'add'}
                    <div class="inline-form">
                        <h4>Add Service</h4>
                        <form method="POST" action="?/addItem" use:enhance={resetItemFormOnSubmit}>
                            <div class="form-grid">
                                <label>
                                    <span>Title</span>
                                    <input type="text" name="title" required placeholder="e.g. YouTube video edit" />
                                </label>
                                <label>
                                    <span>Type</span>
                                    <input type="text" name="type" required placeholder="Video editing, Thumbnail..." />
                                </label>
                                <label>
                                    <span>Amount ($)</span>
                                    <input type="number" name="amount" step="0.01" min="0" required />
                                </label>
                                <label>
                                    <span>Discount %</span>
                                    <input type="number" name="discountPct" min="0" max="100" value="0" />
                                </label>
                                <label style="grid-column: span 2;">
                                    <span>URL (optional)</span>
                                    <input type="url" name="url" placeholder="https://..." />
                                </label>
                            </div>
                            <div class="section-actions">
                                <button type="submit" class="btn-cta">Add Service</button>
                                <button type="button" class="btn-secondary" onclick={closeItemForm}>Cancel</button>
                            </div>
                        </form>
                    </div>
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

<!-- Shared add/update item fields -->
{#snippet ItemFieldsForm(item, { resetItemFormOnSubmit })}
    <form method="POST" action="?/updateItem" use:enhance={resetItemFormOnSubmit}>
        <input type="hidden" name="itemId" value={item.id} />
        <div class="form-grid">
            <label>
                <span>Title</span>
                <input type="text" name="title" value={item.title} required />
            </label>
            <label>
                <span>Type</span>
                <input type="text" name="type" value={item.type} required />
            </label>
            <label>
                <span>Amount ($)</span>
                <input type="number" name="amount" value={item.amount / 100} step="0.01" min="0" required />
            </label>
            <label>
                <span>Discount %</span>
                <input type="number" name="discountPct" value={item.discountPct} min="0" max="100" />
            </label>
            <label style="grid-column: span 2;">
                <span>URL (optional)</span>
                <input type="url" name="url" value={item.url ?? ''} placeholder="https://..." />
            </label>
        </div>
        <div class="section-actions">
            <button type="submit" class="btn-cta">Save</button>
            <button type="button" class="btn-secondary" onclick={closeItemForm}>Cancel</button>
        </div>
    </form>
{/snippet}

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
        appearance: textfield;
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
        white-space: nowrap;
    }
    .btn-sm:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
    }
    .btn-sm:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
    .btn-sm.danger {
        color: #f87171;
        border-color: rgba(248, 113, 113, 0.3);
    }
    .btn-cta {
        padding: 0.5rem 1rem;
        background: #ff0000;
        border: none;
        border-radius: 0.4rem;
        color: #fff;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
    }
    .btn-cta:hover {
        background: #e00000;
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
    .empty-text {
        color: rgba(255, 255, 255, 0.35);
        font-style: italic;
        font-size: 0.9rem;
        margin: 0;
    }
    .section-hint {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.4);
        margin: 0 0 0.75rem;
    }
    .prev-list {
        display: flex;
        flex-direction: column;
        margin-bottom: 0.5rem;
    }
    .prev-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.45rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .prev-row:last-child {
        border-bottom: none;
    }
    .prev-info {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 0;
    }
    .prev-name {
        font-weight: 500;
        font-size: 0.9rem;
    }
    .prev-meta {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.4);
    }
    .prev-link-form {
        margin-top: 0.5rem;
    }
    select {
        padding: 0.5rem 0.7rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.35rem;
        color: #fff;
        font-size: 0.9rem;
        width: 100%;
    }
    select option {
        background: #1a1a1a;
        color: #fff;
    }
    .items-table {
        display: flex;
        flex-direction: column;
    }
    .item-group {
        position: relative;
    }
    .item-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: opacity 0.15s, box-shadow 0.1s;
    }
    .item-row:last-child {
        border-bottom: none;
    }
    .main-row {
        font-weight: 500;
    }
    .item-row.is-dragging {
        opacity: 0.35;
    }
    .item-row.indicator-before {
        box-shadow: 0 -2px 0 0 #ff0000;
    }
    .item-row.indicator-after {
        box-shadow: 0 2px 0 0 #ff0000;
    }
    /* Sub-service rows: tucked under their parent, clearly secondary */
    .sub-row-wrap {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .sub-row {
        margin-left: 1.6rem;
        padding: 0.4rem 0 0.4rem 0.8rem;
        border-left: 2px solid rgba(255, 255, 255, 0.12);
        border-bottom: none;
    }
    .sub-title {
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.6);
    }
    .drag-handle {
        cursor: grab;
        color: rgba(255, 255, 255, 0.25);
        font-size: 0.9rem;
        user-select: none;
        flex-shrink: 0;
        padding: 0 0.25rem;
        display: inline-flex;
        align-items: center;
        touch-action: none;
        transition: color 0.15s;
    }
    .drag-handle:hover {
        color: rgba(255, 255, 255, 0.6);
    }
    .drag-handle:active {
        cursor: grabbing;
    }
    .sub-handle {
        font-size: 0.7rem;
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
    .item-link {
        color: #60a5fa;
        text-decoration: none;
    }
    .item-link:hover {
        text-decoration: underline;
    }
    .item-actions {
        display: flex;
        gap: 0.3rem;
        flex-shrink: 0;
    }
    .inline-form {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 0.5rem 0 1rem;
    }
    .inline-form h4 {
        font-size: 0.9rem;
        font-weight: 600;
        margin: 0 0 0.75rem;
        color: rgba(255, 255, 255, 0.75);
    }
    .sub-inline {
        margin-left: 1.6rem;
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
    .confirm-warning {
        color: #fbbf24 !important;
        font-size: 0.85rem;
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