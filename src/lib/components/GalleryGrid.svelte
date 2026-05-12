<script>
    import { tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import Badge from './ui/Badge.svelte';
    import Button from './ui/Button.svelte';

    let { items = [], columns = 4, showMoreHref = '/my-work', onItemClick = null, showAll = false } = $props();

    let gridEl = $state(null);
    let wrapEl = $state(null);
    let contentOverflows = $state(false);
    let masonryDone = $state(false);

    const GAP = 12; // matches 0.75rem column-gap

    function colCount() {
        if (typeof window === 'undefined') return columns;
        if (window.innerWidth <= 540) return 1;
        if (window.innerWidth <= 900) return Math.min(columns, 3);
        if (window.innerWidth <= 1200) return Math.min(columns, 4);
        return columns;
    }

    function runMasonry() {
        if (!gridEl) return;
        const cols = colCount();
        const totalW = gridEl.offsetWidth;
        const colW = Math.floor((totalW - (cols - 1) * GAP) / cols);
        const heights = Array(cols).fill(0);

        const children = [...gridEl.querySelectorAll(':scope > .gallery-item')];
        children.forEach(item => {
            const shortest = heights.indexOf(Math.min(...heights));
            item.style.position = 'absolute';
            item.style.width = `${colW}px`;
            item.style.left = `${shortest * (colW + GAP)}px`;
            item.style.top = `${heights[shortest]}px`;
            heights[shortest] += item.offsetHeight + GAP;
        });

        const totalH = Math.max(...heights) - GAP;
        gridEl.style.height = `${totalH}px`;
        // Only reveal once items have real height (i.e. at least one image has loaded)
        if (totalH > 0) masonryDone = true;

        if (!showAll && wrapEl) {
            contentOverflows = totalH > wrapEl.clientHeight + 2;
        }
    }

    $effect(() => {
        const grid = gridEl;
        items; // re-run masonry when item list changes (infinite scroll / pagination)
        columns; // re-run masonry when column count changes (slider)
        if (!grid) return;

        grid.style.position = 'relative';

        async function init() {
            await tick();
            runMasonry();
            // Re-run as each lazy image loads
            grid.querySelectorAll('img').forEach(img => {
                if (!img.complete) {
                    img.addEventListener('load', runMasonry, { once: true });
                    img.addEventListener('error', runMasonry, { once: true });
                }
            });
            // Re-run when video first-frame is ready
            grid.querySelectorAll('video.thumb-video').forEach(video => {
                if (video.readyState < 1) {
                    video.addEventListener('loadedmetadata', runMasonry, { once: true });
                }
            });
        }

        init();

        const ro = new ResizeObserver(() => runMasonry());
        ro.observe(grid);
        return () => ro.disconnect();
    });

    function handleClick(item) {
        if (!onItemClick) return;
        window.umami?.track('artwork-open', {
            title: item.title,
            category: item.category,
            mode: item.displayMode
        });
        onItemClick(item);
    }
</script>

<div class="gallery-wrap" class:show-all={showAll} bind:this={wrapEl}>
    {#if !masonryDone && items.length > 0}
        <div
            class="skeleton-overlay"
            style="--sk-cols: {columns}"
            transition:fade={{ duration: 200 }}
        >
            {#each Array.from({ length: Math.min(items.length, 12) }) as _, i}
                <div
                    class="skeleton-item"
                    style="animation-delay: {(i % 6) * 0.1}s"
                ></div>
            {/each}
        </div>
    {/if}
    <div class="gallery-grid" class:visible={masonryDone} bind:this={gridEl}>
        {#each items as item (item.src)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
                class="gallery-item"
                class:clickable={!!onItemClick}
                onclick={() => handleClick(item)}
                onkeydown={(e) => e.key === 'Enter' && handleClick(item)}
                role={onItemClick ? 'button' : undefined}
                tabindex={onItemClick ? 0 : undefined}
            >
                {#if item.videoSrc}
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <video src={item.videoSrc} muted playsinline preload="metadata" disablepictureinpicture controlslist="nopictureinpicture nodownload" class="thumb-video"></video>
                {:else}
                    <img src={item.src} alt={item.alt} loading="lazy" />
                {/if}
                {#if item.previewUrl}
                    <img src={item.previewUrl} alt="" class="thumb-preview" aria-hidden="true" loading="lazy" />
                {/if}
                {#if item.imageCount > 1}
                    <Badge dark position="top-left">
                        {#if item.displayMode === 'before-after'}
                            <i class="fa-solid fa-right-left"></i>
                        {:else}
                            <i class="fa-solid fa-images"></i> {item.imageCount}
                        {/if}
                    </Badge>
                {/if}
                {#if item.hasCaseStudy}
                    <Badge>
                        <i class="fa-solid fa-book-open"></i> Case Study
                    </Badge>
                {/if}
                <!-- Hover metadata overlay -->
                <div class="item-overlay">
                    <p class="overlay-title">{item.title}</p>
                    <div class="overlay-meta">
                        {#if item.category}
                            <span class="meta-chip">{item.category}</span>
                        {/if}
                        {#if item.subcategory}
                            <span class="meta-chip">{item.subcategory}</span>
                        {/if}
                        {#if item.displayMode === 'before-after'}
                            <span class="meta-chip meta-chip--accent">
                                <i class="fa-solid fa-right-left"></i> Before &amp; After
                            </span>
                        {:else if item.displayMode === 'carousel'}
                            <span class="meta-chip meta-chip--accent">
                                <i class="fa-solid fa-images"></i> {item.imageCount} slides
                            </span>
                        {/if}
                        {#if item.tags?.length}
                            {#each item.tags.slice(0, 3) as t}
                                <span class="meta-chip meta-chip--tag">{t.name}</span>
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        {/each}
    </div>
    {#if contentOverflows}
        <div class="gallery-fade"></div>
    {/if}
</div>

{#if contentOverflows}
    <div class="show-more">
        <Button
            href={showMoreHref}
            variant="cta"
            style="font-weight: 400"
            onclick={() => window.umami?.track('view-all-work')}
        >View all work <i class="fa-solid fa-arrow-right"></i></Button>
    </div>
{/if}

<style>
    .gallery-wrap {
        position: relative;
        max-height: 72vh;
        overflow: hidden;
        margin-top: 1.5rem;
        min-height: 300px;
    }

    .gallery-wrap.show-all {
        max-height: none;
        overflow: visible;
        min-height: 300px;
    }

    @media (max-width: 666px) {
        .gallery-wrap {
            max-height: 80vh;
        }
    }

    /* ── Skeleton ── */
    .skeleton-overlay {
        position: absolute;
        inset: 0;
        z-index: 1;
        columns: var(--sk-cols, 4);
        column-gap: 12px;
    }

    @media (max-width: 1200px) {
        .skeleton-overlay { columns: 2; }
    }
    @media (max-width: 666px) {
        .skeleton-overlay { columns: 1; }
    }

    .skeleton-item {
        break-inside: avoid;
        margin-bottom: 12px;
        aspect-ratio: 16 / 9;
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.09) 50%,
            rgba(255, 255, 255, 0.04) 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
    }

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .gallery-grid {
        /* JS masonry handles layout; position:relative set by script */
        width: 100%;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    .gallery-grid.visible {
        opacity: 1;
    }

    .gallery-item {
        overflow: hidden;
        position: relative;
        border-radius: var(--radius);
        margin-bottom: 0.75rem;
        display: block;
    }

    .gallery-item.clickable {
        cursor: pointer;
    }

    .gallery-item img,
    .gallery-item .thumb-video {
        width: 100%;
        height: auto;
        display: block;
    }

    /* No min-height — masonry re-runs on loadedmetadata for correct ratio even on short/wide videos */
    .thumb-video { pointer-events: none; background: #000; }

    .thumb-preview {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.25s ease;
        pointer-events: none;
        border-radius: inherit;
    }
    .gallery-item:hover .thumb-preview {
        opacity: 1;
    }

    .gallery-fade {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 40%;
        background: linear-gradient(to top, #000000 0%, transparent 100%);
        pointer-events: none;
    }

    /* ── Hover metadata overlay ─────── */
    .item-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 2rem 0.75rem 0.75rem;
        background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.3) 65%, transparent 100%);
        opacity: 0;
        transition: opacity 0.22s ease;
        pointer-events: none;
    }

    .gallery-item:hover .item-overlay {
        opacity: 1;
    }

    .overlay-title {
        margin: 0 0 0.4rem;
        font-family: var(--font-display);
        font-size: 0.85rem;
        font-weight: 600;
        color: #fff;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .overlay-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
    }

    .meta-chip {
        font-size: 0.6rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0.15rem 0.45rem;
        border-radius: var(--radius);
        background: rgba(255,255,255,0.12);
        color: var(--color-text-secondary);
        border: 1px solid rgba(255,255,255,0.1);
        line-height: 1.4;
    }

    .meta-chip--accent {
        background: rgba(255,34,34,0.18);
        color: #ff6666;
        border-color: rgba(255,34,34,0.3);
    }

    .meta-chip--tag {
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.55);
    }

    .show-more {
        display: flex;
        justify-content: center;
        margin-top: 2rem;
    }
</style>
