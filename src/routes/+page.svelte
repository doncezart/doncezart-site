<script>
    import CategoryFilter from '$lib/components/CategoryFilter.svelte';
    import GalleryGrid from '$lib/components/GalleryGrid.svelte';

    let { data } = $props();

    let activeCategory = $state('all');
    let activeSubcategory = $state('all');
    let activeTag = $state('all');
    let lightboxItem = $state(null);
    let carouselIndex = $state(0);
    let baSliderPos = $state(50);
    let baDragging = $state(false);

    // Map DB artworks into gallery format
    let allItems = $derived(
        data.artworks.map(a => ({
            id: a.id,
            // For before-after, show the "after" image (index 1) in grid
            src: a.displayMode === 'before-after' && a.images.length >= 2 ? a.images[1] : a.imageUrl,
            fullSrc: a.imageUrl,
            alt: a.title,
            title: a.title,
            category: a.category,
            subcategory: a.subcategory ?? 'all',
            hasCaseStudy: a.hasCaseStudy,
            slug: a.slug,
            tags: a.tags,
            displayMode: a.displayMode,
            carouselDirection: a.carouselDirection,
            images: a.images,
            imageCount: a.imageCount
        }))
    );

    let filteredItems = $derived.by(() => {
        let items = allItems;
        if (activeCategory !== 'all') {
            items = items.filter(i => i.category === activeCategory);
        }
        if (activeSubcategory !== 'all') {
            items = items.filter(i => i.subcategory === activeSubcategory);
        }
        if (activeTag !== 'all') {
            items = items.filter(i => i.tags?.some(t => t.slug === activeTag));
        }
        return items;
    });

    let uniqueTags = $derived(
        data.allTags?.length
            ? [{ slug: 'all', name: 'All' }, ...data.allTags]
            : []
    );

    function handleItemClick(item) {
        if (item.hasCaseStudy) {
            window.location.href = `/work/${item.slug}`;
        } else {
            lightboxItem = item;
            carouselIndex = 0;
            baSliderPos = 50;
        }
    }

    function closeLightbox() {
        lightboxItem = null;
        baDragging = false;
    }

    function carouselPrev() {
        if (!lightboxItem) return;
        carouselIndex = (carouselIndex - 1 + lightboxItem.images.length) % lightboxItem.images.length;
    }

    function carouselNext() {
        if (!lightboxItem) return;
        carouselIndex = (carouselIndex + 1) % lightboxItem.images.length;
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
</script>

<div class="landing">
    <img src="logo-long.svg" alt="DONCEZART Logo" class="logo-long"/>
    <img src="logo-square.svg" alt="DONCEZART Logo" class="logo-square"/>
    <p>The swiss army knife of the creative world</p>
</div>

<div class="gallery">
    <h1>My Work</h1>
    <div class="gallery-filters">
        <CategoryFilter
            categories={data.categoryFilters}
            subcategories={data.subcategoryFilters}
            bind:activeCategory
            bind:activeSubcategory
        />
        {#if uniqueTags.length > 1}
            <div class="tag-filters">
                {#each uniqueTags as t}
                    <button
                        class="tag-btn"
                        class:active={activeTag === t.slug}
                        onclick={() => activeTag = t.slug}
                    >{t.name}</button>
                {/each}
            </div>
        {/if}
    </div>
    <GalleryGrid items={filteredItems} columns={4} showMoreHref="/my-work" onItemClick={handleItemClick} />
</div>

<!-- Lightbox popup -->
{#if lightboxItem}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div class="lightbox-overlay" onclick={closeLightbox} onkeydown={(e) => e.key === 'Escape' && closeLightbox()} role="dialog" aria-modal="true" aria-label="Image lightbox">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
            <button class="lightbox-close" onclick={closeLightbox} aria-label="Close lightbox">
                <i class="fa-solid fa-xmark"></i>
            </button>

            {#if lightboxItem.displayMode === 'carousel' && lightboxItem.images.length > 1}
                <!-- Carousel -->
                {@const isVertical = lightboxItem.carouselDirection === 'vertical'}
                <div class="carousel-outer" class:vertical={isVertical}>
                    <div class="carousel-viewport">
                        <div
                            class="carousel-track"
                            style={isVertical
                                ? `transform: translateY(-${carouselIndex * 100}%)`
                                : `transform: translateX(-${carouselIndex * 100}%)`}
                        >
                            {#each lightboxItem.images as img, i}
                                <div class="carousel-slide">
                                    <img src={img} alt="{lightboxItem.alt} ({i + 1}/{lightboxItem.images.length})" />
                                </div>
                            {/each}
                        </div>
                        <!-- Edge fades -->
                        <div class="carousel-fade carousel-fade-start"></div>
                        <div class="carousel-fade carousel-fade-end"></div>
                        <!-- Nav arrows inside viewport so they're never clipped -->
                        {#if carouselIndex > 0}
                            <button class="carousel-nav prev" onclick={carouselPrev} aria-label="Previous image">
                                <i class="fa-solid {isVertical ? 'fa-chevron-up' : 'fa-chevron-left'}"></i>
                            </button>
                        {/if}
                        {#if carouselIndex < lightboxItem.images.length - 1}
                            <button class="carousel-nav next" onclick={carouselNext} aria-label="Next image">
                                <i class="fa-solid {isVertical ? 'fa-chevron-down' : 'fa-chevron-right'}"></i>
                            </button>
                        {/if}
                    </div>

                </div>

                <!-- Dots outside the carousel to avoid overlap -->
                <div class="carousel-dots">
                    {#each lightboxItem.images as _, i}
                        <button
                            class="dot"
                            class:active={i === carouselIndex}
                            onclick={() => carouselIndex = i}
                            aria-label="Go to image {i + 1}"
                        ></button>
                    {/each}
                </div>

            {:else if lightboxItem.displayMode === 'before-after' && lightboxItem.images.length >= 2}
                <!-- Before / After slider -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="ba-container"
                    onpointerdown={handleBaPointerDown}
                    onpointermove={handleBaPointerMove}
                    onpointerup={handleBaPointerUp}
                    onpointercancel={handleBaPointerUp}
                >
                    <!-- Transparent sizer — sets container height matching the images -->
                    <img
                        src={lightboxItem.images[1]}
                        alt=""
                        class="ba-sizer"
                        aria-hidden="true"
                        draggable="false"
                    />
                    <!-- After image: full width, absolute -->
                    <img
                        src={lightboxItem.images[1]}
                        alt="{lightboxItem.alt} (after)"
                        class="ba-img ba-after-img"
                        draggable="false"
                    />
                    <!-- Before image: clipped from the right by clip-path -->
                    <img
                        src={lightboxItem.images[0]}
                        alt="{lightboxItem.alt} (before)"
                        class="ba-img ba-before-img"
                        style="clip-path: inset(0 {100 - baSliderPos}% 0 0)"
                        draggable="false"
                    />
                    <!-- Slider line -->
                    <div class="ba-slider" style="left: {baSliderPos}%">
                        <div class="ba-handle">
                            <i class="fa-solid fa-grip-lines-vertical"></i>
                        </div>
                    </div>
                    <span class="ba-label ba-label-before">Before</span>
                    <span class="ba-label ba-label-after">After</span>
                </div>

            {:else}
                <!-- Single image -->
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
    .logo-long {
        width: 50%;
        margin-left: auto;
        margin-right: auto;
        @media (max-width: 666px) {
            display: none;
        }
    }

    .logo-square {
        width: 100%;
        @media (min-width: 667px) {
            display: none;
        }
    }

    .landing {
        margin-top: 0;
        text-align: center;
        padding-top: 10rem;
        padding-bottom: 10rem;
        @media (max-width: 790px) {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }

    .gallery-filters {
        margin-top: 1.5rem;
    }

    .tag-filters {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-top: 0.75rem;
    }
    .tag-btn {
        padding: 0.25rem 0.7rem;
        border-radius: 1rem;
        border: 1px solid rgba(255,255,255,0.15);
        background: transparent;
        color: rgba(255,255,255,0.6);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .tag-btn:hover {
        border-color: rgba(255,255,255,0.4);
        color: #fff;
    }
    .tag-btn.active {
        background: #ff0000;
        border-color: #ff0000;
        color: #fff;
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

    /* ── Carousel ──────────────────────── */
    .carousel-outer {
        position: relative;
        width: 100%;
        max-width: 90vw;
    }

    .carousel-viewport {
        position: relative;
        overflow: hidden;
        width: 100%;
        --slide-size: 100%;
    }

    .carousel-track {
        display: flex;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform;
    }

    .carousel-outer.vertical .carousel-track {
        flex-direction: column;
    }

    .carousel-slide {
        flex-shrink: 0;
        width: 100%;
    }

    .carousel-slide img {
        display: block;
        width: 100%;
        max-height: 70vh;
        object-fit: contain;
    }

    .carousel-outer.vertical .carousel-viewport {
        max-height: 70vh;
    }
    .carousel-outer.vertical .carousel-slide {
        width: 100%;
        height: 70vh;
        flex-shrink: 0;
    }
    .carousel-outer.vertical .carousel-slide img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    /* Edge fades */
    .carousel-fade {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 15%;
        pointer-events: none;
        z-index: 2;
    }
    .carousel-fade-start {
        left: 0;
        background: linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 100%);
    }
    .carousel-fade-end {
        right: 0;
        background: linear-gradient(to left, rgba(0,0,0,0.7) 0%, transparent 100%);
    }
    .carousel-outer.vertical .carousel-fade {
        width: auto;
        left: 0;
        right: 0;
    }
    .carousel-outer.vertical .carousel-fade-start {
        bottom: auto;
        height: 15%;
        background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
    }
    .carousel-outer.vertical .carousel-fade-end {
        top: auto;
        height: 15%;
        background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
    }

    /* Arrows: positioned on the sides of carousel-outer, not inside viewport */
    .carousel-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0,0,0,0.6);
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
        z-index: 10;
        /* Prevent page scroll when clicking */
        touch-action: manipulation;
    }
    .carousel-nav:hover { background: rgba(0,0,0,0.9); }
    .carousel-nav.prev { left: 0.75rem; }
    .carousel-nav.next { right: 0.75rem; }

    .carousel-outer.vertical .carousel-nav {
        position: static;
        top: auto;
        transform: none;
        left: auto;
        right: auto;
        margin: 0 auto;
        display: flex;
    }
    .carousel-outer.vertical .carousel-nav.prev { margin-top: -1.5rem; }
    .carousel-outer.vertical .carousel-nav.next { margin-top: 0.5rem; }

    /* Dots: outside viewport, below carousel */
    .carousel-dots {
        display: flex;
        justify-content: center;
        gap: 0.4rem;
        margin-top: 1rem;
    }
    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.4);
        background: transparent;
        cursor: pointer;
        padding: 0;
        transition: all 0.15s;
    }
    .dot.active {
        background: #ff2222;
        border-color: #ff2222;
    }

    /* ── Before / After slider ─────────── */
    .ba-container {
        position: relative;
        max-width: 100%;
        overflow: hidden;
        cursor: ew-resize;
        user-select: none;
        -webkit-user-select: none;
    }

    /* Transparent sizer: sets the container's height */
    .ba-sizer {
        display: block;
        width: 100%;
        max-height: 75vh;
        object-fit: contain;
        visibility: hidden;
        pointer-events: none;
    }

    /* Both images: absolutely fill the container */
    .ba-img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
    }

    .ba-before-img {
        /* clip-path applied via inline style */
    }

    .ba-slider {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #fff;
        transform: translateX(-50%);
        z-index: 2;
        pointer-events: none;
    }
    .ba-handle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 2.2rem;
        height: 2.2rem;
        border-radius: 50%;
        background: #fff;
        color: #333;
        display: flex;
        align-items: center;
        justify-content: center;
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
</style>