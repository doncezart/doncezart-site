<script>
    import CategoryFilter from '$lib/components/CategoryFilter.svelte';
    import GalleryGrid from '$lib/components/GalleryGrid.svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    let { data } = $props();

    let activeCategory = $state('all');
    let activeSubcategory = $state('all');
    let sortOrder = $state('newest');
    let currentPage = $state(1);

    const PAGE_SIZE = 24;

    let allItems = $derived(data.artworks.map(a => ({ ...a })));

    let filteredItems = $derived.by(() => {
        let items = allItems;
        if (activeCategory !== 'all') items = items.filter(i => i.category === activeCategory);
        if (activeSubcategory !== 'all') items = items.filter(i => i.subcategory === activeSubcategory);
        switch (sortOrder) {
            case 'oldest': items = [...items].reverse(); break;
            case 'az': items = [...items].sort((a, b) => a.title.localeCompare(b.title)); break;
            case 'za': items = [...items].sort((a, b) => b.title.localeCompare(a.title)); break;
        }
        return items;
    });

    let totalPages = $derived(Math.ceil(filteredItems.length / PAGE_SIZE) || 1);

    let pageItems = $derived(filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

    let rangeStart = $derived((currentPage - 1) * PAGE_SIZE + 1);
    let rangeEnd = $derived(Math.min(currentPage * PAGE_SIZE, filteredItems.length));

    // Reset page when filters/sort change
    $effect(() => {
        activeCategory;
        activeSubcategory;
        sortOrder;
        currentPage = 1;
    });

    function handleItemClick(item) {
        if (item.hasCaseStudy) {
            window.location.href = `/work/${item.slug}`;
        }
    }

    function prevPage() {
        if (currentPage > 1) currentPage--;
    }

    function nextPage() {
        if (currentPage < totalPages) currentPage++;
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

    <div class="sort-row">
        <div class="sort-group">
            <span class="sort-label">Sort:</span>
            <div class="sort-buttons">
                <button class="sort-btn" class:active={sortOrder === 'newest'} onclick={() => { sortOrder = 'newest'; }}>Newest</button>
                <button class="sort-btn" class:active={sortOrder === 'oldest'} onclick={() => { sortOrder = 'oldest'; }}>Oldest</button>
                <button class="sort-btn" class:active={sortOrder === 'az'} onclick={() => { sortOrder = 'az'; }}>A&#x2013;Z</button>
                <button class="sort-btn" class:active={sortOrder === 'za'} onclick={() => { sortOrder = 'za'; }}>Z&#x2013;A</button>
            </div>
        </div>

        {#if filteredItems.length > 0}
            <span class="count-label">
                Showing {rangeStart}&ndash;{rangeEnd} of {filteredItems.length} artworks
            </span>
        {:else}
            <span class="count-label">No artworks found</span>
        {/if}
    </div>
</div>

<GalleryGrid items={pageItems} columns={4} showAll={true} onItemClick={handleItemClick} />

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
    .controls {
        padding: 0 var(--space-xl);
        max-width: 1400px;
        margin: 0 auto;
    }

    .sort-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-md);
        padding: var(--space-md) 0;
        border-top: var(--border);
        flex-wrap: wrap;
    }

    .sort-group {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }

    .sort-label {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        white-space: nowrap;
    }

    .sort-buttons {
        display: flex;
        gap: 0;
        border: var(--border);
    }

    .sort-btn {
        background: transparent;
        border: none;
        border-right: var(--border);
        color: var(--color-text-secondary);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        padding: var(--space-xs) var(--space-sm);
        cursor: pointer;
        transition: color var(--transition-fast), background var(--transition-fast);
        white-space: nowrap;
    }

    .sort-btn:last-child {
        border-right: none;
    }

    .sort-btn:hover {
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.05);
    }

    .sort-btn.active {
        color: #ff0000;
        background: rgba(255, 0, 0, 0.08);
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
        .sort-row {
            flex-direction: column;
            align-items: flex-start;
        }

        .pagination {
            gap: var(--space-md);
        }
    }
</style>
