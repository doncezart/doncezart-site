<script>
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import GalleryGrid from '$lib/components/GalleryGrid.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();

	let activeTag = $state('all');
	let sortOrder = $state('newest');
	let modalItem = $state(null);
	let carouselIndex = $state(0);

	const YOUTUBE_THUMB = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

	let allGridItems = $derived(data.items.map(item => ({
		id: item.id,
		src: item.thumbnailUrl
			?? (item.youtubeId ? YOUTUBE_THUMB(item.youtubeId) : null)
			?? item.imageUrl
			?? '',
		alt: item.title,
		title: item.title,
		category: item.mediaType === 'youtube' ? 'YouTube'
			: item.mediaType === 'video' ? 'Video'
			: null,
		displayMode: item.mediaType === 'carousel' ? 'carousel' : 'single',
		imageCount: item.mediaType === 'carousel' ? (item.images?.length || 1) : 1,
		hasCaseStudy: false,
		tags: item.tags,
		_discovery: item
	})));

	let filteredItems = $derived.by(() => {
		let items = allGridItems;
		if (activeTag !== 'all') {
			items = items.filter(i => i._discovery.tags.some(t => t.slug === activeTag));
		}
		if (sortOrder === 'oldest') {
			items = [...items].reverse();
		}
		return items;
	});

	let tagPills = $derived([
		{ slug: 'all', name: 'All' },
		...data.allSectionTags
	]);

	function openModal(gridItem) {
		modalItem = gridItem._discovery;
		carouselIndex = 0;
	}

	function closeModal() {
		modalItem = null;
	}

	function carouselPrev() {
		if (carouselIndex > 0) carouselIndex--;
	}
	function carouselNext() {
		if (modalItem && carouselIndex < modalItem.images.length - 1) carouselIndex++;
	}

	function handleKeydown(e) {
		if (!modalItem) return;
		if (e.key === 'Escape') closeModal();
		if (e.key === 'ArrowLeft') carouselPrev();
		if (e.key === 'ArrowRight') carouselNext();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{data.section.name} — Discovery — DONCEZART</title>
	<meta name="description" content={data.section.description ?? ''} />
</svelte:head>

<PageHeader title={data.section.name} subtitle={data.section.description ?? ''} />

{#if data.items.length > 0}
	<div class="controls">
		<div class="tag-pills">
			{#each tagPills as t}
				<button
					class="tag-pill"
					class:active={activeTag === t.slug}
					onclick={() => (activeTag = t.slug)}
				>
					{t.name}
				</button>
			{/each}
		</div>
		<div class="sort-toggle">
			<button
				class="sort-btn"
				class:active={sortOrder === 'newest'}
				onclick={() => (sortOrder = 'newest')}
			>Newest</button>
			<button
				class="sort-btn"
				class:active={sortOrder === 'oldest'}
				onclick={() => (sortOrder = 'oldest')}
			>Oldest</button>
		</div>
	</div>

	<GalleryGrid
		items={filteredItems}
		columns={4}
		showAll={true}
		onItemClick={openModal}
	/>
{:else}
	<div class="empty-state">
		<p>No items in this section yet. Check back soon.</p>
		<Button href="/discovery" variant="outline">Back to Discovery</Button>
	</div>
{/if}

{#if modalItem}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-overlay"
		onclick={closeModal}
		role="dialog"
		aria-modal="true"
		aria-label="{modalItem.title} — full view"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>

			<div class="modal-media">
				{#if modalItem.mediaType === 'image'}
					<img src={modalItem.imageUrl} alt={modalItem.title} />

				{:else if modalItem.mediaType === 'carousel'}
					<div class="carousel-wrap">
						<img src={modalItem.images[carouselIndex]} alt="{modalItem.title} ({carouselIndex + 1}/{modalItem.images.length})" />
						{#if carouselIndex > 0}
							<button class="carousel-arrow prev" onclick={carouselPrev} aria-label="Previous">
								<i class="fa-solid fa-chevron-left"></i>
							</button>
						{/if}
						{#if carouselIndex < modalItem.images.length - 1}
							<button class="carousel-arrow next" onclick={carouselNext} aria-label="Next">
								<i class="fa-solid fa-chevron-right"></i>
							</button>
						{/if}
					</div>
					<div class="carousel-dots">
						{#each modalItem.images as _, i}
							<button
								class="dot"
								class:active={i === carouselIndex}
								onclick={() => (carouselIndex = i)}
								aria-label="Go to frame {i + 1}"
							></button>
						{/each}
					</div>

				{:else if modalItem.mediaType === 'video'}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={modalItem.imageUrl} controls></video>

				{:else if modalItem.mediaType === 'youtube'}
					<iframe
						src="https://www.youtube-nocookie.com/embed/{modalItem.youtubeId}?rel=0&modestbranding=1"
						title={modalItem.title}
						frameborder="0"
						allowfullscreen
					></iframe>
				{/if}
			</div>

			<div class="modal-info">
				<button class="modal-close" onclick={closeModal} aria-label="Close">
					<i class="fa-solid fa-xmark"></i>
				</button>

				<h2 class="modal-title">{modalItem.title}</h2>

				{#if modalItem.description}
					<p class="modal-desc">{modalItem.description}</p>
				{/if}

				{#if modalItem.tags.length > 0}
					<div class="modal-tags">
						{#each modalItem.tags as t}
							<span class="tag-badge">{t.name}</span>
						{/each}
					</div>
				{/if}

				{#if modalItem.creatorName}
					<p class="modal-creator">
						By
						{#if modalItem.creatorUrl}
							<a href={modalItem.creatorUrl} target="_blank" rel="noopener noreferrer">
								{modalItem.creatorName}
							</a>
						{:else}
							{modalItem.creatorName}
						{/if}
					</p>
				{/if}

				{#if modalItem.sourceUrl}
					<a
						href={modalItem.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="view-original"
					>
						<i class="fa-solid fa-arrow-up-right-from-square"></i>
						View Original
					</a>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0 var(--container-pad);
		margin-bottom: var(--space-lg);
	}
	.tag-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.tag-pill {
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		border: var(--border);
		background: transparent;
		color: var(--color-text-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: all var(--transition-base);
	}
	.tag-pill:hover { border-color: var(--color-text-primary); color: var(--color-text-primary); }
	.tag-pill.active { background: var(--color-text-primary); color: var(--color-bg); border-color: var(--color-text-primary); }
	.sort-toggle { display: flex; gap: 0.25rem; }
	.sort-btn {
		padding: 0.35rem 0.75rem;
		border: var(--border);
		background: transparent;
		color: var(--color-text-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: all var(--transition-base);
	}
	.sort-btn:first-child { border-radius: var(--radius) 0 0 var(--radius); }
	.sort-btn:last-child { border-radius: 0 var(--radius) var(--radius) 0; }
	.sort-btn.active { background: var(--color-text-primary); color: var(--color-bg); border-color: var(--color-text-primary); }

	.empty-state {
		display: flex; flex-direction: column; align-items: center;
		gap: var(--space-xl); text-align: center; padding-bottom: var(--space-4xl);
	}
	.empty-state p { color: var(--color-text-secondary); }

	.modal-overlay {
		position: fixed; inset: 0; z-index: 1000;
		background: rgba(0,0,0,0.88);
		display: flex; align-items: center; justify-content: center;
		padding: 1rem;
	}
	.modal-content {
		display: flex;
		width: min(92vw, 1100px);
		max-height: 90vh;
		background: #111;
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.modal-media {
		flex: 0 0 65%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #000;
		position: relative;
		overflow: hidden;
	}
	.modal-media img {
		max-width: 100%; max-height: 100%;
		object-fit: contain;
		display: block;
	}
	.modal-media video, .modal-media iframe {
		width: 100%; height: 100%;
		border: none;
		display: block;
	}
	.carousel-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
	.carousel-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
	.carousel-arrow {
		position: absolute; top: 50%; transform: translateY(-50%);
		background: rgba(0,0,0,0.6); border: none; color: #fff;
		width: 40px; height: 40px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; font-size: 0.9rem;
		transition: background 0.15s;
	}
	.carousel-arrow:hover { background: rgba(0,0,0,0.9); }
	.carousel-arrow.prev { left: 0.75rem; }
	.carousel-arrow.next { right: 0.75rem; }
	.carousel-dots {
		display: flex; gap: 0.4rem;
		padding: 0.75rem 0;
		position: absolute; bottom: 0; left: 0; right: 0;
		justify-content: center;
	}
	.dot {
		width: 6px; height: 6px; border-radius: 50%;
		background: rgba(255,255,255,0.3);
		border: none; cursor: pointer; padding: 0;
		transition: background 0.15s;
	}
	.dot.active { background: #fff; }

	.modal-info {
		flex: 0 0 35%;
		display: flex; flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-xl) var(--space-xl);
		overflow-y: auto;
		position: relative;
	}
	.modal-close {
		position: absolute; top: var(--space-md); right: var(--space-md);
		background: rgba(255,255,255,0.08);
		border: none; color: rgba(255,255,255,0.6);
		width: 32px; height: 32px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; font-size: 0.9rem;
		transition: all 0.15s;
	}
	.modal-close:hover { background: rgba(255,255,255,0.15); color: #fff; }
	.modal-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
		padding-right: 2rem;
	}
	.modal-desc {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0;
	}
	.modal-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.tag-badge {
		padding: 0.2rem 0.6rem;
		border: var(--border);
		border-radius: 999px;
		font-family: var(--font-body);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
	}
	.modal-creator {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}
	.modal-creator a {
		color: var(--color-text-primary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.view-original {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.6rem 1.25rem;
		border: var(--border-solid);
		color: var(--color-text-primary);
		text-decoration: none;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		border-radius: var(--radius);
		transition: all var(--transition-base);
		margin-top: auto;
	}
	.view-original:hover { background: rgba(255,255,255,0.07); }

	@media (max-width: 768px) {
		.modal-content { flex-direction: column; max-height: 95vh; width: 100%; border-radius: 0.5rem; }
		.modal-media { flex: 0 0 55%; }
		.modal-info { flex: 1; }
	}
</style>
