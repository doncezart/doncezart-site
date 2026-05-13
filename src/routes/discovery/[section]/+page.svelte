<script>
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import GalleryGrid from '$lib/components/GalleryGrid.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();

	let activeTag = $state('all');
	let modalItem = $state(null);
	let carouselIndex = $state(0);

	// Column count — slider left = big items (fewer cols), slider right = small items (more cols)
	// Default = COL_MAX (most columns = smallest items as requested)
	const COL_KEY = 'discovery-columns';
	const COL_MIN = 1;
	const COL_MAX = 6;
	let columns = $state(COL_MAX);
	let colMax = $state(COL_MAX);
	$effect.root(() => {
		if (typeof localStorage === 'undefined') return;
		const raw = localStorage.getItem(COL_KEY);
		if (raw !== null) {
			const stored = parseInt(raw, 10);
			if (stored >= COL_MIN && stored <= COL_MAX) columns = stored;
		} else {
			// No stored preference — default to 1 col on mobile, max on desktop
			columns = window.innerWidth <= 540 ? COL_MIN : COL_MAX;
		}
	});
	$effect.root(() => {
		if (typeof window === 'undefined') return;
		function update() {
			const mobile = window.innerWidth <= 540;
			colMax = mobile ? 3 : COL_MAX;
			if (columns > colMax) columns = colMax;
		}
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	});
	function setColumns(n) {
		columns = Math.min(n, colMax);
		if (typeof localStorage !== 'undefined') localStorage.setItem(COL_KEY, String(columns));
	}

	// Infinite scroll / pagination
	const LOAD_MODE_KEY = 'discovery-load-mode';
	const PER_PAGE_KEY = 'discovery-per-page';
	const BATCH = 24;
	let loadMode = $state('infinite');
	let perPage = $state(24);
	let page = $state(1);
	let visibleCount = $state(BATCH);
	let sentinel = $state(null);

	$effect.root(() => {
		if (typeof localStorage !== 'undefined') {
			const mode = localStorage.getItem(LOAD_MODE_KEY);
			if (mode === 'paginated' || mode === 'infinite') loadMode = mode;
			const pp = parseInt(localStorage.getItem(PER_PAGE_KEY) ?? '24', 10);
			if ([12, 24, 48, 96].includes(pp)) perPage = pp;
		}
	});

	// Reset on filter change
	$effect(() => {
		activeTag;
		page = 1;
		visibleCount = BATCH;
	});

	function setLoadMode(m) {
		loadMode = m;
		page = 1;
		visibleCount = BATCH;
		if (typeof localStorage !== 'undefined') localStorage.setItem(LOAD_MODE_KEY, m);
		window.umami?.track('discovery-load-mode', { mode: m, section: data.section.slug });
	}
	function setPerPage(n) {
		perPage = n;
		page = 1;
		if (typeof localStorage !== 'undefined') localStorage.setItem(PER_PAGE_KEY, String(n));
		window.umami?.track('discovery-per-page', { perPage: n, section: data.section.slug });
	}

	// IntersectionObserver sentinel for infinite scroll
	$effect(() => {
		if (!sentinel) return;
		const io = new IntersectionObserver(
			(entries) => { if (entries[0].isIntersecting) visibleCount += BATCH; },
			{ rootMargin: '300px' }
		);
		io.observe(sentinel);
		return () => io.disconnect();
	});

	const YOUTUBE_THUMB = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

	const VIDEO_EXT = /\.(mp4|webm|mov)$/i;
	let allGridItems = $derived(data.items.map(item => {
		const isVideoCarousel = item.mediaType === 'carousel' && VIDEO_EXT.test(item.imageUrl ?? '');
		return {
		id: item.id,
		src: item.thumbnailUrl
			?? (item.youtubeId ? YOUTUBE_THUMB(item.youtubeId) : null)
			?? (isVideoCarousel ? null : item.imageUrl)
			?? '',
		videoSrc: item.mediaType === 'video' && !item.thumbnailUrl ? item.imageUrl
			: isVideoCarousel && !item.thumbnailUrl ? (item.images?.[0] ?? item.imageUrl)
			: null,
		previewUrl: item.previewUrl ?? null,
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
		};
	}));

	let filteredItems = $derived.by(() => {
		let items = allGridItems;
		if (activeTag !== 'all') {
			items = items.filter(i => i._discovery.tags.some(t => t.slug === activeTag));
		}
		return items;
	});

	let displayedItems = $derived.by(() => {
		if (loadMode === 'paginated') {
			return filteredItems.slice((page - 1) * perPage, page * perPage);
		}
		return filteredItems.slice(0, visibleCount);
	});
	let totalPages = $derived(Math.ceil(filteredItems.length / perPage));
	let hasMore = $derived(loadMode === 'infinite' && visibleCount < filteredItems.length);

	let tagPills = $derived([
		{ slug: 'all', name: 'All' },
		...data.allSectionTags
	]);

	function openModal(gridItem) {
		modalItem = gridItem._discovery;
		carouselIndex = 0;
		if (typeof history !== 'undefined') {
			history.replaceState({ modalId: gridItem.id }, '', `?item=${gridItem.id}`);
		}
		window.umami?.track('discovery-item-open', {
			title: gridItem.title,
			section: data.section.slug,
			mediaType: gridItem._discovery.mediaType,
			itemId: gridItem.id
		});
	}

	function closeModal() {
		modalItem = null;
		if (typeof history !== 'undefined') {
			history.replaceState(null, '', window.location.pathname);
		}
		window.umami?.track('discovery-item-close', { section: data.section.slug });
	}

	// Open modal if ?item= is in the URL on page load
	$effect.root(() => {
		if (typeof window === 'undefined') return;
		const id = new URL(window.location.href).searchParams.get('item');
		if (!id) return;
		const found = allGridItems.find(i => String(i.id) === id);
		if (found) openModal(found);
	});

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

	// Lock body scroll when modal is open
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = modalItem ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	});
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
					onclick={() => {
						activeTag = t.slug;
						window.umami?.track('discovery-tag-filter', { tag: t.slug, section: data.section.slug });
					}}
				>
					{t.name}
				</button>
			{/each}
		</div>
		<div class="controls-right">
			<div class="col-slider" title="Grid size">
				<i class="fa-solid fa-grip" style="font-size:0.7rem;opacity:0.5"></i>
				<input
					type="range"
					min={COL_MIN}
					max={colMax}
					bind:value={columns}
					oninput={() => {
						columns = Math.min(columns, colMax);
						if (typeof localStorage !== 'undefined') localStorage.setItem(COL_KEY, String(columns));
						window.umami?.track('discovery-columns', { columns, section: data.section.slug });
					}}
					aria-label="Grid columns"
				/>
				<i class="fa-solid fa-grip" style="opacity:0.5"></i>
			</div>

		</div>
	</div>

	<div class="grid-container">
		<GalleryGrid
			items={displayedItems}
			columns={columns}
			showAll={true}
			onItemClick={openModal}
			enableHoverPreview={true}
		/>
	</div>
	{#if hasMore}
		<div bind:this={sentinel} class="sentinel" aria-hidden="true"></div>
	{:else if loadMode === 'infinite' && filteredItems.length > BATCH}
		<p class="all-loaded">All {filteredItems.length} items shown</p>
	{/if}
	{#if loadMode === 'paginated' && totalPages > 1}
		<div class="pagination">
			<button
				class="page-btn"
				disabled={page <= 1}
				onclick={() => { page--; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
				aria-label="Previous page"
			><i class="fa-solid fa-chevron-left"></i></button>
			<span class="page-info">{page} / {totalPages}</span>
			<button
				class="page-btn"
				disabled={page >= totalPages}
				onclick={() => { page++; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
				aria-label="Next page"
			><i class="fa-solid fa-chevron-right"></i></button>
		</div>
	{/if}
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
			<button class="modal-close" onclick={closeModal} aria-label="Close">
				<i class="fa-solid fa-xmark"></i>
			</button>

			<div class="modal-media">
				{#if modalItem.mediaType === 'image'}
					<img src={modalItem.imageUrl} alt={modalItem.title} />

				{:else if modalItem.mediaType === 'carousel'}
					<!-- Preload all non-video carousel frames -->
					{#each modalItem.images as imgSrc}
						{#if !VIDEO_EXT.test(imgSrc ?? '')}
							<img src={imgSrc} loading="eager" aria-hidden="true" style="display:none;position:absolute;width:0;height:0" alt="" />
						{/if}
					{/each}
					<div class="carousel-wrap">
					{#if VIDEO_EXT.test(modalItem.images[carouselIndex] ?? '')}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							src={modalItem.images[carouselIndex]}
							controls
							autoplay
							playsinline
							disablepictureinpicture
							controlslist="nopictureinpicture nodownload"
							class="carousel-video"
						></video>
					{:else}
							<img src={modalItem.images[carouselIndex]} alt="{modalItem.title} ({carouselIndex + 1}/{modalItem.images.length})" />
						{/if}
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
					<video
						src={modalItem.imageUrl}
						controls
						autoplay
						playsinline
						disablepictureinpicture
						controlslist="nopictureinpicture nodownload"
					></video>

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

				{#if modalItem.notes}
					<div class="modal-notes">
						<span class="modal-notes-label">Note:</span>
						<p>{modalItem.notes}</p>
					</div>
				{/if}

				{#if modalItem.creatorName}
					{@const relatedItems = (data.creatorItems[modalItem.creatorName] ?? []).filter(r => r.id !== modalItem.id).slice(0, 6)}
					{#if relatedItems.length > 0}
						<div class="modal-related">
							<span class="modal-related-label">More from {modalItem.creatorName}</span>
							<div class="modal-related-grid">
								{#each relatedItems as related}
									<button
									class="related-row"
									onclick={() => { carouselIndex = 0; modalItem = related; }}
									type="button"
									aria-label={related.title}
								>
									<div class="related-row-thumb">
									{#if related.previewUrl && VIDEO_EXT.test(related.previewUrl)}
										<!-- svelte-ignore a11y_media_has_caption -->
										<video src={related.previewUrl} muted playsinline preload="auto" disablepictureinpicture
											onloadeddata={(e) => { e.currentTarget.currentTime = 0.001; }}
											class="related-video-thumb"
										></video>
									{:else if related.previewUrl}
											<img src={related.previewUrl} alt={related.title} />
										{:else}
											<i class="fa-solid fa-image"></i>
										{/if}
									</div>
									<span class="related-row-title">{related.title}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				{/if}

				{#if modalItem.sourceUrl}
					{@const sourceDomain = (() => { try { const h = new URL(modalItem.sourceUrl).hostname.replace(/^www\./, ''); const parts = h.split('.'); return parts.length >= 2 ? parts[parts.length - 2] : h; } catch { return null; } })()}
					<div class="source-block">
						{#if sourceDomain}
							<span class="source-label">from: {sourceDomain}</span>
						{/if}
						<a
							href={modalItem.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="view-original"
						>
							<i class="fa-solid fa-arrow-up-right-from-square"></i>
							View Original
						</a>
					</div>
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
	.controls-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.col-slider {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-text-secondary);
	}
	.col-slider input[type="range"] {
		width: 80px;
		accent-color: var(--color-text-primary);
		cursor: pointer;
	}
	.mode-toggle { display: flex; gap: 0.25rem; }
	.per-page-select {
		padding: 0.35rem 0.5rem;
		background: transparent;
		border: var(--border);
		border-radius: var(--radius);
		color: var(--color-text-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.per-page-select option { background: #111; }
	.sentinel { height: 1px; margin: 2rem 0; }
	.all-loaded {
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		padding: var(--space-xl) var(--container-pad);
	}
	.pagination {
		display: flex; align-items: center; justify-content: center;
		gap: 1rem; padding: var(--space-2xl) var(--container-pad);
	}
	.page-btn {
		width: 36px; height: 36px; border-radius: 50%;
		border: var(--border); background: transparent;
		color: var(--color-text-secondary); cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		transition: all var(--transition-base); font-size: 0.8rem;
	}
	.page-btn:hover:not(:disabled) { border-color: var(--color-text-primary); color: var(--color-text-primary); }
	.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.page-info { color: var(--color-text-secondary); font-size: var(--text-sm); }
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
	.grid-container {
		padding: 0 var(--container-pad);
	}
	.empty-state {
		display: flex; flex-direction: column; align-items: center;
		gap: var(--space-xl); text-align: center;
		padding: var(--space-4xl) var(--container-pad);
	}
	.empty-state p { color: var(--color-text-secondary); }

	.modal-overlay {
		position: fixed; inset: 0; z-index: 1000;
		background: rgba(0,0,0,0.88);
		display: flex; align-items: center; justify-content: center;
		padding: 1rem;
	}
	.modal-content {
		position: relative;
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
	.modal-media video {
		max-height: 85vh;
		max-width: 100%;
		width: auto;
		height: auto;
		display: block;
		border: none;
		margin: auto;
	}
	.modal-media:has(video) {
		background: #0a0a0a;
	}
	/* Video modal: flex row, info fixed width, media fills the rest. Hard cap at 96vw total. */
	.modal-content:has(video) {
		width: auto;
		max-width: 96vw;
	}
	.modal-content:has(video) .modal-media {
		flex: 1 1 auto;
		min-width: 0;
		max-height: 90vh;
		overflow: hidden;
	}
	.modal-content:has(video) .modal-info {
		flex: 0 0 260px;
		width: 260px;
		min-width: 0;
		max-height: 90vh;
		overflow-y: auto;
	}
	.modal-media iframe {
		width: 100%; height: 100%;
		border: none;
		display: block;
	}
	.carousel-wrap { position: relative; width: calc(100% - 2.5rem); height: 100%; display: flex; align-items: center; justify-content: center; }
	.carousel-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
	.carousel-video { max-width: 100%; max-height: 100%; display: block; }
	.carousel-arrow {
		position: absolute; top: 50%; transform: translateY(-50%);
		background: rgba(0,0,0,0.6); border: none; color: #fff;
		width: 40px; height: 40px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; font-size: 0.9rem;
		transition: background 0.15s;
	}
	.carousel-arrow:hover { background: rgba(0,0,0,0.9); }
	.carousel-arrow.prev { left: -1.25rem; }
	.carousel-arrow.next { right: -1.25rem; }
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
		position: absolute; top: var(--space-md); right: var(--space-md); z-index: 10;
		background: rgba(0,0,0,0.5);
		border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7);
		width: 32px; height: 32px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; font-size: 0.9rem;
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
		transition: all 0.15s;
	}
	.modal-close:hover { background: rgba(0,0,0,0.8); color: #fff; }
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
	.modal-notes {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.modal-notes-label {
		font-family: var(--font-body);
		font-size: var(--text-xs);
		color: var(--color-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.modal-notes p {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0;
	}
	.modal-related {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.modal-related-label {
		font-family: var(--font-body);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.modal-related-grid {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.related-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		width: 100%;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.4rem;
		padding: 0.4rem;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
		text-align: left;
	}
	.related-row:hover { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.07); }
	.related-row-thumb {
		flex: 0 0 52px;
		height: 52px;
		border-radius: 0.25rem;
		overflow: hidden;
		background: #111;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255,255,255,0.3);
		font-size: 1.2rem;
	}
	.related-row-thumb img, .related-video-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
	.related-row-title {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.modal-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.tag-badge {
		padding: 0.35rem 0.9rem;
		border: var(--border);
		border-radius: 999px;
		font-family: var(--font-body);
		font-size: var(--text-sm);
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
	.source-block {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
		margin-top: auto;
	}
	.source-label {
		font-family: var(--font-body);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		letter-spacing: 0.02em;
		text-transform: lowercase;
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
		align-self: flex-start;
		white-space: nowrap;
	}
	.view-original:hover { background: rgba(255,255,255,0.07); }

	@media (max-width: 768px) {
		.modal-overlay { align-items: flex-end; padding: 0; }
		.modal-content {
			flex-direction: column;
			width: 100%;
			max-width: 100%;
			max-height: 100dvh;
			height: 100dvh;
			border-radius: 0;
			overflow-y: auto;
			overflow-x: hidden;
		}
		/* Reset desktop video overrides for mobile */
		.modal-content:has(video) {
			width: 100%;
			max-width: 100%;
		}
		.modal-content:has(video) .modal-media,
		.modal-media {
			flex: 0 0 auto;
		}
		.modal-content:has(video) .modal-info {
			flex: 0 0 auto;
			width: auto;
		}
		.modal-media img {
			width: 100%;
			height: auto;
			max-height: 75dvh;
			object-fit: contain;
		}
		.modal-media video {
			width: 100%;
			height: auto;
			max-height: 75dvh;
			max-width: 100%;
		}
		.modal-info {
			flex: 0 0 auto;
			max-height: none;
			overflow-y: visible;
			padding-bottom: var(--space-xl);
		}
		.source-block { margin-top: var(--space-md); }
	}
</style>
