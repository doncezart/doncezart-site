<script>
	import { enhance } from '$app/forms';
	let { data } = $props();

	let filterSection = $state('all');
	let viewMode = $state(
		typeof localStorage !== 'undefined' ? (localStorage.getItem('disc-admin-view') ?? 'list') : 'list'
	);

	$effect(() => {
		localStorage.setItem('disc-admin-view', viewMode);
	});

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

	function thumbSrc(item) {
		if (item.thumbnailUrl) return { type: 'img', src: item.thumbnailUrl };
		if (item.youtubeId) return { type: 'img', src: `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg` };
		if (item.imageUrl && item.mediaType === 'video') return { type: 'video', src: item.imageUrl };
		if (item.imageUrl) return { type: 'img', src: item.imageUrl };
		return null;
	}
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
		<div class="view-toggle">
			<button class="view-btn" class:active={viewMode === 'list'} onclick={() => viewMode = 'list'} aria-label="List view">
				<i class="fa-solid fa-list"></i>
			</button>
			<button class="view-btn" class:active={viewMode === 'mosaic'} onclick={() => viewMode = 'mosaic'} aria-label="Mosaic view">
				<i class="fa-solid fa-grip"></i>
			</button>
		</div>
		<a href="/admin/discovery/new" class="btn-cta">
			<i class="fa-solid fa-plus"></i> New Item
		</a>
	</div>
</div>

{#if filtered.length === 0}
	<p class="empty">No items{filterSection !== 'all' ? ' in this section' : ''}.</p>
{:else if viewMode === 'list'}
	<div class="artwork-list">
		{#each filtered as item (item.id)}
			{@const thumb = thumbSrc(item)}
			<div class="artwork-card" class:hidden-item={!item.visible}>
				{#if thumb?.type === 'video'}
					<video
						src={thumb.src}
						muted
						playsinline
						preload="metadata"
						class="artwork-thumb"
					></video>
				{:else if thumb?.type === 'img'}
					<img src={thumb.src} alt={item.title} class="artwork-thumb" />
				{:else}
					<div class="artwork-thumb thumb-placeholder">
						<i class="fa-solid {MEDIA_ICONS[item.mediaType] ?? 'fa-file'}"></i>
					</div>
				{/if}
				<div class="artwork-info">
					<h3>{item.title}</h3>
					<span class="meta">
						{#if item.section}{item.section.name} · {/if}{item.mediaType}
					</span>
					<div class="badge-row">
						{#if !item.visible}
							<span class="badge hidden-badge"><i class="fa-solid fa-eye-slash"></i> Hidden</span>
						{/if}
						{#if item.mediaType === 'video'}
							<span class="badge preview-badge" class:has-preview={!!item.previewUrl} title={item.previewUrl ? 'Preview GIF ready' : 'No preview GIF yet'}>
								<i class="fa-solid {item.previewUrl ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
								{item.previewUrl ? 'Preview' : 'No preview'}
							</span>
						{/if}
					</div>
				</div>
				<div class="artwork-actions">
					<form method="POST" action="?/toggleVisible" use:enhance>
						<input type="hidden" name="id" value={item.id} />
						<input type="hidden" name="visible" value={String(item.visible)} />
						<button
							type="submit"
							class="action-btn"
							class:dimmed={!item.visible}
							aria-label={item.visible ? 'Hide' : 'Show'}
							title={item.visible ? 'Hide from public' : 'Show on public site'}
						>
							<i class="fa-solid {item.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
						</button>
					</form>
					<a href="/admin/discovery/{item.id}/edit" class="action-btn" aria-label="Edit">
						<i class="fa-solid fa-pen"></i>
					</a>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={item.id} />
						<button
							type="submit"
							class="action-btn delete"
							aria-label="Delete"
							onclick={(e) => {
								if (!confirm(`Delete "${item.title}"? This will also remove the media file from the CDN and cannot be undone.`))
									e.preventDefault();
							}}
						>
							<i class="fa-solid fa-trash"></i>
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<!-- Mosaic grid -->
	<div class="mosaic-grid">
		{#each filtered as item (item.id)}
			{@const thumb = thumbSrc(item)}
			<a href="/admin/discovery/{item.id}/edit" class="mosaic-card" class:hidden-item={!item.visible} title={item.title}>
				<div class="mosaic-media">
					{#if thumb?.type === 'video'}
						<video
							src={thumb.src}
							muted
							playsinline
							preload="metadata"
							class="mosaic-thumb"
						></video>
					{:else if thumb?.type === 'img'}
						<img src={thumb.src} alt={item.title} class="mosaic-thumb" />
					{:else}
						<div class="mosaic-thumb mosaic-placeholder">
							<i class="fa-solid {MEDIA_ICONS[item.mediaType] ?? 'fa-file'}"></i>
						</div>
					{/if}
					{#if !item.visible}
						<span class="mosaic-badge hidden-badge"><i class="fa-solid fa-eye-slash"></i></span>
					{/if}
					{#if item.mediaType === 'video' && !item.previewUrl}
						<span class="mosaic-badge no-preview-badge" title="No preview GIF"><i class="fa-solid fa-circle-xmark"></i></span>
					{/if}
					<span class="mosaic-badge type-badge"><i class="fa-solid {MEDIA_ICONS[item.mediaType] ?? 'fa-file'}"></i></span>
				</div>
				<div class="mosaic-label">
					<span class="mosaic-title">{item.title}</span>
					{#if item.section}<span class="mosaic-section">{item.section.name}</span>{/if}
				</div>
			</a>
		{/each}
	</div>
{/if}

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.filter-select {
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-family: inherit;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.filter-select option { background: #1a1a1a; }

	.view-toggle {
		display: flex;
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		overflow: hidden;
	}
	.view-btn {
		background: transparent;
		border: none;
		color: rgba(255,255,255,0.4);
		padding: 0.55rem 0.75rem;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.15s;
	}
	.view-btn:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.06); }
	.view-btn.active { background: rgba(255,255,255,0.12); color: #fff; }

	.btn-cta {
		padding: 0.6rem 1.1rem; background: #ff0000; color: #fff;
		border: none; border-radius: 0.5rem; font-size: 0.9rem;
		font-weight: 600; font-family: inherit; cursor: pointer;
		text-decoration: none; display: inline-flex; align-items: center;
		gap: 0.4rem; transition: background 0.15s;
	}
	.btn-cta:hover { background: #e00000; }

	.empty { color: rgba(255,255,255,0.5); margin-top: 2rem; }

	/* ── List view ── */
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
		transition: opacity 0.15s;
	}
	.artwork-card.hidden-item { opacity: 0.45; }
	.artwork-thumb {
		width: 80px;
		height: 60px;
		object-fit: cover;
		border-radius: 0.4rem;
		flex-shrink: 0;
		background: rgba(255,255,255,0.06);
	}
	.thumb-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255,255,255,0.3);
		font-size: 1.4rem;
	}
	.artwork-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.artwork-info h3 { font-size: 1rem; margin: 0; }
	.meta { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
	.badge-row { display: flex; gap: 0.3rem; flex-wrap: wrap; }
	.badge {
		display: inline-flex; align-items: center; gap: 0.3rem;
		font-size: 0.7rem; padding: 0.15rem 0.5rem;
		border-radius: 1rem; width: fit-content;
	}
	.hidden-badge { background: rgba(255,153,0,0.12); color: #ffaa33; }
	.preview-badge { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); }
	.preview-badge.has-preview { background: rgba(34,197,94,0.1); color: #4ade80; }
	.artwork-actions { display: flex; gap: 0.5rem; align-items: center; }
	.action-btn {
		display: flex; align-items: center; justify-content: center;
		background: rgba(255,255,255,0.08); border: none;
		color: rgba(255,255,255,0.6);
		padding: 0.4rem 0.6rem; border-radius: 0.4rem;
		cursor: pointer; text-decoration: none; font-size: 0.85rem;
		transition: all 0.15s;
	}
	.action-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
	.action-btn.dimmed { color: rgba(255,153,0,0.6); }
	.action-btn.delete:hover { background: rgba(255,0,0,0.2); color: #ff4444; }

	/* ── Mosaic view ── */
	.mosaic-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
	.mosaic-card {
		display: flex;
		flex-direction: column;
		border-radius: 0.6rem;
		overflow: hidden;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		text-decoration: none;
		transition: border-color 0.15s, transform 0.15s;
	}
	.mosaic-card:hover { border-color: rgba(255,255,255,0.25); transform: translateY(-2px); }
	.mosaic-card.hidden-item { opacity: 0.5; }
	.mosaic-media {
		position: relative;
		aspect-ratio: 16 / 9;
		background: #000;
		overflow: hidden;
	}
	.mosaic-thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	video.mosaic-thumb { pointer-events: none; }
	.mosaic-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255,255,255,0.25);
		font-size: 2rem;
	}
	.mosaic-badge {
		position: absolute;
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border-radius: 0.3rem;
		line-height: 1.4;
	}
	.mosaic-badge.hidden-badge {
		top: 0.4rem; left: 0.4rem;
		background: rgba(255,153,0,0.85); color: #000;
	}
	.mosaic-badge.no-preview-badge {
		top: 0.4rem; right: 2rem;
		background: rgba(239,68,68,0.7); color: #fff;
	}
	.mosaic-badge.type-badge {
		bottom: 0.4rem; right: 0.4rem;
		background: rgba(0,0,0,0.6); color: rgba(255,255,255,0.8);
	}
	.mosaic-label {
		padding: 0.5rem 0.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.mosaic-title {
		font-size: 0.8rem;
		color: rgba(255,255,255,0.85);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mosaic-section { font-size: 0.7rem; color: rgba(255,255,255,0.35); }
</style>
