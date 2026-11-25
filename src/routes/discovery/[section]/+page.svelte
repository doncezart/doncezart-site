<script>
	import Seo from '$lib/components/Seo.svelte';
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

	// The page slot is its own stacking context under the fixed nav, so the
	// viewer moves to <body> to sit above the nav and footer.
	function portal(node) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	// Lock body scroll when modal is open
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = modalItem ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<Seo title="{data.section.name} | Discovery" description={data.section.description ?? ''} />

<PageHeader eyebrow="Discovery library" title={data.section.name} subtitle={data.section.description ?? ''} />

<div class="lib-wrap">
{#if data.items.length > 0}
	<div class="controls reveal" style="--d: 3">
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
			<span class="item-count">{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}</span>
			<div class="col-slider" title="Grid size" style="--fill: {colMax > COL_MIN ? ((columns - COL_MIN) / (colMax - COL_MIN)) * 100 : 0}%">
				<i class="fa-solid fa-square" aria-hidden="true"></i>
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
				<i class="fa-solid fa-grip" aria-hidden="true"></i>
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
		<span class="empty-mark"><i class="fa-solid fa-film"></i></span>
		<p>No items in this section yet. Check back soon.</p>
		<Button href="/discovery" variant="outline">Back to Discovery</Button>
	</div>
{/if}
</div>

{#if modalItem}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		use:portal
		class="modal-overlay"
		onclick={closeModal}
		role="dialog"
		aria-modal="true"
		aria-label="{modalItem.title}, full view"
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
	.lib-wrap {
		max-width: 1500px;
		margin: 0 auto;
		padding: 0 clamp(1.25rem, 4vw, 3rem) clamp(3rem, 8vh, 5rem);
	}

	/* ── Toolbar: tag chips left, count + size slider right ── */
	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}
	.controls-right {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		flex-wrap: wrap;
	}
	.item-count {
		font-family: var(--font-display);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
		white-space: nowrap;
	}
	.col-slider {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		height: 2.25rem;
		padding: 0 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		background: rgba(14, 14, 14, 0.55);
		backdrop-filter: blur(28px) saturate(140%);
		-webkit-backdrop-filter: blur(28px) saturate(140%);
		color: rgba(255, 255, 255, 0.5);
	}
	.col-slider i:first-child { font-size: 0.75rem; }
	.col-slider i:last-child { font-size: 0.72rem; }
	.col-slider input[type="range"] {
		-webkit-appearance: none;
		appearance: none;
		width: 96px;
		height: 3px;
		margin: 0;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--accent, #ff2b1f) var(--fill, 100%), rgba(255, 255, 255, 0.16) var(--fill, 100%));
		cursor: pointer;
		outline: none;
	}
	.col-slider input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #fff;
		border: 3px solid var(--accent, #ff2b1f);
		box-shadow: 0 0 0 4px rgba(255, 43, 31, 0.18);
		transition: transform 0.15s;
	}
	.col-slider input[type="range"]::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #fff;
		border: 3px solid var(--accent, #ff2b1f);
		box-shadow: 0 0 0 4px rgba(255, 43, 31, 0.18);
	}
	.col-slider input[type="range"]:hover::-webkit-slider-thumb { transform: scale(1.15); }
	.col-slider input[type="range"]:focus-visible { box-shadow: 0 0 0 3px rgba(255, 43, 31, 0.35); }

	.sentinel { height: 1px; margin: 2rem 0; }
	.all-loaded {
		text-align: center;
		font-family: var(--font-display);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
		padding: 2.5rem 0 0;
		margin: 0;
	}
	.pagination {
		display: flex; align-items: center; justify-content: center;
		gap: 1rem; padding: 2.5rem 0 0;
	}
	.page-btn {
		width: 2.5rem; height: 2.5rem; border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(14, 14, 14, 0.55);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		color: rgba(255, 255, 255, 0.75); cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		transition: border-color 0.2s, color 0.2s, background 0.2s; font-size: 0.8rem;
	}
	.page-btn:hover:not(:disabled) { border-color: rgba(255, 43, 31, 0.55); background: rgba(255, 43, 31, 0.16); color: #fff; }
	.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.page-info { font-family: var(--font-display); color: rgba(255, 255, 255, 0.64); font-size: 0.85rem; letter-spacing: 0.08em; }

	/* Tag chips (same as the contact page's). */
	.tag-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.tag-pill {
		padding: 0.5rem 1rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(14, 14, 14, 0.4);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		color: rgba(255, 255, 255, 0.7);
		font-family: var(--font-body);
		font-size: 0.85rem;
		font-weight: 500;
		line-height: 1.2;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s, color 0.2s;
	}
	.tag-pill:hover { border-color: rgba(255, 255, 255, 0.3); color: #fff; }
	.tag-pill.active {
		background: rgba(255, 43, 31, 0.16);
		border-color: rgba(255, 43, 31, 0.55);
		color: #fff;
	}
	.tag-pill:focus-visible { outline: 2px solid var(--accent, #ff2b1f); outline-offset: 2px; }

	.empty-state {
		display: flex; flex-direction: column; align-items: center;
		gap: 1.25rem; text-align: center;
		max-width: 34rem;
		margin: 0 auto;
		padding: 3rem 2rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		background: rgba(14, 14, 14, 0.55);
		backdrop-filter: blur(28px) saturate(140%);
		-webkit-backdrop-filter: blur(28px) saturate(140%);
	}
	.empty-mark {
		display: flex; align-items: center; justify-content: center;
		width: 3rem; height: 3rem; border-radius: 50%;
		background: rgba(255, 43, 31, 0.16);
		border: 1px solid rgba(255, 43, 31, 0.55);
		color: #fff;
		font-size: 1rem;
	}
	.empty-state p { margin: 0; color: var(--muted, rgba(255, 255, 255, 0.68)); }

	/* ── Viewer ── */
	.modal-overlay {
		position: fixed; inset: 0; z-index: 1000;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		display: flex; align-items: center; justify-content: center;
		padding: 1rem;
	}
	.modal-content {
		position: relative;
		display: flex;
		width: min(92vw, 1100px);
		max-height: 90vh;
		background: rgba(14, 14, 14, 0.72);
		backdrop-filter: blur(28px) saturate(140%);
		-webkit-backdrop-filter: blur(28px) saturate(140%);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
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
		background: #000;
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
		flex: 0 0 280px;
		width: 280px;
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
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.16);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: #fff;
		width: 40px; height: 40px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; font-size: 0.85rem;
		transition: background 0.2s, border-color 0.2s;
	}
	.carousel-arrow:hover { background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }
	.carousel-arrow.prev { left: -1.25rem; }
	.carousel-arrow.next { right: -1.25rem; }
	.carousel-dots {
		display: flex; gap: 0.4rem;
		padding: 0.75rem 0;
		position: absolute; bottom: 0; left: 0; right: 0;
		justify-content: center;
	}
	.dot {
		width: 6px; height: 6px; border-radius: 999px;
		background: rgba(255, 255, 255, 0.3);
		border: none; cursor: pointer; padding: 0;
		transition: background 0.2s, width 0.2s;
	}
	.dot.active { background: var(--accent, #ff2b1f); width: 16px; }

	.modal-info {
		flex: 0 0 35%;
		display: flex; flex-direction: column;
		gap: 1rem;
		padding: 1.75rem 1.5rem;
		overflow-y: auto;
		position: relative;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
	}
	.modal-close {
		position: absolute; top: 0.9rem; right: 0.9rem; z-index: 10;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.16); color: rgba(255, 255, 255, 0.8);
		width: 36px; height: 36px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; font-size: 0.95rem;
		-webkit-backdrop-filter: blur(10px);
		backdrop-filter: blur(10px);
		transition: background 0.2s, border-color 0.2s, color 0.2s;
	}
	.modal-close:hover { background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); color: #fff; }
	.modal-title {
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.15;
		color: #fff;
		margin: 0;
		padding-right: 2.25rem;
	}
	.modal-desc {
		font-family: var(--font-body);
		font-size: 0.9rem;
		color: var(--muted, rgba(255, 255, 255, 0.68));
		line-height: 1.6;
		margin: 0;
	}
	.modal-notes {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem 0.9rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
	.modal-notes-label,
	.modal-related-label {
		font-family: var(--font-display);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
	}
	.modal-notes p {
		font-family: var(--font-body);
		font-size: 0.88rem;
		color: var(--muted, rgba(255, 255, 255, 0.68));
		line-height: 1.6;
		margin: 0;
	}
	.modal-related {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.modal-related-grid {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.related-row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 0.4rem;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
		text-align: left;
	}
	.related-row:hover { border-color: rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.06); }
	.related-row-thumb {
		flex: 0 0 52px;
		height: 52px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--w-raised, #1b1b1b);
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.3);
		font-size: 1.2rem;
	}
	.related-row-thumb img, .related-video-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
	.related-row-title {
		font-family: var(--font-body);
		font-size: 0.85rem;
		color: #fff;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.modal-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.tag-badge {
		padding: 0.3rem 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		font-family: var(--font-body);
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.7);
	}
	.modal-creator {
		font-family: var(--font-body);
		font-size: 0.88rem;
		color: var(--muted, rgba(255, 255, 255, 0.68));
		margin: 0;
	}
	.modal-creator a {
		color: #fff;
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 43, 31, 0.6);
		transition: border-color 0.2s;
	}
	.modal-creator a:hover { border-color: var(--accent, #ff2b1f); }
	.source-block {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.45rem;
		margin-top: auto;
		padding-top: 0.5rem;
	}
	.source-label {
		font-family: var(--font-display);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
	}
	.view-original {
		display: inline-flex; align-items: center; gap: 0.55rem;
		padding: 0.7rem 1.15rem;
		border: 1px solid #fff;
		background: #fff;
		color: #000;
		text-decoration: none;
		font-family: var(--font-body);
		font-size: 0.85rem;
		font-weight: 600;
		border-radius: 4px;
		transition: background 0.2s, border-color 0.2s, color 0.2s;
		align-self: flex-start;
		white-space: nowrap;
	}
	.view-original i { font-size: 0.8em; }
	.view-original:hover { background: var(--accent, #ff2b1f); border-color: var(--accent, #ff2b1f); color: #fff; }

	@media (max-width: 768px) {
		.controls { align-items: flex-start; }
		.modal-overlay { align-items: flex-end; padding: 0; }
		.modal-content {
			flex-direction: column;
			width: 100%;
			max-width: 100%;
			max-height: 100vh;
			max-height: 100dvh;
			height: 100vh;
			height: 100dvh;
			border-radius: 0;
			border: none;
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
			max-height: 75vh;
			max-height: 75dvh;
			object-fit: contain;
		}
		.modal-media video {
			width: 100%;
			height: auto;
			max-height: 75vh;
			max-height: 75dvh;
			max-width: 100%;
		}
		.modal-info {
			flex: 0 0 auto;
			max-height: none;
			overflow-y: visible;
			padding-bottom: 2rem;
			border-left: none;
			border-top: 1px solid rgba(255, 255, 255, 0.08);
		}
		.source-block { margin-top: 0.75rem; }
	}
</style>
