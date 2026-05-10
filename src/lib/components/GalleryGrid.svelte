<script>
    import Badge from './ui/Badge.svelte';
    import Button from './ui/Button.svelte';

    let { items = [], columns = 4, showMoreHref = '/my-work', onItemClick = null } = $props();

    let gridEl = $state(null);
    let wrapEl = $state(null);
    let contentOverflows = $state(false);

    $effect(() => {
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

<div class="gallery-wrap" bind:this={wrapEl}>
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
                {#if item.tags?.length}
                    <div class="item-tags">
                        {#each item.tags as t}
                            <span class="item-tag">{t.name}</span>
                        {/each}
                    </div>
                {/if}
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

    .item-tags {
        position: absolute;
        bottom: 0.5rem;
        left: 0.5rem;
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
        pointer-events: none;
    }

    .item-tag {
        font-size: 0.65rem;
        padding: 0.1rem 0.4rem;
        border-radius: var(--radius);
        background: rgba(0, 0, 0, 0.7);
        color: rgba(255, 255, 255, 0.8);
    }

    .show-more {
        display: flex;
        justify-content: center;
        margin-top: 2rem;
    }
</style>
