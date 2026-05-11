<script>
	import { enhance } from '$app/forms';
	let { data } = $props();

	let filterSection = $state('all');

	const MEDIA_ICONS = {
		image: 'fa-image',
		carousel: 'fa-images',
		video: 'fa-film',
		youtube: 'fa-brands fa-youtube'
	};

	let filtered = $derived(
		filterSection === 'all'
			? data.items
			: data.items.filter(i => String(i.sectionId) === filterSection)
	);
</script>

<div class="header">
	<h1>Discovery Items</h1>
	<div class="header-actions">
		<select bind:value={filterSection} class="filter-select">
			<option value="all">All sections</option>
			{#each data.sections as s}
				<option value={String(s.id)}>{s.name}</option>
			{/each}
		</select>
		<a href="/admin/discovery/new" class="btn-cta">
			<i class="fa-solid fa-plus"></i> New Item
		</a>
	</div>
</div>

{#if filtered.length === 0}
	<p class="empty">No items{filterSection !== 'all' ? ' in this section' : ''}.</p>
{:else}
	<div class="item-list">
		{#each filtered as item (item.id)}
			<div class="item-card">
				{#if item.thumbnailUrl}
					<img
						src={item.thumbnailUrl}
						alt={item.title}
						class="item-thumb"
					/>
				{:else if item.youtubeId}
					<img
						src="https://img.youtube.com/vi/{item.youtubeId}/mqdefault.jpg"
						alt={item.title}
						class="item-thumb"
					/>
				{:else}
					<div class="item-thumb thumb-placeholder">
						<i class="fa-solid {MEDIA_ICONS[item.mediaType] ?? 'fa-file'}"></i>
					</div>
				{/if}
				<div class="item-info">
					<h3>{item.title}</h3>
					<div class="item-meta">
						{#if item.section}<span class="meta-section">{item.section.name}</span>{/if}
						<span class="meta-type">
							<i class="fa-solid {MEDIA_ICONS[item.mediaType] ?? 'fa-file'}"></i>
							{item.mediaType}
						</span>
					</div>
				</div>
				<div class="item-actions">
					<a href="/admin/discovery/{item.id}/edit" class="action-btn" aria-label="Edit">
						<i class="fa-solid fa-pen"></i>
					</a>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={item.id} />
						<button
							type="submit"
							class="action-btn delete"
							aria-label="Delete"
							onclick={(e) => { if (!confirm('Delete this item?')) e.preventDefault(); }}
						>
							<i class="fa-solid fa-trash"></i>
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.header-actions { display: flex; gap: 0.5rem; align-items: center; }
	.filter-select {
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.empty { color: rgba(255,255,255,0.5); }
	.item-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.item-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
	}
	.item-thumb {
		width: 72px;
		height: 48px;
		object-fit: cover;
		border-radius: 0.35rem;
		flex-shrink: 0;
		background: rgba(255,255,255,0.06);
	}
	.thumb-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255,255,255,0.3);
		font-size: 1.2rem;
	}
	.item-info { flex: 1; }
	.item-info h3 { font-size: 0.95rem; font-weight: 600; margin: 0 0 0.3rem; }
	.item-meta { display: flex; gap: 0.75rem; }
	.meta-section, .meta-type {
		font-size: 0.8rem;
		color: rgba(255,255,255,0.45);
	}
	.item-actions { display: flex; gap: 0.35rem; }
	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 0.35rem;
		background: rgba(255,255,255,0.06);
		border: none;
		color: rgba(255,255,255,0.5);
		cursor: pointer;
		text-decoration: none;
		font-size: 0.85rem;
		transition: all 0.15s;
	}
	.action-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
	.action-btn.delete:hover { background: rgba(255,50,50,0.2); color: #ff4444; }
</style>
