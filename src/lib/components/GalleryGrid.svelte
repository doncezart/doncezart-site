<script>
    import { tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import Badge from './ui/Badge.svelte';
    import Button from './ui/Button.svelte';
    import { fmtCount as fmtViews } from '$lib/data/cases/format.js';

    let { items = [], columns = 4, showMoreHref = '/my-work', onItemClick = null, showAll = false, enableHoverPreview = false } = $props();

    function hoverStart(e) {
        const video = e.currentTarget.querySelector('.hover-preview');
        if (!video) return;
        video.src = video.dataset.src;
        video.play().catch(() => {});
    }

    function hoverEnd(e) {
        const video = e.currentTarget.querySelector('.hover-preview');
        if (!video) return;
        video.pause();
        video.removeAttribute('src');
        video.load();
    }

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
        {#each items as item (item.id)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
                class="gallery-item"
                class:clickable={!!onItemClick}
                onclick={() => handleClick(item)}
                onkeydown={(e) => e.key === 'Enter' && handleClick(item)}
                onmouseenter={enableHoverPreview ? hoverStart : undefined}
                onmouseleave={enableHoverPreview ? hoverEnd : undefined}
                role={onItemClick ? 'button' : undefined}
                tabindex={onItemClick ? 0 : undefined}
            >
                {#if item.videoSrc}
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <video src={item.videoSrc} muted playsinline preload="metadata" disablepictureinpicture controlslist="nopictureinpicture nodownload" class="thumb-video"
                        onloadeddata={(e) => { e.currentTarget.currentTime = 0.001; }}
                    ></video>
                {:else}
                    <img src={item.src} alt={item.alt} loading="lazy" />
                {/if}
                {#if enableHoverPreview && item.previewUrl}
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <video
                        class="hover-preview"
                        data-src={item.previewUrl}
                        muted
                        playsinline
                        loop
                        disablepictureinpicture
                        controlslist="nopictureinpicture nodownload noremoteplayback"
                        tabindex="-1"
                    ></video>
                {/if}
                {#if item.videoId}
                    <span class="play" aria-hidden="true"><i class="fa-solid fa-play"></i></span>
                    {#if item.duration}<span class="duration">{item.duration}</span>{/if}
                    {#if item.views != null}
                        <Badge dark position="top-left"><i class="fa-solid fa-eye"></i> {fmtViews(item.views)} views</Badge>
                    {/if}
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
                        {:else if item.videoId}
                            <span class="meta-chip meta-chip--accent">
                                <i class="fa-brands fa-youtube"></i> Video
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
    /* Video entries: play button and length over the cover */
    .play {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 1;
        display: grid;
        place-items: center;
        width: 3.2rem;
        height: 3.2rem;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 1rem;
        transform: translate(-50%, -50%);
        transition: background 0.2s, transform 0.2s;
        pointer-events: none;
    }
    .play i { margin-left: 0.15rem; }
    .gallery-item:hover .play { background: var(--color-accent); transform: translate(-50%, -50%) scale(1.08); }
    .duration {
        position: absolute;
        right: 0.5rem;
        bottom: 0.5rem;
        z-index: 1;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        font-size: 0.75rem;
        font-weight: 600;
        pointer-events: none;
    }
    .gallery-wrap {
        position: relative;
        max-height: 72vh;
        overflow: hidden;
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
        border-radius: 8px;
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.09) 50%,
            rgba(255, 255, 255, 0.04) 100%
        ), rgba(14, 14, 14, 0.55);
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
        border-radius: 8px;
        margin-bottom: 0.75rem;
        display: block;
        background: var(--w-raised, #1b1b1b);
        /* Keeps the rounded clip on the scaled media in Safari. */
        isolation: isolate;
    }
    /* Hairline ring over the media; brightens on hover. */
    .gallery-item::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 3;
        border-radius: inherit;
        border: 1px solid rgba(255, 255, 255, 0.08);
        pointer-events: none;
        transition: border-color 0.25s;
    }
    .gallery-item:hover::after { border-color: rgba(255, 255, 255, 0.28); }
    .gallery-item:focus-visible { outline: 2px solid var(--accent, #ff2b1f); outline-offset: 2px; }

    .gallery-item.clickable {
        cursor: pointer;
    }

    .gallery-item img,
    .gallery-item .thumb-video {
        width: 100%;
        height: auto;
        display: block;
    }

    .gallery-item img,
    .gallery-item .thumb-video,
    .gallery-item .hover-preview {
        transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.1, 1), opacity 0.15s ease;
    }
    .gallery-item:hover img,
    .gallery-item:hover .thumb-video,
    .gallery-item:hover .hover-preview { transform: scale(1.04); }

    /* No min-height — masonry re-runs on loadedmetadata for correct ratio even on short/wide videos */
    .thumb-video { pointer-events: none; background: #000; }

    .hover-preview {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        pointer-events: none;
        display: block;
        background: transparent;
    }

    .gallery-item:hover .hover-preview {
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
        z-index: 2;
        padding: 2.25rem 0.8rem 0.8rem;
        background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 45%, transparent 100%);
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        pointer-events: none;
    }

    .gallery-item:hover .item-overlay,
    .gallery-item:focus-visible .item-overlay {
        opacity: 1;
        transform: none;
    }

    .overlay-title {
        margin: 0 0 0.45rem;
        font-family: var(--font-display);
        font-size: 0.88rem;
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
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.66rem;
        font-weight: 500;
        padding: 0.18rem 0.55rem;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.6);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        line-height: 1.4;
    }

    .meta-chip--accent {
        background: rgba(255, 43, 31, 0.16);
        color: #fff;
        border-color: rgba(255, 43, 31, 0.55);
    }

    .meta-chip--tag {
        color: rgba(255, 255, 255, 0.6);
        border-color: rgba(255, 255, 255, 0.1);
    }

    .show-more {
        display: flex;
        justify-content: center;
        margin-top: 2rem;
    }

    @media (prefers-reduced-motion: reduce) {
        .gallery-item img,
        .gallery-item .thumb-video,
        .gallery-item .hover-preview { transition: opacity 0.15s ease; }
        .gallery-item:hover img,
        .gallery-item:hover .thumb-video,
        .gallery-item:hover .hover-preview { transform: none; }
    }
</style>
