<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<div class="page-header">
	<h1>Discovery Tags</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<form method="POST" action="?/create" use:enhance class="create-form">
	<input type="text" name="name" placeholder="New tag name…" required />
	<button type="submit" class="btn-cta">Add Tag</button>
</form>

{#if data.tags.length === 0}
	<p class="empty">No discovery tags yet.</p>
{:else}
	<div class="tag-list">
		{#each data.tags as t (t.id)}
			<div class="tag-row">
				<span class="tag-name">{t.name}</span>
				<span class="tag-slug">{t.slug}</span>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={t.id} />
					<button type="submit" class="delete-btn" aria-label="Delete tag">
						<i class="fa-solid fa-xmark"></i>
					</button>
				</form>
			</div>
		{/each}
	</div>
{/if}

<style>
	.page-header { margin-bottom: 1.5rem; }
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
	}
	.create-form input:focus { outline: none; border-color: #ff0000; }
	.empty { color: rgba(255,255,255,0.5); margin-top: 1.5rem; }
	.tag-list {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 500px;
	}
	.tag-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
	}
	.tag-name { font-weight: 600; }
	.tag-slug { flex: 1; color: rgba(255,255,255,0.4); font-size: 0.85rem; }
	.delete-btn {
		background: none;
		border: none;
		color: rgba(255,255,255,0.3);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: color 0.15s;
	}
	.delete-btn:hover { color: #ff3333; }
	.error {
		color: #ff4444;
		background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
