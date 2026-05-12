<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	// Track which tag is being edited inline
	let editingId = $state(null);
	let editingName = $state('');

	function startEdit(tag) {
		editingId = tag.id;
		editingName = tag.name;
	}
	function cancelEdit() {
		editingId = null;
		editingName = '';
	}
</script>

<div class="page-header">
	<h1>Discovery Tags</h1>
	<p class="hint">Tags use IDs internally — renaming a tag updates its display name everywhere instantly, no bulk edits needed.</p>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<form method="POST" action="?/create" use:enhance={({ formElement }) => {
	return ({ result, update }) => {
		if (result.type === 'success') formElement.reset();
		update();
	};
}} class="create-form">
	<input type="text" name="name" placeholder="New tag name…" required />
	<button type="submit" class="btn-cta"><i class="fa-solid fa-plus"></i> Add Tag</button>
</form>

{#if data.tags.length === 0}
	<p class="empty">No discovery tags yet.</p>
{:else}
	<div class="tag-list">
		{#each data.tags as t (t.id)}
			<div class="tag-row" class:editing={editingId === t.id}>
				{#if editingId === t.id}
					<form
						method="POST"
						action="?/rename"
						class="rename-form"
						use:enhance={() => ({ update }) => { cancelEdit(); update(); }}
					>
						<input type="hidden" name="id" value={t.id} />
						<input
							type="text"
							name="name"
							bind:value={editingName}
							required
							class="rename-input"
							onkeydown={(e) => e.key === 'Escape' && cancelEdit()}
						/>
						<button type="submit" class="icon-btn save" aria-label="Save">
							<i class="fa-solid fa-check"></i>
						</button>
						<button type="button" class="icon-btn cancel" onclick={cancelEdit} aria-label="Cancel">
							<i class="fa-solid fa-xmark"></i>
						</button>
					</form>
				{:else}
					<span class="tag-name">{t.name}</span>
					<span class="tag-slug">{t.slug}</span>
					<span class="tag-count">{t.useCount} item{t.useCount !== 1 ? 's' : ''}</span>
					<button class="icon-btn edit" onclick={() => startEdit(t)} aria-label="Rename tag">
						<i class="fa-solid fa-pen"></i>
					</button>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={t.id} />
						<button
							type="submit"
							class="icon-btn delete"
							aria-label="Delete tag"
							onclick={(e) => {
								if (!confirm(`Delete tag "${t.name}"? It will be removed from all ${t.useCount} item(s).`))
									e.preventDefault();
							}}
						>
							<i class="fa-solid fa-trash"></i>
						</button>
					</form>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.page-header { margin-bottom: 1.5rem; }
	.hint { color: rgba(255,255,255,0.4); font-size: 0.85rem; margin: 0.25rem 0 0; }
	.create-form {
		display: flex;
		gap: 0.75rem;
		max-width: 500px;
	}
	.create-form input {
		flex: 1;
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 1rem;
		font-family: inherit;
	}
	.create-form input:focus { outline: none; border-color: #ff0000; }
	.btn-cta {
		padding: 0.6rem 1.1rem;
		background: #ff0000; color: #fff; border: none;
		border-radius: 0.5rem; font-size: 0.9rem; font-weight: 600;
		font-family: inherit; cursor: pointer; display: inline-flex;
		align-items: center; gap: 0.4rem; transition: background 0.15s;
	}
	.btn-cta:hover { background: #e00000; }
	.empty { color: rgba(255,255,255,0.5); margin-top: 1.5rem; }
	.tag-list {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 560px;
	}
	.tag-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
		transition: border-color 0.15s;
	}
	.tag-row.editing { border-color: rgba(255,255,255,0.25); }
	.tag-name { font-weight: 600; min-width: 0; }
	.tag-slug { flex: 1; color: rgba(255,255,255,0.35); font-size: 0.82rem; font-family: monospace; }
	.tag-count { color: rgba(255,255,255,0.35); font-size: 0.8rem; white-space: nowrap; }
	.rename-form {
		display: flex; align-items: center; gap: 0.5rem; width: 100%;
	}
	.rename-input {
		flex: 1;
		padding: 0.35rem 0.6rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.3);
		border-radius: 0.4rem;
		color: #fff;
		font-size: 0.95rem;
		font-family: inherit;
	}
	.rename-input:focus { outline: none; border-color: #ff0000; }
	.icon-btn {
		background: none; border: none;
		color: rgba(255,255,255,0.4);
		cursor: pointer; padding: 0.3rem 0.4rem;
		border-radius: 0.3rem; font-size: 0.85rem;
		transition: all 0.12s; display: flex; align-items: center;
	}
	.icon-btn.edit:hover { color: #fff; background: rgba(255,255,255,0.1); }
	.icon-btn.save:hover { color: #44ff88; background: rgba(68,255,136,0.1); }
	.icon-btn.cancel:hover { color: rgba(255,255,255,0.7); }
	.icon-btn.delete:hover { color: #ff4444; background: rgba(255,68,68,0.1); }
	.error {
		color: #ff4444;
		background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
