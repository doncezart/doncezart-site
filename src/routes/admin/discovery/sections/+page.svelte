<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let editingId = $state(null);
	let editName = $state('');
	let editDesc = $state('');

	function startEdit(s) {
		editingId = s.id;
		editName = s.name;
		editDesc = s.description ?? '';
	}
	function cancelEdit() { editingId = null; }
</script>

<div class="page-header">
	<h1>Discovery Sections</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<!-- Create -->
<form method="POST" action="?/create" use:enhance class="create-form">
	<input type="text" name="name" placeholder="Section name…" required />
	<input type="text" name="description" placeholder="Short description…" />
	<button type="submit" class="btn-cta">Add Section</button>
</form>

{#if data.sections.length === 0}
	<p class="empty">No sections yet.</p>
{:else}
	<div class="section-list">
		{#each data.sections as s (s.id)}
			<div class="section-row">
				<!-- Reorder -->
				<div class="order-btns">
					<form method="POST" action="?/moveUp" use:enhance>
						<input type="hidden" name="id" value={s.id} />
						<button type="submit" class="order-btn" aria-label="Move up">
							<i class="fa-solid fa-chevron-up"></i>
						</button>
					</form>
					<form method="POST" action="?/moveDown" use:enhance>
						<input type="hidden" name="id" value={s.id} />
						<button type="submit" class="order-btn" aria-label="Move down">
							<i class="fa-solid fa-chevron-down"></i>
						</button>
					</form>
				</div>

				<!-- Info / Edit -->
				{#if editingId === s.id}
					<form method="POST" action="?/update" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="edit-form">
						<input type="hidden" name="id" value={s.id} />
						<input type="text" name="name" bind:value={editName} required />
						<input type="text" name="description" bind:value={editDesc} placeholder="Description…" />
						<button type="submit" class="btn-sm save"><i class="fa-solid fa-check"></i></button>
						<button type="button" class="btn-sm cancel" onclick={cancelEdit}><i class="fa-solid fa-xmark"></i></button>
					</form>
				{:else}
					<div class="section-info">
						<span class="section-name">{s.name}</span>
						<span class="section-slug">{s.slug}</span>
						{#if s.description}<span class="section-desc">{s.description}</span>{/if}
					</div>
					<span class="item-count">{s.itemCount} item{s.itemCount === 1 ? '' : 's'}</span>
					<button class="btn-sm edit" onclick={() => startEdit(s)} aria-label="Edit section">
						<i class="fa-solid fa-pen"></i>
					</button>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={s.id} />
						<button
							type="submit"
							class="btn-sm delete"
							aria-label="Delete section"
							onclick={(e) => { if (!confirm(`Delete "${s.name}"?`)) e.preventDefault(); }}
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
	.create-form {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}
	.create-form input {
		flex: 1;
		min-width: 160px;
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9rem;
	}
	.create-form input:focus { outline: none; border-color: #ff0000; }
	.empty { color: rgba(255,255,255,0.5); }
	.section-list { display: flex; flex-direction: column; gap: 0.5rem; max-width: 700px; }
	.section-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
	}
	.order-btns { display: flex; flex-direction: column; gap: 0.1rem; }
	.order-btn {
		background: none; border: none; color: rgba(255,255,255,0.3);
		cursor: pointer; padding: 0.15rem; font-size: 0.7rem;
		transition: color 0.15s;
	}
	.order-btn:hover { color: #fff; }
	.section-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
	.section-name { font-weight: 600; font-size: 0.95rem; }
	.section-slug { color: rgba(255,255,255,0.35); font-size: 0.8rem; }
	.section-desc { color: rgba(255,255,255,0.55); font-size: 0.85rem; }
	.item-count { color: rgba(255,255,255,0.4); font-size: 0.8rem; white-space: nowrap; }
	.edit-form { display: flex; gap: 0.5rem; flex: 1; align-items: center; }
	.edit-form input {
		flex: 1;
		padding: 0.4rem 0.6rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.2);
		border-radius: 0.35rem;
		color: #fff;
		font-size: 0.9rem;
	}
	.btn-sm {
		padding: 0.35rem 0.6rem;
		border-radius: 0.35rem;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.15s;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
	}
	.btn-sm:hover { background: rgba(255,255,255,0.14); color: #fff; }
	.btn-sm.delete:hover { background: rgba(255,50,50,0.2); color: #ff4444; }
	.btn-sm.save:hover { background: rgba(50,200,50,0.2); color: #44cc44; }
	.error {
		color: #ff4444;
		background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
