<script>
    import Badge from './ui/Badge.svelte';
    import Button from './ui/Button.svelte';

    let { items = [], columns = 4, showMoreHref = '/my-work', onItemClick = null, showAll = false } = $props();

    let gridEl = $state(null);
    let wrapEl = $state(null);
    let contentOverflows = $state(false);

    $effect(() => {
        if (showAll) {
            contentOverflows = false;
            return;
        }
        const grid = gridEl;
        const wrap = wrapEl;
        if (!grid || !wrap) return;

        function check() {
            contentOverflows = grid.scrollHeight > wrap.clientHeight + 2;
        }

        check();
        const ro = new ResizeObserver(check);
        ro.observe(grid);
        return () => ro.disconnect();
    });

    function handleClick(item) {
        if (onItemClick) onItemClick(item);
    }
</script>

<div class="gallery-wrap" class:show-all={showAll} bind:this={wrapEl}>
    <div class="gallery-grid" style="--cols: {columns}" bind:this={gridEl}>
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
                <img src={item.src} alt={item.alt} loading="lazy" />
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
        <Button href={showMoreHref} variant="cta" style="font-weight: 400">View all work <i class="fa-solid fa-arrow-right"></i></Button>
    </div>
{/if}

<style>
    .gallery-wrap {
        position: relative;
        max-height: 72vh;
        overflow: hidden;
        margin-top: 1.5rem;
    }

    .gallery-wrap.show-all {
        max-height: none;
        overflow: visible;
    }

    @media (max-width: 666px) {
        .gallery-wrap {
            max-height: 80vh;
        }
    }

    .gallery-grid {
        columns: var(--cols);
        column-gap: 0.75rem;
    }

    @media (max-width: 1200px) {
        .gallery-grid { columns: 2; }
    }
    @media (max-width: 666px) {
        .gallery-grid { columns: 1; }
    }

    .gallery-item {
        break-inside: avoid;
        overflow: hidden;
        position: relative;
        border-radius: var(--radius);
        margin-bottom: 0.75rem;
        display: block;
    }

    .gallery-item.clickable {
        cursor: pointer;
    }

    .gallery-item img {
        width: 100%;
        height: auto;
        display: block;
        transition: transform 0.3s ease;
    }

    .gallery-item:hover img {
        transform: scale(1.03);
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
