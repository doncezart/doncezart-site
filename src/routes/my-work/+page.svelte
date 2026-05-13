<script>
    import CategoryFilter from '$lib/components/CategoryFilter.svelte';
    import GalleryGrid from '$lib/components/GalleryGrid.svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    let { data } = $props();

    let activeCategory = $state('all');
    let activeSubcategory = $state('all');
    let currentPage = $state(1);

    const PAGE_SIZE = 24;

    let allItems = $derived(data.artworks.map(a => ({ ...a })));

    let filteredItems = $derived.by(() => {
        let items = allItems;
        if (activeCategory !== 'all') items = items.filter(i => i.category === activeCategory);
        if (activeSubcategory !== 'all') items = items.filter(i => i.subcategory === activeSubcategory);
        return items;
    });

    let totalPages = $derived(Math.ceil(filteredItems.length / PAGE_SIZE) || 1);

    let pageItems = $derived(filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

    // Reset page when filters change
    $effect(() => {
        activeCategory;
        activeSubcategory;
        currentPage = 1;
    });

    let lightboxItem = $state(null);
    let carouselIndex = $state(0);
    let baSliderPos = $state(50);
    let baDragging = $state(false);
    let baReady = $state(false);

    function handleItemClick(item) {
        window.umami?.track('artwork-open', { title: item.title, category: item.category, mode: item.displayMode, hasCaseStudy: item.hasCaseStudy });
        if (item.hasCaseStudy) {
            window.location.href = `/work/${item.slug}`;
        } else {
            lightboxItem = item;
            carouselIndex = 0;
            baSliderPos = 50;
            baReady = false;
        }
    }

    function closeLightbox() {
        lightboxItem = null;
        baDragging = false;
    }

    function carouselPrev() {
        if (!lightboxItem) return;
        if (carouselIndex > 0) carouselIndex--;
    }

    function carouselNext() {
        if (!lightboxItem) return;
        if (carouselIndex < lightboxItem.images.length - 1) carouselIndex++;
    }

    function handleBaPointerDown(e) {
        e.currentTarget.setPointerCapture(e.pointerId);
        baDragging = true;
    }

    function handleBaPointerMove(e) {
        if (!baDragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        baSliderPos = (x / rect.width) * 100;
    }

    function handleBaPointerUp() {
        baDragging = false;
    }

    function prevPage() {
        if (currentPage > 1) {
            currentPage--;
            window.umami?.track('my-work-paginate', { direction: 'prev', page: currentPage });
        }
    }

    function nextPage() {
        if (currentPage < totalPages) {
            currentPage++;
            window.umami?.track('my-work-paginate', { direction: 'next', page: currentPage });
        }
    }

    function handleKeydown(e) {
        if (!lightboxItem) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') carouselPrev();
        if (e.key === 'ArrowRight') carouselNext();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<PageHeader title="My Work" subtitle="A full collection of my artworks." />

<div class="controls">
    <CategoryFilter
        categories={data.categoryFilters}
        subcategories={data.subcategoryFilters}
        bind:activeCategory
        bind:activeSubcategory
    />
</div>

<div class="gallery-outer">
    <GalleryGrid items={pageItems} columns={4} showAll={true} onItemClick={handleItemClick} />
</div>

{#if totalPages > 1}
    <div class="pagination">
        <button
            class="page-btn"
            disabled={currentPage === 1}
            onclick={prevPage}
            aria-label="Previous page"
        >
            &larr; Previous
        </button>
        <span class="page-indicator">Page {currentPage} of {totalPages}</span>
        <button
            class="page-btn"
            disabled={currentPage === totalPages}
            onclick={nextPage}
            aria-label="Next page"
        >
            Next &rarr;
        </button>
    </div>
{/if}

<!-- Lightbox popup -->
{#if lightboxItem}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div class="lightbox-overlay" onclick={closeLightbox} role="dialog" aria-modal="true" aria-label="Image lightbox">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
            <button class="lightbox-close" onclick={closeLightbox} aria-label="Close lightbox">
                <i class="fa-solid fa-xmark"></i>
            </button>

            {#if lightboxItem.displayMode === 'carousel' && lightboxItem.images.length > 1}
                <!-- Preload all carousel images to eliminate switching lag -->
                {#each lightboxItem.images as imgSrc}
                    <img src={imgSrc} loading="eager" aria-hidden="true" style="display:none;position:absolute;width:0;height:0" alt="" />
                {/each}
                {@const n = lightboxItem.images.length}
                <div class="carousel-outer">
                    <img
                        src={lightboxItem.images[carouselIndex]}
                        alt="{lightboxItem.alt} ({carouselIndex + 1}/{n})"
                        class="carousel-img"
                        draggable="false"
                    />
                    <button
                        class="carousel-btn carousel-btn-prev"
                        onclick={carouselPrev}
                        disabled={carouselIndex === 0}
                        aria-label="Previous image"
                    ><i class="fa-solid fa-chevron-left"></i></button>
                    <button
                        class="carousel-btn carousel-btn-next"
                        onclick={carouselNext}
                        disabled={carouselIndex === n - 1}
                        aria-label="Next image"
                    ><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="carousel-dots">
                    {#each lightboxItem.images as _, i}
                        <button
                            class="dot"
                            class:active={i === carouselIndex}
                            onclick={() => (carouselIndex = i)}
                            aria-label="Go to image {i + 1}"
                        ></button>
                    {/each}
                </div>

            {:else if lightboxItem.displayMode === 'before-after' && lightboxItem.images.length >= 2}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="ba-container"
                    onpointerdown={handleBaPointerDown}
                    onpointermove={handleBaPointerMove}
                    onpointerup={handleBaPointerUp}
                    onpointercancel={handleBaPointerUp}
                >
                    <img src={lightboxItem.images[1]} alt="" class="ba-sizer" aria-hidden="true" draggable="false" />
                    <img src={lightboxItem.images[1]} alt="{lightboxItem.alt} (after)" class="ba-img ba-after-img" draggable="false"
                        onload={() => { if (baReady === 'before') baReady = true; else baReady = 'after'; }} />
                    <img src={lightboxItem.images[0]} alt="{lightboxItem.alt} (before)" class="ba-img ba-before-img"
                        style="clip-path: inset(0 {100 - baSliderPos}% 0 0)" draggable="false"
                        onload={() => { if (baReady === 'after') baReady = true; else baReady = 'before'; }} />
                    {#if baReady !== true}
                        <div class="ba-placeholder" style="background-image: url('{lightboxItem.src}')"></div>
                    {/if}
                    <div class="ba-slider" style="left: {baSliderPos}%">
                        <div class="ba-handle"><i class="fa-solid fa-grip-lines-vertical"></i></div>
                    </div>
                    <span class="ba-label ba-label-before">Before</span>
                    <span class="ba-label ba-label-after">After</span>
                </div>

            {:else}
                <img src={lightboxItem.fullSrc || lightboxItem.src} alt={lightboxItem.alt} />
            {/if}

            {#if lightboxItem.title}
                <h3>{lightboxItem.title}</h3>
            {/if}
            {#if lightboxItem.tags?.length}
                <div class="lightbox-tags">
                    {#each lightboxItem.tags as t}
                        <span class="lightbox-tag">{t.name}</span>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .gallery-outer {
        padding: 0 var(--container-pad) var(--space-2xl);
    }

    .controls {
        padding: 0 var(--container-pad);
        max-width: var(--container-max);
        margin: 0 auto;
    }

    .count-row {
        padding: var(--space-sm) 0 var(--space-md);
    }

    .count-label {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
    }

    .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-xl);
        padding: var(--space-2xl) var(--space-xl);
        max-width: 1400px;
        margin: 0 auto;
    }

    .page-btn {
        background: transparent;
        border: var(--border);
        color: var(--color-text-primary);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        padding: var(--space-sm) var(--space-lg);
        cursor: pointer;
        transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
    }

    .page-btn:hover:not(:disabled) {
        border-color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.05);
    }

    .page-btn:disabled {
        color: var(--color-text-secondary);
        opacity: 0.4;
        cursor: not-allowed;
    }

    .page-indicator {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        min-width: 8rem;
        text-align: center;
    }

    @media (max-width: 666px) {
        .pagination {
            gap: var(--space-md);
        }
    }

    /* Lightbox */
    .lightbox-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.85);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }
    .lightbox-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
        text-align: center;
        overflow: visible;
    }
    .lightbox-content img {
        max-width: 100%;
        max-height: 80vh;
        border-radius: 0.5rem;
    }
    .lightbox-content h3 {
        margin-top: 1rem;
    }
    .lightbox-close {
        position: absolute;
        top: -1rem;
        right: -1rem;
        background: rgba(0,0,0,0.7);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }
    .lightbox-tags {
        display: flex;
        gap: 0.3rem;
        justify-content: center;
        margin-top: 0.5rem;
    }
    .lightbox-tag {
        font-size: 0.75rem;
        padding: 0.15rem 0.5rem;
        border-radius: 1rem;
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.7);
    }

    /* Carousel */
    .carousel-outer {
        position: relative;
        width: min(90vw, 900px);
    }
    .carousel-img {
        display: block;
        width: 100%;
        max-height: 70vh;
        object-fit: contain;
    }
    .carousel-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0,0,0,0.55);
        border: 1px solid rgba(255,255,255,0.15);
        color: #fff;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
        z-index: 2;
    }
    .carousel-btn:hover { background: rgba(0,0,0,0.85); }
    .carousel-btn:disabled { opacity: 0.25; cursor: default; pointer-events: none; }
    .carousel-btn-prev { left: -1.25rem; }
    .carousel-btn-next { right: -1.25rem; }
    .carousel-dots {
        display: flex;
        justify-content: center;
        gap: 0.4rem;
        margin-top: 1rem;
    }
    .dot {
        width: 8px; height: 8px; border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.4);
        background: transparent;
        cursor: pointer; padding: 0;
        transition: background 0.15s, border-color 0.15s;
    }
    .dot.active { background: #ff2222; border-color: #ff2222; }

    /* Before / After slider */
    .ba-container {
        position: relative;
        max-width: 100%;
        overflow: hidden;
        cursor: ew-resize;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
    }
    .ba-sizer {
        display: block;
        width: 100%;
        max-height: 75vh;
        object-fit: contain;
        visibility: hidden;
        pointer-events: none;
    }
    .ba-img {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        object-fit: contain;
        display: block;
    }
    .ba-slider {
        position: absolute;
        top: 0; bottom: 0;
        width: 3px;
        background: #fff;
        transform: translateX(-50%);
        z-index: 2;
        pointer-events: none;
    }
    .ba-handle {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 2.2rem; height: 2.2rem;
        border-radius: 50%;
        background: #fff; color: #333;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.75rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        pointer-events: none;
    }
    .ba-label {
        position: absolute;
        top: 0.75rem;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.2rem 0.5rem;
        background: rgba(0,0,0,0.6);
        color: #fff;
        pointer-events: none;
        z-index: 3;
    }
    .ba-label-before { left: 0.75rem; }
    .ba-label-after { right: 0.75rem; }
    .ba-placeholder {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        filter: blur(12px);
        transform: scale(1.05);
        z-index: 4;
        pointer-events: none;
    }
    .ba-placeholder::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
    }
</style>
