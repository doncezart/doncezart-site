<script>
	import { enhance } from '$app/forms';
	let { data } = $props();
</script>

<div class="header">
	<h1>Artworks</h1>
	<div class="header-actions">
		<a href="/admin/artworks/bulk" class="btn-secondary">
			<i class="fa-solid fa-layer-group"></i> Bulk Upload
		</a>
		<a href="/admin/artworks/new" class="btn-cta">
			<i class="fa-solid fa-plus"></i> Upload
		</a>
	</div>
</div>

{#if data.artworks.length === 0}
	<p class="empty">No artworks yet. Upload your first one.</p>
{:else}
	<div class="artwork-list">
		{#each data.artworks as item (item.id)}
			<div class="artwork-card">
				<img src={item.thumbnailUrl || item.imageUrl} alt={item.title} class="artwork-thumb" />
				<div class="artwork-info">
					<h3>{item.title}</h3>
					<span class="meta">
						{item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}
						{#if item.imageCount > 1}
							 · {item.imageCount} images
						{/if}
					</span>
					<div class="badge-row">
						{#if item.processed}
							<span class="badge processed"><i class="fa-solid fa-check"></i> Processed</span>
						{:else}
							<span class="badge unprocessed"><i class="fa-solid fa-clock"></i> Unprocessed</span>
						{/if}
						{#if item.displayMode !== 'single'}
							<span class="badge mode">{item.displayMode === 'carousel' ? 'Carousel' : 'Before/After'}</span>
						{/if}
						{#if item.hasCaseStudy}
							<span class="badge case-study">Case Study</span>
						{/if}
					</div>
					{#if item.tags.length}
						<div class="tags">
							{#each item.tags as t}
								<span class="tag">{t.name}</span>
							{/each}
						</div>
					{/if}
				</div>
				<div class="artwork-actions">
					<a href="/admin/artworks/{item.id}/edit" class="action-btn" aria-label="Edit">
						<i class="fa-solid fa-pen"></i>
					</a>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={item.id} />
					<button type="submit" class="action-btn delete" aria-label="Delete"
							onclick={(e) => { if (!confirm('Delete this artwork?')) e.preventDefault(); }}>
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
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0;
		background: none;
		border: none;
		color: rgba(255,255,255,0.5);
		font-family: 'Clash Display', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: color 0.15s;
	}
	.btn-secondary:hover { color: #fff; }
	.empty {
		color: rgba(255,255,255,0.5);
		margin-top: 2rem;
	}
	.artwork-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
	.artwork-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.75rem;
	}
	.artwork-thumb {
		width: 80px;
		height: 60px;
		object-fit: cover;
		border-radius: 0.4rem;
	}
	.artwork-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.artwork-info h3 {
		font-size: 1rem;
		margin: 0;
	}
	.meta {
		font-size: 0.8rem;
		color: rgba(255,255,255,0.4);
	}
	.badge {
		display: inline-block;
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
		border-radius: 1rem;
		width: fit-content;
	}
	.case-study {
		background: rgba(255,0,0,0.15);
		color: #ff6666;
	}
	.mode {
		background: rgba(80,160,255,0.12);
		color: #50a0ff;
	}
	.processed {
		background: rgba(0,200,100,0.12);
		color: #00c864;
	}
	.unprocessed {
		background: rgba(255,153,51,0.12);
		color: #ff9933;
	}
	.badge-row {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}
	.tags {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
		margin-top: 0.2rem;
	}
	.tag {
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		border-radius: 0.3rem;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
	}
	.artwork-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.action-btn {
		background: rgba(255,255,255,0.08);
		border: none;
		color: rgba(255,255,255,0.6);
		padding: 0.4rem 0.6rem;
		border-radius: 0.4rem;
		cursor: pointer;
		text-decoration: none;
		font-size: 0.85rem;
	}
	.action-btn:hover {
		background: rgba(255,255,255,0.15);
		color: #fff;
	}
	.action-btn.delete:hover {
		background: rgba(255,0,0,0.2);
		color: #ff4444;
	}
</style>
