<script>
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { tick } from 'svelte';
    import Receipt from '$lib/components/Receipt.svelte';
    import { itemCost, totalSpent, money } from '$lib/balance-math.js';

    let { data, form } = $props();

    let balance = $derived(data.balance);
    let items = $derived(data.items);
    let ledger = $derived(data.ledger);
    let previousBalances = $derived(data.previousBalances ?? []);
    let linkableBalances = $derived(data.linkableBalances ?? []);

    const shortDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
    const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

    // ── Item grouping ─────────────────────────────────────
    // Items arrive flat (sorted by sort_order, created_at). Group them into
    // main services with their sub-services nested underneath.
    function groupItems(list) {
        const byParent = new Map();
        for (const item of list) {
            const key = item.parentId ?? '__root__';
            if (!byParent.has(key)) byParent.set(key, []);
            byParent.get(key).push(item);
        }
        return (byParent.get('__root__') ?? []).map((item) => ({ item, children: byParent.get(item.id) ?? [] }));
    }
    let groups = $derived(groupItems(items));

    // Types already used, offered as suggestions in the editor.
    let knownTypes = $derived([...new Set(items.filter((i) => !i.parentId && i.type).map((i) => i.type))]);

    // ── Item editor ───────────────────────────────────────
    // One editor at a time, opened in place: { kind: 'add' } | { kind: 'addSub', parentId } | { kind: 'edit', id, isSub }.
    // The draft is bound to the inputs and fed into the receipt preview, so
    // you see the effect before saving.
    let editor = $state(null);
    let draft = $state({ title: '', type: '', amount: null, discountPct: 0, url: '' });
    let editorError = $state('');
    let saving = $state(false);

    async function open(next, values) {
        editor = next;
        draft = values;
        editorError = '';
        await tick();
        document.querySelector('.editor input[name="title"]')?.focus();
    }
    function openAdd() {
        const lastType = groups.at(-1)?.item.type ?? '';
        open({ kind: 'add' }, { title: '', type: lastType, amount: null, discountPct: 0, url: '' });
    }
    function openAddSub(parentId) {
        open({ kind: 'addSub', parentId }, { title: '', type: '', amount: null, discountPct: 0, url: '' });
    }
    function openEdit(item) {
        open(
            { kind: 'edit', id: item.id, isSub: !!item.parentId },
            { title: item.title, type: item.type ?? '', amount: item.amount / 100, discountPct: item.discountPct, url: item.url ?? '' }
        );
    }
    function closeEditor() {
        editor = null;
        editorError = '';
    }

    const draftCents = $derived(Math.max(0, Math.round((Number(draft.amount) || 0) * 100)));
    const draftDiscount = $derived(Math.min(100, Math.max(0, Math.round(Number(draft.discountPct) || 0))));

    // Items as they'd be if the open editor were saved.
    let previewItems = $derived.by(() => {
        if (!editor) return items;
        const d = {
            title: draft.title || 'Untitled',
            type: draft.type,
            amount: draftCents,
            discountPct: draftDiscount,
            url: /^https?:\/\//i.test(draft.url ?? '') ? draft.url : null
        };
        if (editor.kind === 'edit') return items.map((i) => (i.id === editor.id ? { ...i, ...d } : i));
        return [...items, { id: '__draft', parentId: editor.kind === 'addSub' ? editor.parentId : null, sortOrder: 1e9, ...d }];
    });
    let previewGroups = $derived(groupItems(previewItems));
    let previewOrdered = $derived(previewGroups.flatMap((g) => [g.item, ...g.children]));

    let spent = $derived(totalSpent(previewItems));
    let carryIn = $derived(ledger?.carryIn ?? 0);
    let remaining = $derived(balance.initialAmount + carryIn - spent);
    let dirty = $derived(!!editor);

    function submitItem() {
        saving = true;
        return async ({ result, update }) => {
            saving = false;
            if (result.type === 'success') {
                closeEditor();
                await update({ reset: false });
            } else if (result.type === 'failure') {
                editorError = result.data?.itemError ?? 'Could not save.';
            } else {
                await update();
            }
        };
    }

    function editorKeys(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeEditor();
        }
    }

    // ── Delete ────────────────────────────────────────────
    let confirmDelete = $state(false);
    let deleteItemTarget = $state(null);

    // ── Details form ──────────────────────────────────────
    let detailsSaved = $state(false);
    function submitDetails() {
        return async ({ result, update }) => {
            await update({ reset: false });
            if (result.type === 'success') {
                detailsSaved = true;
                setTimeout(() => (detailsSaved = false), 2000);
            }
        };
    }

    // ── Reordering ────────────────────────────────────────
    // Pointer-based drag on the grip handles with live drop indicators.
    // Each scope is a sibling group: 'root' for main services, or a parent
    // item id for its sub-services.
    let drag = $state(null); // { scope, id }
    let dragHover = $state(null); // { id, pos: 'before' | 'after' }
    let dragPointerId = $state(null);

    function scopeIds(scope) {
        if (scope === 'root') return groups.map((g) => g.item.id);
        const group = groups.find((g) => g.item.id === scope);
        return group ? group.children.map((c) => c.id) : [];
    }

    function rowAt(scope, clientX, clientY) {
        const rows = document.querySelectorAll(`[data-drag-scope="${scope}"]`);
        for (const el of rows) {
            const r = el.getBoundingClientRect();
            if (clientY >= r.top && clientY <= r.bottom && clientX >= r.left && clientX <= r.right) {
                return { id: el.getAttribute('data-drag-id'), pos: clientY < r.top + r.height / 2 ? 'before' : 'after' };
            }
        }
        return null;
    }

    function onGripPointerDown(e, scope, item) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (editor) closeEditor();
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
        await move(scope, fromIdx, toIdx);
    }

    function onGripPointerCancel(e) {
        if (!drag || e.pointerId !== dragPointerId) return;
        drag = null;
        dragHover = null;
        dragPointerId = null;
    }

    // Keyboard reordering on the grip: arrow up / down.
    function onGripKey(e, scope, item) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const ids = scopeIds(scope);
        const from = ids.indexOf(item.id);
        const to = from + (e.key === 'ArrowUp' ? -1 : 1);
        if (from === -1 || to < 0 || to >= ids.length) return;
        move(scope, from, to);
    }

    async function move(scope, fromIdx, toIdx) {
        const ids = [...scopeIds(scope)];
        const [id] = ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, id);
        const order = ids.map((id, idx) => ({ id, parentId: scope === 'root' ? '' : scope, sortOrder: idx }));
        const formData = new FormData();
        formData.set('order', JSON.stringify(order));
        const res = await fetch('?/reorderItems', { method: 'POST', body: formData });
        if (res.ok) await invalidateAll();
    }

    // ── Misc ──────────────────────────────────────────────
    let copied = $state(false);
    async function copyLink() {
        await navigator.clipboard.writeText(`${window.location.origin}/balances/${balance.shortId}`);
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }

    function closePrevForm() {
        return async ({ update }) => update({ reset: true });
    }
</script>

<svelte:head>
    <title>{balance.label || 'Balance'} | Admin</title>
</svelte:head>

<div class="edit-balance-page">
    <div class="page-header">
        <div class="title-block">
            <a href="/admin/balances" class="back-link"><i class="fa-solid fa-arrow-left"></i> Balances</a>
            <h1>{balance.label || 'Balance'} <span class="title-date">{shortDate(balance.paymentDate)}</span></h1>
        </div>
        <div class="header-actions">
            <a class="short-id" href={`/balances/${balance.shortId}`} target="_blank" rel="noopener noreferrer">/balances/{balance.shortId}</a>
            <button class="btn-sm copy-btn" onclick={copyLink}>
                <i class="fa-solid {copied ? 'fa-check' : 'fa-link'}"></i> {copied ? 'Copied' : 'Copy link'}
            </button>
        </div>
    </div>

    <!-- Summary -->
    <div class="summary">
        <div class="stat">
            <span class="stat-label">Paid</span>
            <span class="stat-value">{money(balance.initialAmount)}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Carried in</span>
            {#if ledger?.carriedFrom?.length}
                <span class="stat-value" class:neg={carryIn < 0} class:pos={carryIn > 0}>{money(carryIn, { sign: true })}</span>
                <span class="stat-note">from {ledger.carriedFrom.map((c) => shortDate(c.paymentDate)).join(', ')}</span>
            {:else}
                <span class="stat-value dim">–</span>
                <span class="stat-note">no previous balance</span>
            {/if}
        </div>
        <div class="stat">
            <span class="stat-label">Spent</span>
            <span class="stat-value">{money(spent)}</span>
            <span class="stat-note">{items.length} item{items.length === 1 ? '' : 's'}</span>
        </div>
        <div class="stat stat-main" class:neg-card={remaining < 0}>
            <span class="stat-label">{remaining < 0 ? 'Owed' : 'Remaining'}{dirty ? ' (unsaved)' : ''}</span>
            <span class="stat-value" class:neg={remaining < 0}>{money(Math.abs(remaining))}</span>
            {#if ledger?.carriedTo}
                <a class="stat-note carry-link" href={`/admin/balances/${ledger.carriedTo.id}`}>
                    moves to {ledger.carriedTo.label || 'balance'} · {shortDate(ledger.carriedTo.paymentDate)} <i class="fa-solid fa-arrow-right"></i>
                </a>
            {/if}
        </div>
    </div>

    <div class="layout">
        <div class="edit-panel">
            <!-- Services -->
            <section class="section">
                <div class="section-header">
                    <h2>Services</h2>
                    <button class="btn-cta" onclick={openAdd} disabled={editor?.kind === 'add'}><i class="fa-solid fa-plus"></i> Add service</button>
                </div>

                {#if form?.itemError && !editor}
                    <p class="form-error">{form.itemError}</p>
                {/if}

                {#if groups.length === 0 && editor?.kind !== 'add'}
                    <button class="empty-add" onclick={openAdd}>No services yet. <span>Add the first one</span></button>
                {/if}

                <div class="items-list">
                    {#each groups as group (group.item.id)}
                        <div class="item-group">
                            {#if editor?.kind === 'edit' && editor.id === group.item.id}
                                {@render itemEditor(false)}
                            {:else}
                                {@render row(group.item, 'root')}
                            {/if}

                            {#each group.children as child (child.id)}
                                {#if editor?.kind === 'edit' && editor.id === child.id}
                                    <div class="sub-wrap">{@render itemEditor(true)}</div>
                                {:else}
                                    {@render row(child, group.item.id)}
                                {/if}
                            {/each}

                            {#if editor?.kind === 'addSub' && editor.parentId === group.item.id}
                                <div class="sub-wrap">{@render itemEditor(true)}</div>
                            {/if}
                        </div>
                    {/each}
                </div>

                {#if editor?.kind === 'add'}
                    {@render itemEditor(false)}
                {:else if groups.length > 0}
                    <button class="add-row" onclick={openAdd}><i class="fa-solid fa-plus"></i> Add service</button>
                {/if}
            </section>

            <!-- Previous balances / carry-over -->
            <section class="section">
                <h2>Carry-over</h2>
                <p class="section-hint">
                    Link the client's previous balance and whatever is left on it (or owed) moves into this one.
                    It's recalculated live, so later edits to the old balance flow through here too.
                </p>

                {#if form?.previousError}
                    <p class="form-error">{form.previousError}</p>
                {/if}

                {#if previousBalances.length > 0}
                    <div class="prev-list">
                        {#each previousBalances as pb (pb.id)}
                            <div class="prev-row">
                                <div class="prev-info">
                                    <a class="prev-name" href={`/admin/balances/${pb.id}`}>{pb.label || 'Unlabeled balance'} · {shortDate(pb.paymentDate)}</a>
                                    <span class="prev-meta">
                                        {#if pb.carriesHere}
                                            {pb.remaining < 0 ? 'Owed' : 'Left over'} carried in
                                        {:else if pb.carriedTo}
                                            Link only: its remainder carries into {pb.carriedTo.label || 'another balance'} · {shortDate(pb.carriedTo.paymentDate)}
                                        {:else}
                                            Link only
                                        {/if}
                                    </span>
                                </div>
                                {#if pb.carriesHere}
                                    <span class="prev-amount" class:neg={pb.remaining < 0} class:pos={pb.remaining > 0}>{money(pb.remaining, { sign: true })}</span>
                                {/if}
                                <form method="POST" action="?/unlinkPreviousBalance" use:enhance>
                                    <input type="hidden" name="previousId" value={pb.id} />
                                    <button class="icon-btn danger" title="Unlink" aria-label="Unlink {pb.label || 'balance'}"><i class="fa-solid fa-link-slash"></i></button>
                                </form>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if linkableBalances.length > 0}
                    <form method="POST" action="?/linkPreviousBalance" use:enhance={closePrevForm} class="prev-link-form">
                        <select name="previousId" required aria-label="Previous balance to link">
                            <option value="">Link a previous balance…</option>
                            {#each linkableBalances as lb (lb.id)}
                                <option value={lb.id}>
                                    {lb.label || 'Unlabeled'} · {shortDate(lb.paymentDate)} · {lb.remaining < 0 ? 'owes' : 'left'} {money(Math.abs(lb.remaining))}
                                </option>
                            {/each}
                        </select>
                        <button type="submit" class="btn-secondary">Link</button>
                    </form>
                {:else if previousBalances.length === 0}
                    <p class="empty-text">No other balances available to link.</p>
                {/if}
            </section>

            <!-- Details -->
            <section class="section">
                <h2>Details</h2>
                {#if form?.error}
                    <p class="form-error">{form.error}</p>
                {/if}
                <form method="POST" action="?/updateBalance" use:enhance={submitDetails}>
                    <div class="form-grid">
                        <label>
                            <span>Label</span>
                            <input type="text" name="label" value={balance.label ?? ''} />
                        </label>
                        <label>
                            <span>Amount paid ($)</span>
                            <input type="number" name="initialAmount" value={balance.initialAmount / 100} step="0.01" min="0" required />
                        </label>
                        <label>
                            <span>Payment date</span>
                            <input type="date" name="paymentDate" value={isoDate(balance.paymentDate)} required />
                        </label>
                        <label>
                            <span>Payment method</span>
                            <input type="text" name="paymentMethod" value={balance.paymentMethod} required />
                        </label>
                        <label>
                            <span>New PIN <em>(blank keeps the current one)</em></span>
                            <input type="text" name="newPin" maxlength="4" placeholder="••••" autocomplete="off" inputmode="numeric" pattern="[0-9]{4}" style="letter-spacing:0.3em" />
                        </label>
                        <label>
                            <span>Expiry date <em>(optional)</em></span>
                            <input type="date" name="expiresAt" value={isoDate(balance.expiresAt)} />
                        </label>
                    </div>
                    <div class="section-actions">
                        <button type="submit" class="btn-cta">{detailsSaved ? 'Saved' : 'Save details'}</button>
                        <button type="button" class="btn-ghost-danger" onclick={() => (confirmDelete = true)}>Delete balance</button>
                    </div>
                </form>
            </section>
        </div>

        <!-- Live receipt preview -->
        <div class="preview-panel">
            <h3 class="preview-heading">Client view {#if dirty}<span class="live">live preview</span>{/if}</h3>
            <Receipt {balance} items={previewOrdered} carry={ledger} />
        </div>
    </div>
</div>

{#if confirmDelete}
    <div class="confirm-overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && (confirmDelete = false)}>
        <div class="confirm-box" role="dialog" aria-modal="true">
            <p>Delete this balance?</p>
            <p class="confirm-sub">Its services and links go with it. This can't be undone.</p>
            {#if ledger?.carriedTo}
                <p class="confirm-warning">Its remainder stops carrying into the {shortDate(ledger.carriedTo.paymentDate)} balance.</p>
            {/if}
            <form method="POST" action="?/deleteBalance" use:enhance>
                <div class="section-actions">
                    <button type="submit" class="btn-danger">Delete</button>
                    <button type="button" class="btn-secondary" onclick={() => (confirmDelete = false)}>Cancel</button>
                </div>
            </form>
        </div>
    </div>
{/if}

{#if deleteItemTarget}
    {@const subCount = deleteItemTarget.parentId ? 0 : (groups.find((g) => g.item.id === deleteItemTarget.id)?.children.length ?? 0)}
    <div class="confirm-overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && (deleteItemTarget = null)}>
        <div class="confirm-box" role="dialog" aria-modal="true">
            <p>Remove "{deleteItemTarget.title}"?</p>
            {#if subCount > 0}
                <p class="confirm-warning">Its {subCount} sub-service{subCount !== 1 ? 's' : ''} will be removed too.</p>
            {/if}
            <form
                method="POST"
                action="?/deleteItem"
                use:enhance={() => async ({ result, update }) => {
                    if (result.type === 'success') deleteItemTarget = null;
                    await update();
                }}
            >
                <input type="hidden" name="itemId" value={deleteItemTarget.id} />
                <input type="hidden" name="mode" value="delete" />
                <div class="section-actions">
                    <button type="submit" class="btn-danger">Remove</button>
                    <button type="button" class="btn-secondary" onclick={() => (deleteItemTarget = null)}>Cancel</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<svelte:window onkeydown={(e) => {
    if (e.key !== 'Escape') return;
    if (deleteItemTarget) deleteItemTarget = null;
    else if (confirmDelete) confirmDelete = false;
}} />

{#snippet row(item, scope)}
    {@const isSub = scope !== 'root'}
    <div
        class="item-row"
        class:sub-row={isSub}
        data-drag-scope={scope}
        data-drag-id={item.id}
        class:is-dragging={drag?.id === item.id}
        class:indicator-before={dragHover?.id === item.id && dragHover.pos === 'before'}
        class:indicator-after={dragHover?.id === item.id && dragHover.pos === 'after'}
    >
        <span
            class="drag-handle"
            role="button"
            tabindex="0"
            aria-label="Reorder {item.title} (drag, or arrow keys)"
            title="Drag to reorder"
            onpointerdown={(e) => onGripPointerDown(e, scope, item)}
            onpointermove={onGripPointerMove}
            onpointerup={onGripPointerUp}
            onpointercancel={onGripPointerCancel}
            onkeydown={(e) => onGripKey(e, scope, item)}
        ><i class="fa-solid fa-grip-vertical"></i></span>
        <button class="item-main" onclick={() => openEdit(item)} title="Edit">
            <span class="item-title">
                {item.title}
                {#if item.url}<i class="fa-solid fa-arrow-up-right-from-square url-icon" title={item.url}></i>{/if}
            </span>
            {#if !isSub && item.type}<span class="item-type">{item.type}</span>{/if}
        </button>
        <span class="item-price">
            {#if itemCost(item) === 0}
                <span class="free">Free</span>
            {:else if item.discountPct > 0}
                <s>{money(item.amount)}</s> {money(itemCost(item))} <span class="disc">−{item.discountPct}%</span>
            {:else}
                {money(item.amount)}
            {/if}
        </span>
        <span class="item-actions">
            {#if !isSub}
                <button class="icon-btn" title="Add sub-service" aria-label="Add sub-service to {item.title}" onclick={() => openAddSub(item.id)}><i class="fa-solid fa-turn-down fa-flip-horizontal"></i></button>
            {/if}
            <button class="icon-btn" title="Edit" aria-label="Edit {item.title}" onclick={() => openEdit(item)}><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn danger" title="Remove" aria-label="Remove {item.title}" onclick={() => (deleteItemTarget = item)}><i class="fa-solid fa-trash"></i></button>
        </span>
    </div>
{/snippet}

{#snippet itemEditor(isSub)}
    {@const isEdit = editor?.kind === 'edit'}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Esc closes the editor) -->
    <form
        class="editor"
        class:sub-editor={isSub}
        method="POST"
        action={isEdit ? '?/updateItem' : '?/addItem'}
        use:enhance={submitItem}
        onkeydown={editorKeys}
    >
        {#if isEdit}<input type="hidden" name="itemId" value={editor.id} />{/if}
        {#if editor?.kind === 'addSub'}<input type="hidden" name="parentId" value={editor.parentId} />{/if}
        <div class="editor-head">
            {isEdit ? (isSub ? 'Edit sub-service' : 'Edit service') : isSub ? 'New sub-service' : 'New service'}
        </div>
        {#if editorError}<p class="form-error">{editorError}</p>{/if}
        <div class="editor-grid" class:sub-grid={isSub}>
            <label class="f-title">
                <span>Title</span>
                <input type="text" name="title" bind:value={draft.title} required placeholder={isSub ? 'e.g. 200k views bonus' : 'e.g. YouTube video edit'} />
            </label>
            {#if !isSub}
                <label class="f-type">
                    <span>Type</span>
                    <input type="text" name="type" bind:value={draft.type} required list="balance-types" placeholder="Video editing, Thumbnail…" />
                </label>
            {/if}
            <label class="f-amount">
                <span>Amount ($)</span>
                <input type="number" name="amount" bind:value={draft.amount} step="0.01" min="0" required placeholder="0.00" />
            </label>
            <label class="f-disc">
                <span>Discount %</span>
                <input type="number" name="discountPct" bind:value={draft.discountPct} min="0" max="100" step="1" />
            </label>
            {#if !isSub}
                <label class="f-url">
                    <span>Link <em>(optional)</em></span>
                    <input type="url" name="url" bind:value={draft.url} placeholder="https://…" />
                </label>
            {:else if isEdit}
                <input type="hidden" name="url" value={draft.url} />
            {/if}
        </div>
        <div class="editor-foot">
            <span class="editor-cost">
                {#if draftDiscount > 0 && draftCents > 0}
                    Charged {money(Math.round((draftCents * (100 - draftDiscount)) / 100))}
                {:else if draftCents === 0 || draftDiscount === 100}
                    Shows as <strong>Free</strong>
                {/if}
            </span>
            <span class="kbd-hint">Enter to save · Esc to cancel</span>
            <button type="button" class="btn-secondary" onclick={closeEditor}>Cancel</button>
            <button type="submit" class="btn-cta" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}</button>
        </div>
    </form>
{/snippet}

<datalist id="balance-types">
    {#each knownTypes as t}<option value={t}></option>{/each}
</datalist>

<style>
    .edit-balance-page {
        padding: 2rem;
    }
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1.25rem;
    }
    .title-block {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }
    .page-header h1 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
    }
    .title-date {
        font-weight: 400;
        color: rgba(255, 255, 255, 0.4);
        font-size: 1.1rem;
        margin-left: 0.35rem;
    }
    .back-link {
        color: rgba(255, 255, 255, 0.5);
        text-decoration: none;
        font-size: 0.82rem;
    }
    .back-link:hover {
        color: #fff;
    }
    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    .short-id {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.45);
        font-family: monospace;
        text-decoration: none;
    }
    .short-id:hover {
        color: #fff;
    }

    /* Summary */
    .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }
    .stat {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        padding: 0.9rem 1.1rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
        min-width: 0;
    }
    .stat-main {
        border-color: rgba(74, 222, 128, 0.3);
        background: rgba(74, 222, 128, 0.05);
    }
    .stat-main.neg-card {
        border-color: rgba(248, 113, 113, 0.3);
        background: rgba(248, 113, 113, 0.05);
    }
    .stat-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(255, 255, 255, 0.45);
    }
    .stat-value {
        font-size: 1.35rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }
    .stat-value.dim {
        color: rgba(255, 255, 255, 0.3);
    }
    .stat-note {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.4);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .carry-link {
        color: #60a5fa;
        text-decoration: none;
    }
    .carry-link:hover {
        text-decoration: underline;
    }
    .pos {
        color: #4ade80;
    }
    .neg {
        color: #f87171;
    }

    .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 420px;
        gap: 2rem;
        align-items: start;
    }
    @media (max-width: 1100px) {
        .layout {
            grid-template-columns: minmax(0, 1fr);
        }
        .preview-panel {
            position: static !important;
        }
    }
    @media (max-width: 760px) {
        .edit-balance-page {
            padding: 1rem;
        }
        .summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
    .section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
        padding: 1.25rem 1.5rem 1.5rem;
        margin-bottom: 1.5rem;
    }
    .section h2 {
        font-size: 1.05rem;
        font-weight: 600;
        margin: 0 0 0.75rem;
    }
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
    }
    .section-header h2 {
        margin: 0;
    }
    .section-hint {
        font-size: 0.82rem;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.45);
        margin: -0.25rem 0 1rem;
    }
    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }
    @media (max-width: 560px) {
        .form-grid {
            grid-template-columns: 1fr;
        }
    }
    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
    }
    label span {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.55);
    }
    label em {
        font-style: normal;
        color: rgba(255, 255, 255, 0.3);
    }
    input,
    select {
        padding: 0.5rem 0.7rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.4rem;
        color: #fff;
        font-size: 0.9rem;
        font-family: inherit;
        width: 100%;
        box-sizing: border-box;
        min-width: 0;
    }
    input:focus,
    select:focus {
        border-color: rgba(255, 255, 255, 0.35);
        outline: none;
    }
    select option {
        background: #1a1a1a;
        color: #fff;
    }
    input[type='date']::-webkit-calendar-picker-indicator {
        filter: invert(1);
        opacity: 0.5;
    }
    .form-error {
        background: rgba(248, 113, 113, 0.1);
        border: 1px solid rgba(248, 113, 113, 0.3);
        color: #f87171;
        padding: 0.5rem 0.8rem;
        border-radius: 0.4rem;
        margin: 0 0 0.8rem;
        font-size: 0.85rem;
    }
    .section-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
        align-items: center;
    }

    /* Buttons */
    button {
        font-family: inherit;
    }
    .btn-cta {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 1rem;
        background: #ff2b1f;
        border: none;
        border-radius: 0.45rem;
        color: #fff;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
    }
    .btn-cta:hover:not(:disabled) {
        background: #e5170c;
    }
    .btn-cta:disabled {
        opacity: 0.5;
        cursor: default;
    }
    .btn-secondary {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.45rem;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.85rem;
        cursor: pointer;
        white-space: nowrap;
    }
    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.11);
    }
    .btn-danger {
        padding: 0.5rem 1rem;
        background: rgba(248, 113, 113, 0.15);
        border: 1px solid rgba(248, 113, 113, 0.35);
        border-radius: 0.45rem;
        color: #f87171;
        font-size: 0.85rem;
        cursor: pointer;
    }
    .btn-danger:hover {
        background: rgba(248, 113, 113, 0.25);
    }
    .btn-ghost-danger {
        margin-left: auto;
        background: none;
        border: none;
        color: rgba(248, 113, 113, 0.75);
        font-size: 0.82rem;
        cursor: pointer;
    }
    .btn-ghost-danger:hover {
        color: #f87171;
        text-decoration: underline;
    }
    .btn-sm {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.65rem;
        font-size: 0.8rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.4rem;
        color: rgba(255, 255, 255, 0.75);
        cursor: pointer;
        white-space: nowrap;
    }
    .btn-sm:hover {
        background: rgba(255, 255, 255, 0.12);
    }
    .icon-btn {
        width: 1.9rem;
        height: 1.9rem;
        display: inline-grid;
        place-items: center;
        background: none;
        border: 1px solid transparent;
        border-radius: 0.4rem;
        color: rgba(255, 255, 255, 0.45);
        font-size: 0.78rem;
        cursor: pointer;
    }
    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
    }
    .icon-btn.danger:hover {
        background: rgba(248, 113, 113, 0.12);
        color: #f87171;
    }

    /* Services list */
    .items-list {
        display: flex;
        flex-direction: column;
    }
    .item-group {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding: 0.15rem 0;
    }
    .item-group:last-child {
        border-bottom: none;
    }
    .item-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.3rem 0.25rem;
        border-radius: 0.45rem;
        transition: opacity 0.15s, box-shadow 0.1s, background 0.12s;
    }
    .item-row:hover {
        background: rgba(255, 255, 255, 0.03);
    }
    .item-row.is-dragging {
        opacity: 0.35;
    }
    .item-row.indicator-before {
        box-shadow: 0 -2px 0 0 #ff2b1f;
    }
    .item-row.indicator-after {
        box-shadow: 0 2px 0 0 #ff2b1f;
    }
    .sub-row {
        margin-left: 1.5rem;
        padding-top: 0.15rem;
        padding-bottom: 0.15rem;
        border-left: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 0 0.45rem 0.45rem 0;
    }
    .drag-handle {
        cursor: grab;
        color: rgba(255, 255, 255, 0.2);
        font-size: 0.85rem;
        user-select: none;
        flex-shrink: 0;
        padding: 0.3rem 0.25rem;
        touch-action: none;
        border-radius: 0.3rem;
    }
    .drag-handle:hover,
    .drag-handle:focus-visible {
        color: rgba(255, 255, 255, 0.6);
    }
    .drag-handle:focus-visible {
        outline: 1px solid rgba(255, 255, 255, 0.4);
    }
    .sub-row .drag-handle {
        font-size: 0.7rem;
    }
    .item-main {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        background: none;
        border: none;
        padding: 0.35rem 0;
        color: inherit;
        text-align: left;
        cursor: pointer;
    }
    .item-title {
        font-weight: 500;
        font-size: 0.92rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }
    .sub-row .item-title {
        font-weight: 400;
        font-size: 0.84rem;
        color: rgba(255, 255, 255, 0.62);
    }
    .url-icon {
        font-size: 0.65rem;
        color: #60a5fa;
        margin-left: 0.3rem;
    }
    .item-type {
        flex-shrink: 0;
        font-size: 0.72rem;
        padding: 0.12rem 0.5rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.07);
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
    }
    .item-price {
        flex-shrink: 0;
        font-size: 0.88rem;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .sub-row .item-price {
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.6);
    }
    .item-price s {
        color: rgba(255, 255, 255, 0.3);
        font-weight: 400;
        margin-right: 0.15rem;
    }
    .disc {
        font-size: 0.7rem;
        color: #4ade80;
        margin-left: 0.15rem;
    }
    .free {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #4ade80;
    }
    .item-actions {
        display: flex;
        gap: 0.1rem;
        flex-shrink: 0;
        opacity: 0.35;
        transition: opacity 0.12s;
    }
    .item-row:hover .item-actions,
    .item-row:focus-within .item-actions {
        opacity: 1;
    }
    @media (hover: none) {
        .item-actions {
            opacity: 1;
        }
    }
    .add-row,
    .empty-add {
        width: 100%;
        margin-top: 0.6rem;
        padding: 0.65rem;
        background: none;
        border: 1px dashed rgba(255, 255, 255, 0.14);
        border-radius: 0.5rem;
        color: rgba(255, 255, 255, 0.45);
        font-size: 0.85rem;
        cursor: pointer;
    }
    .add-row:hover,
    .empty-add:hover {
        border-color: rgba(255, 255, 255, 0.3);
        color: #fff;
    }
    .empty-add span {
        color: #ff6a5f;
    }

    /* In-place editor */
    .editor {
        margin: 0.4rem 0;
        padding: 0.9rem 1rem 1rem;
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(255, 43, 31, 0.35);
        border-radius: 0.6rem;
        box-shadow: 0 0 0 3px rgba(255, 43, 31, 0.07);
    }
    .sub-wrap {
        margin-left: 1.5rem;
    }
    .editor-head {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 0.7rem;
    }
    .editor-grid {
        display: grid;
        grid-template-columns: 2fr 1.3fr 1fr 0.8fr;
        gap: 0.65rem;
    }
    .editor-grid .f-url {
        grid-column: 1 / -1;
    }
    .editor-grid.sub-grid {
        grid-template-columns: 2fr 1fr 0.8fr;
    }
    @media (max-width: 640px) {
        .editor-grid,
        .editor-grid.sub-grid {
            grid-template-columns: 1fr 1fr;
        }
        .editor-grid .f-title,
        .editor-grid .f-type {
            grid-column: 1 / -1;
        }
    }
    .editor-foot {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-top: 0.85rem;
    }
    .editor-cost {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.55);
    }
    .editor-cost strong {
        color: #4ade80;
    }
    .kbd-hint {
        margin-left: auto;
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.3);
    }
    @media (max-width: 640px) {
        .kbd-hint {
            display: none;
        }
        .editor-foot .btn-secondary {
            margin-left: auto;
        }
    }

    /* Carry-over */
    .prev-list {
        display: flex;
        flex-direction: column;
        margin-bottom: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 0.55rem;
    }
    .prev-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.55rem 0.5rem 0.55rem 0.85rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .prev-row:last-child {
        border-bottom: none;
    }
    .prev-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 0;
    }
    .prev-name {
        font-weight: 500;
        font-size: 0.9rem;
        color: #fff;
        text-decoration: none;
    }
    .prev-name:hover {
        text-decoration: underline;
    }
    .prev-meta {
        font-size: 0.76rem;
        color: rgba(255, 255, 255, 0.4);
    }
    .prev-amount {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .prev-link-form {
        display: flex;
        gap: 0.5rem;
    }
    .empty-text {
        color: rgba(255, 255, 255, 0.35);
        font-size: 0.85rem;
        margin: 0;
    }

    /* Dialogs */
    .confirm-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
        padding: 1rem;
    }
    .confirm-box {
        background: #161616;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 0.85rem;
        padding: 1.4rem 1.5rem;
        max-width: 380px;
        width: 100%;
    }
    .confirm-box p {
        margin: 0 0 0.35rem;
        font-weight: 600;
    }
    .confirm-sub {
        font-weight: 400 !important;
        font-size: 0.88rem;
        color: rgba(255, 255, 255, 0.55);
    }
    .confirm-warning {
        color: #fbbf24 !important;
        font-weight: 400 !important;
        font-size: 0.85rem;
    }

    /* Preview */
    .preview-panel {
        position: sticky;
        top: 1rem;
    }
    .preview-heading {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(255, 255, 255, 0.4);
        margin: 0 0 0.75rem;
        font-weight: 500;
    }
    .live {
        text-transform: none;
        letter-spacing: 0;
        font-size: 0.72rem;
        padding: 0.1rem 0.45rem;
        border-radius: 999px;
        background: rgba(255, 43, 31, 0.15);
        color: #ff6a5f;
    }
</style>
