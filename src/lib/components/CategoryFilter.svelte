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
        window.umami?.track('filter-category', { category: id });
    }

    function selectSubcategory(id) {
        activeSubcategory = id;
        showMobileMenu = false;
        window.umami?.track('filter-subcategory', { subcategory: id });
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
    /* ── Desktop filter rows: pill chips, same as the library's ── */
    .filter-rows {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
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
        gap: 0.5rem;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        flex: 1;
        padding: 2px;
    }
    .filter-scroll::-webkit-scrollbar {
        display: none;
    }

    .arrow-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: rgba(14, 14, 14, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: color 0.2s, border-color 0.2s;
        font-size: 0.65rem;
    }
    .arrow-btn:hover {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.3);
    }

    .filter-btn {
        flex-shrink: 0;
        padding: 0.5rem 1rem;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(14, 14, 14, 0.4);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: rgba(255, 255, 255, 0.7);
        font-family: var(--font-body);
        font-size: 0.88rem;
        font-weight: 500;
        line-height: 1.2;
        cursor: pointer;
        transition: color 0.2s, border-color 0.2s, background 0.2s;
        white-space: nowrap;
    }
    .filter-btn:hover {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.3);
    }
    .filter-btn.active {
        color: #fff;
        background: rgba(255, 43, 31, 0.16);
        border-color: rgba(255, 43, 31, 0.55);
    }
    .filter-btn:focus-visible { outline: 2px solid var(--accent, #ff2b1f); outline-offset: 2px; }

    .sub-btn {
        padding: 0.4rem 0.85rem;
        font-size: 0.8rem;
    }

    /* ── Mobile menu ── */
    .mobile-menu-toggle {
        display: none;
        width: 100%;
        padding: 0.8rem 1.1rem;
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        justify-content: space-between;
        align-items: center;
        @media (max-width: 666px) {
            display: flex;
        }
    }
    .mobile-menu-toggle i { font-size: 0.75rem; color: var(--accent, #ff2b1f); }

    .mobile-menu {
        display: none;
        flex-direction: column;
        margin-top: 0.5rem;
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        overflow: hidden;
        @media (max-width: 666px) {
            display: flex;
        }
    }

    .mobile-menu-section {
        padding: 0.75rem 0;
    }
    .mobile-menu-section + .mobile-menu-section {
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .mobile-menu-label {
        padding: 0 1.1rem;
        font-family: var(--font-display);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: rgba(255, 255, 255, 0.55);
        margin: 0 0 0.4rem;
    }

    .mobile-menu-item {
        display: block;
        width: 100%;
        padding: 0.6rem 1.1rem;
        background: transparent;
        border: 0;
        border-left: 2px solid transparent;
        color: rgba(255, 255, 255, 0.7);
        font-family: var(--font-body);
        font-size: 0.9rem;
        text-align: left;
        cursor: pointer;
        transition: color 0.2s, background-color 0.2s, border-color 0.2s;
    }
    .mobile-menu-item:hover {
        color: #fff;
    }
    .mobile-menu-item.active {
        color: #fff;
        background: rgba(255, 43, 31, 0.16);
        border-left-color: var(--accent, #ff2b1f);
    }
</style>
