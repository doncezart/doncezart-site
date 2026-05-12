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

    function handleItemClick(item) {
        window.umami?.track('artwork-open', { title: item.title, category: item.category, mode: item.displayMode, hasCaseStudy: item.hasCaseStudy });
        if (item.hasCaseStudy) {
            window.location.href = `/work/${item.slug}`;
        }
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
</script>

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
</style>
