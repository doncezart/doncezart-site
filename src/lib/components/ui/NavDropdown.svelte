<script>
    let { label, items = [], headerDescription = '' } = $props();

    let open = $state(false);
    let triggerEl = $state(null);
    let menuEl = $state(null);
    let menuLeft = $state(0);

    function toggle() {
        open = !open;
    }

    $effect(() => {
        if (!open) return;

        // Center panel under trigger button
        if (triggerEl) {
            const rect = triggerEl.getBoundingClientRect();
            menuLeft = rect.left + rect.width / 2;
        }

        function handleClickOutside(e) {
            if (
                triggerEl && !triggerEl.contains(e.target) &&
                menuEl && !menuEl.contains(e.target)
            ) {
                open = false;
            }
        }
        function handleKeydown(e) {
            if (e.key === 'Escape') open = false;
        }
        function handleScroll() {
            open = false;
        }

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleKeydown);
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('scroll', handleScroll);
        };
    });
</script>

<div class="dropdown">
    <button
        bind:this={triggerEl}
        class="trigger"
        class:open
        onclick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
    >
        {label}
        <i class="fa-solid fa-chevron-down chevron" class:rotated={open}></i>
    </button>

    {#if open}
        <div
            bind:this={menuEl}
            class="menu"
            style="left: {menuLeft}px"
        >
            <div class="menu-header">
                <span class="menu-header-title">{label}</span>
                {#if headerDescription}
                    <p class="menu-header-desc">{headerDescription}</p>
                {/if}
            </div>
            {#each items as item}
                <a
                    href={item.href}
                    class="menu-item"
                    onclick={() => (open = false)}
                >
                    <span class="item-label">{item.label}</span>
                    {#if item.description}
                        <span class="item-desc">{item.description}</span>
                    {/if}
                </a>
            {/each}
        </div>
    {/if}
</div>

<style>
    .dropdown {
        position: relative;
    }

    .trigger {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-family: var(--font-body);
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        transition: color var(--transition-fast);
    }
    .trigger:hover,
    .trigger.open {
        color: var(--color-text-primary);
    }

    .chevron {
        font-size: 0.55rem;
        transition: transform var(--transition-fast);
    }
    .rotated {
        transform: rotate(180deg);
    }

    /* Fixed position: always flush to the bottom of the navbar */
    .menu {
        position: fixed;
        top: var(--nav-height);
        transform: translateX(-50%);
        min-width: 280px;
        background: rgba(0, 0, 0, 0.88);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: var(--border);
        border-top: none;
        z-index: 99;
    }

    .menu-header {
        padding: var(--space-md) var(--space-lg) 0.75rem;
        border-bottom: var(--border);
    }
    .menu-header-title {
        display: block;
        font-family: var(--font-display);
        font-size: var(--text-xs);
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-text-primary);
        margin-bottom: 0.3rem;
    }
    .menu-header-desc {
        font-family: var(--font-body);
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        line-height: 1.5;
    }

    .menu-item {
        display: block;
        padding: 0.75rem var(--space-lg);
        border-bottom: var(--border);
        text-decoration: none;
        transition: background var(--transition-fast);
    }
    .menu-item:last-child {
        border-bottom: none;
    }
    .menu-item:hover {
        background: rgba(255, 255, 255, 0.04);
    }

    .item-label {
        display: block;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-primary);
        margin-bottom: 0.2rem;
    }
    .item-desc {
        display: block;
        font-family: var(--font-body);
        font-size: 0.73rem;
        color: var(--color-text-secondary);
        line-height: 1.4;
    }
</style>
