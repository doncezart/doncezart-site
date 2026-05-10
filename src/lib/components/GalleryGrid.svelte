<script>
    import Badge from './ui/Badge.svelte';
    import Button from './ui/Button.svelte';
    let { items = [], columns = 4, rows = 4, showMoreHref = '/my-work', onItemClick = null, categoryAspectRatios = {} } = $props();

    let maxVisible = $derived(columns * rows);
    let visibleItems = $derived(items.slice(0, maxVisible));
    let hasMore = $derived(items.length > maxVisible);

    function handleClick(item) {
        if (onItemClick) onItemClick(item);
    }

    function getAspectRatio(item) {
        return categoryAspectRatios[item.category] || '1/1';
    }
</script>

<div class="gallery-grid" style="--cols: {columns}">
    {#each visibleItems as item (item.src)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
            class="gallery-item"
            class:clickable={!!onItemClick}
            onclick={() => handleClick(item)}
            onkeydown={(e) => e.key === 'Enter' && handleClick(item)}
            role={onItemClick ? 'button' : undefined}
            tabindex={onItemClick ? 0 : undefined}
            style="aspect-ratio: {getAspectRatio(item)}"
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

{#if hasMore}
    <div class="show-more">
        <Button href={showMoreHref} variant="cta">View all work <i class="fa-solid fa-arrow-right"></i></Button>
    </div>
{/if}

<style>
    .gallery-grid {
        display: grid;
        grid-template-columns: repeat(var(--cols), 1fr);
        gap: 0.75rem;
        margin-top: 1.5rem;
        @media (max-width: 1200px) {
            grid-template-columns: repeat(2, 1fr);
        }
        @media (max-width: 666px) {
            grid-template-columns: 1fr;
        }
    }

    .gallery-item {
        overflow: hidden;
        position: relative;
        border-radius: var(--radius);
    }

    .gallery-item.clickable {
        cursor: pointer;
    }

    .gallery-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.3s ease;
    }

    .gallery-item:hover img {
        transform: scale(1.03);
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
