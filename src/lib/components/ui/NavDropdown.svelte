<script>
    let { label, items = [], headerDescription = '' } = $props();

    let open = $state(false);
    let triggerEl = $state(null);
    let menuEl = $state(null);
    let menuLeft = $state(0);
    let menuTop = $state(0);

    function toggle() {
        open = !open;
    }

    // Portal: move node to body so backdrop-filter escapes the navbar's stacking context.
    function portal(node) {
        document.body.appendChild(node);
        return { destroy() { node.parentNode?.removeChild(node); } };
    }

    $effect(() => {
        if (!open) return;

        // Position panel flush under the navbar (not the button itself)
        if (triggerEl) {
            const rect = triggerEl.getBoundingClientRect();
            menuLeft = rect.left + rect.width / 2;
            const navbarEl = triggerEl.closest('.navbar');
            menuTop = navbarEl ? navbarEl.getBoundingClientRect().bottom : rect.bottom;
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
            use:portal
            class="menu"
            style="left: {menuLeft}px; top: {menuTop}px"
        >
            {#each items as item}
                <a
                    href={item.href}
                    class="menu-item"
                    onclick={() => { window.umami?.track('nav-click', { link: item.href }); open = false; }}
                >
                    <span class="item-label">{item.label}</span>
                    <span class="item-desc">{item.description}</span>
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
        font-size: var(--text-base);
        font-weight: 500;
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

    /* Portaled to body: position: fixed is now relative to the true viewport */
    .menu {
        position: fixed;
        transform: translateX(-50%);
        min-width: 280px;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border-left: var(--border);
        border-right: var(--border);
        border-bottom: var(--border);
        z-index: 400;
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
        font-family: var(--font-display);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 0.2rem;
    }

    .item-desc {
        display: block;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        line-height: 1.4;
    }
</style>
