<script>
    import { slide } from 'svelte/transition';

    let { categories, subcategories, activeCategory = $bindable('all'), activeSubcategory = $bindable('all') } = $props();

    let catScrollEl = $state(null);
    let subScrollEl = $state(null);
    let showMobileMenu = $state(false);

    function selectCategory(id) {
        activeCategory = id;
        activeSubcategory = 'all';
        showMobileMenu = false;
    }

    function selectSubcategory(id) {
        activeSubcategory = id;
        showMobileMenu = false;
    }

    function scrollRow(el, direction) {
        if (el) el.scrollBy({ left: direction * 200, behavior: 'smooth' });
    }

    let currentSubcategories = $derived(
        activeCategory !== 'all' && subcategories[activeCategory]
            ? subcategories[activeCategory]
            : null
    );

    let showSubRow = $derived(activeCategory !== 'all' && currentSubcategories && currentSubcategories.length > 2);

    let catCanScrollLeft = $state(false);
    let catCanScrollRight = $state(false);
    let subCanScrollLeft = $state(false);
    let subCanScrollRight = $state(false);

    function updateScrollState(el, setLeft, setRight) {
        if (!el) return;
        setLeft(el.scrollLeft > 2);
        setRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }

    $effect(() => {
        const cat = catScrollEl;
        if (!cat) return;
        updateScrollState(cat, v => catCanScrollLeft = v, v => catCanScrollRight = v);
        function onScroll() {
            updateScrollState(cat, v => catCanScrollLeft = v, v => catCanScrollRight = v);
        }
        cat.addEventListener('scroll', onScroll, { passive: true });
        const ro = new ResizeObserver(() => {
            updateScrollState(cat, v => catCanScrollLeft = v, v => catCanScrollRight = v);
        });
        ro.observe(cat);
        return () => {
            cat.removeEventListener('scroll', onScroll);
            ro.disconnect();
        };
    });

    $effect(() => {
        const sub = subScrollEl;
        if (!sub) return;
        updateScrollState(sub, v => subCanScrollLeft = v, v => subCanScrollRight = v);
        function onScroll() {
            updateScrollState(sub, v => subCanScrollLeft = v, v => subCanScrollRight = v);
        }
        sub.addEventListener('scroll', onScroll, { passive: true });
        const ro = new ResizeObserver(() => {
            updateScrollState(sub, v => subCanScrollLeft = v, v => subCanScrollRight = v);
        });
        ro.observe(sub);
        return () => {
            sub.removeEventListener('scroll', onScroll);
            ro.disconnect();
        };
    });
</script>

<!-- Mobile menu toggle -->
<button class="mobile-menu-toggle" onclick={() => showMobileMenu = !showMobileMenu}>
    <span>{categories.find(c => c.id === activeCategory)?.label ?? 'All'}</span>
    <i class="fa-solid fa-chevron-{showMobileMenu ? 'up' : 'down'}"></i>
</button>

<!-- Mobile dropdown -->
{#if showMobileMenu}
    <div class="mobile-menu" transition:slide={{ duration: 200 }}>
        <div class="mobile-menu-section">
            <p class="mobile-menu-label">Category</p>
            {#each categories as cat}
                <button
                    class="mobile-menu-item"
                    class:active={activeCategory === cat.id}
                    onclick={() => selectCategory(cat.id)}
                >{cat.label}</button>
            {/each}
        </div>
        {#if showSubRow}
            <div class="mobile-menu-section">
                <p class="mobile-menu-label">Subcategory</p>
                {#each currentSubcategories as sub}
                    <button
                        class="mobile-menu-item"
                        class:active={activeSubcategory === sub.id}
                        onclick={() => selectSubcategory(sub.id)}
                    >{sub.label}</button>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<!-- Desktop filter rows -->
<div class="filter-rows">
    <!-- Category row -->
    <div class="filter-row">
        {#if catCanScrollLeft}
            <button class="arrow-btn" onclick={() => scrollRow(catScrollEl, -1)} aria-label="Scroll categories left">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
        {/if}
        <div class="filter-scroll" bind:this={catScrollEl}>
            {#each categories as cat}
                <button
                    class="filter-btn"
                    class:active={activeCategory === cat.id}
                    onclick={() => selectCategory(cat.id)}
                >{cat.label}</button>
            {/each}
        </div>
        {#if catCanScrollRight}
            <button class="arrow-btn" onclick={() => scrollRow(catScrollEl, 1)} aria-label="Scroll categories right">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        {/if}
    </div>

    <!-- Subcategory row (slides in) -->
    {#if showSubRow}
        <div class="filter-row sub" transition:slide={{ duration: 250 }}>
            {#if subCanScrollLeft}
                <button class="arrow-btn" onclick={() => scrollRow(subScrollEl, -1)} aria-label="Scroll subcategories left">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
            {/if}
            <div class="filter-scroll" bind:this={subScrollEl}>
                {#each currentSubcategories as sub}
                    <button
                        class="filter-btn sub-btn"
                        class:active={activeSubcategory === sub.id}
                        onclick={() => selectSubcategory(sub.id)}
                    >{sub.label}</button>
                {/each}
            </div>
            {#if subCanScrollRight}
                <button class="arrow-btn" onclick={() => scrollRow(subScrollEl, 1)} aria-label="Scroll subcategories right">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            {/if}
        </div>
    {/if}
</div>

<style>
    /* ── Desktop filter rows ── */
    .filter-rows {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        @media (max-width: 666px) {
            display: none;
        }
    }

    .filter-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .filter-scroll {
        display: flex;
        gap: 1.5rem;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        flex: 1;
    }
    .filter-scroll::-webkit-scrollbar {
        display: none;
    }

    .arrow-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        background: none;
        border: none;
        color: #555;
        cursor: pointer;
        transition: color 0.2s;
        font-size: 0.7rem;
    }
    .arrow-btn:hover {
        color: white;
    }

    .filter-btn {
        flex-shrink: 0;
        padding: 0;
        background: none;
        border: none;
        color: #8B989C;
        font-family: 'Satoshi', sans-serif;
        font-size: 1.15rem;
        font-weight: 500;
        cursor: pointer;
        transition: color 0.2s;
        white-space: nowrap;
    }
    .filter-btn:hover {
        color: white;
    }
    .filter-btn.active {
        color: white;
    }

    .sub-btn {
        font-size: 1.05rem;
    }

    /* ── Mobile menu ── */
    .mobile-menu-toggle {
        display: none;
        width: 100%;
        padding: 0.75rem 1.5rem;
        background: transparent;
        border: 0.1rem solid #333;
        color: white;
        font-family: 'Satoshi', sans-serif;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        justify-content: space-between;
        align-items: center;
        @media (max-width: 666px) {
            display: flex;
        }
    }

    .mobile-menu {
        display: none;
        flex-direction: column;
        border: 0.1rem solid #333;
        border-top: 0;
        @media (max-width: 666px) {
            display: flex;
        }
    }

    .mobile-menu-section {
        padding: 0.75rem 0;
    }
    .mobile-menu-section + .mobile-menu-section {
        border-top: 0.1rem solid #222;
    }

    .mobile-menu-label {
        padding: 0 1.5rem;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #555;
        margin-bottom: 0.5rem;
    }

    .mobile-menu-item {
        display: block;
        width: 100%;
        padding: 0.6rem 1.5rem;
        background: transparent;
        border: 0;
        color: #8B989C;
        font-family: 'Satoshi', sans-serif;
        font-size: 0.9rem;
        text-align: left;
        cursor: pointer;
        transition: color 0.2s, background-color 0.2s;
    }
    .mobile-menu-item:hover {
        color: white;
    }
    .mobile-menu-item.active {
        color: white;
        background: rgba(255, 255, 255, 0.05);
    }
</style>
