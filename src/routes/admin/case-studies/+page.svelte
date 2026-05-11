<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let editing = $state(null);
	let editTitle = $state('');
	let editContent = $state('');

	function startEdit(cs) {
		editing = cs.id;
		editTitle = cs.title;
		editContent = cs.content || '';
	}

	function cancelEdit() {
		editing = null;
		editTitle = '';
		editContent = '';
	}
</script>

<div class="page-header">
	<h1>Case Studies</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<!-- Create form -->
<form method="POST" action="?/create" use:enhance class="create-form">
	<input type="text" name="title" placeholder="New case study title…" required />
	<button type="submit"><i class="fa-solid fa-plus"></i> Create</button>
</form>

<div class="cs-list">
	{#each data.caseStudies as cs (cs.id)}
		<div class="cs-card">
			{#if editing === cs.id}
				<form method="POST" action="?/update" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="edit-form">
					<input type="hidden" name="id" value={cs.id} />
					<input type="text" name="title" bind:value={editTitle} required />
					<textarea name="content" bind:value={editContent} rows="8" placeholder="Case study content (Markdown)…"></textarea>
					<div class="edit-actions">
						<button type="submit" class="btn-save"><i class="fa-solid fa-check"></i> Save</button>
						<button type="button" class="btn-cancel" onclick={cancelEdit}>Cancel</button>
					</div>
				</form>
			{:else}
				<div class="cs-header">
					<div class="cs-info">
						<h3>{cs.title}</h3>
						<span class="cs-meta">
							{cs.artworkCount} artwork{cs.artworkCount !== 1 ? 's' : ''} linked
							· {cs.slug}
						</span>
					</div>
					<div class="cs-actions">
						<button class="btn-sm edit" onclick={() => startEdit(cs)} aria-label="Edit case study">
							<i class="fa-solid fa-pen"></i>
						</button>
						<form method="POST" action="?/delete" use:enhance class="inline-form">
							<input type="hidden" name="id" value={cs.id} />
							<button type="submit" class="btn-sm delete" aria-label="Delete case study"
								onclick={(e) => { if (!confirm('Delete this case study? Linked artworks will be unlinked.')) e.preventDefault(); }}>
								<i class="fa-solid fa-trash"></i>
							</button>
						</form>
					</div>
				</div>
				{#if cs.content}
					<p class="cs-preview">{cs.content.slice(0, 200)}{cs.content.length > 200 ? '…' : ''}</p>
				{:else}
					<p class="cs-preview empty">No content yet</p>
				{/if}
			{/if}
		</div>
	{/each}
</div>

{#if data.caseStudies.length === 0}
	<p class="empty-state">No case studies yet. Create one above, then link it to artworks.</p>
{/if}

<style>
	.page-header { margin-bottom: 1.5rem; }
	.page-header h1 { font-size: 1.5rem; font-weight: 600; }

	.error {
		background: rgba(255,60,60,0.1);
		border: 1px solid rgba(255,60,60,0.3);
		color: #ff6b6b;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.create-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}
	.create-form input {
		flex: 1;
		padding: 0.6rem 0.8rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255,255,255,0.12);
		background: rgba(255,255,255,0.05);
		color: #fff;
		font-size: 0.9rem;
	}
	.create-form button {
		padding: 0.6rem 1rem;
		border-radius: 0.5rem;
		background: #ff0000;
		color: #fff;
		border: none;
		cursor: pointer;
		font-size: 0.85rem;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.create-form button:hover { opacity: 0.9; }

	.cs-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.cs-card {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.75rem;
		padding: 1.25rem;
	}

	.cs-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.cs-info h3 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: #fff;
	}
	.cs-meta {
		font-size: 0.75rem;
		color: rgba(255,255,255,0.35);
		font-family: monospace;
	}

	.cs-actions {
		display: flex;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.cs-preview {
		font-size: 0.85rem;
		color: rgba(255,255,255,0.5);
		margin-top: 0.75rem;
		line-height: 1.5;
	}
	.cs-preview.empty {
		font-style: italic;
		color: rgba(255,255,255,0.25);
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.edit-form input, .edit-form textarea {
		padding: 0.6rem 0.8rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255,255,255,0.15);
		background: rgba(255,255,255,0.06);
		color: #fff;
		font-size: 0.9rem;
		font-family: inherit;
	}
	.edit-form textarea {
		resize: vertical;
		min-height: 6rem;
	}
	.edit-actions {
		display: flex;
		gap: 0.5rem;
	}
	.btn-save {
		padding: 0.5rem 1rem;
		background: #ff0000;
		color: #fff;
		border: none;
		border-radius: 0.4rem;
		cursor: pointer;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.btn-save:hover { opacity: 0.9; }
	.btn-cancel {
		padding: 0.5rem 1rem;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
		border: none;
		border-radius: 0.4rem;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.btn-cancel:hover { color: #fff; background: rgba(255,255,255,0.12); }

	.inline-form { display: inline; }

	.btn-sm {
		width: 28px;
		height: 28px;
		border-radius: 0.35rem;
		border: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		transition: background 0.15s;
	}
	.btn-sm.edit {
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
	}
	.btn-sm.edit:hover { background: rgba(255,255,255,0.14); color: #fff; }
	.btn-sm.delete {
		background: rgba(255,60,60,0.1);
		color: rgba(255,60,60,0.6);
	}
	.btn-sm.delete:hover { background: rgba(255,60,60,0.2); color: #ff4444; }

	.empty-state {
		color: rgba(255,255,255,0.35);
		text-align: center;
		margin-top: 2rem;
	}
</style>
