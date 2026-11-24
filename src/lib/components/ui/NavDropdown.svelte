<script>
    let { label, items = [], headerDescription = '', active = false } = $props();

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

        // Position panel flush under the navbar, clamped so it can never flow
        // off either side of the viewport regardless of menu width.
        function position() {
            if (!triggerEl || !menuEl) return;
            const rect = triggerEl.getBoundingClientRect();
            const navbarEl = triggerEl.closest('.navbar');
            menuTop = (navbarEl ? navbarEl.getBoundingClientRect().bottom : rect.bottom) + 8;
            const w = menuEl.offsetWidth || 280;
            const cx = rect.left + rect.width / 2;
            menuLeft = Math.min(Math.max(cx, w / 2 + 8), window.innerWidth - w / 2 - 8);
        }
        position();
        // Re-measure once laid out / fonts settled so the clamp uses the real width.
        const raf1 = requestAnimationFrame(() => { position(); });
        const raf2 = requestAnimationFrame(() => requestAnimationFrame(position));

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
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
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
        class:active
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
    .dropdown { position: relative; }

    .trigger {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0;
        border: none;
        background: none;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.68);
        cursor: pointer;
        transition: color 0.2s;
    }
    .trigger:hover,
    .trigger.open,
    .trigger.active { color: #fff; }
    .chevron { font-size: 0.55rem; transition: transform 0.15s; }
    .trigger.open .chevron { color: #ff2b1f; }
    .rotated { transform: rotate(180deg); }

    /* Portaled to body: position: fixed is relative to the true viewport. */
    .menu {
        position: fixed;
        z-index: 400;
        transform: translateX(-50%);
        min-width: 280px;
        max-width: min(360px, calc(100vw - 16px));
        padding: 0.4rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.86);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        backdrop-filter: blur(28px) saturate(140%);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
        animation: drop 0.18s ease-out;
    }
    @keyframes drop {
        from { opacity: 0; transform: translate(-50%, -4px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }

    .menu-item {
        display: block;
        padding: 0.7rem 0.85rem;
        border-radius: 8px;
        text-decoration: none;
        transition: background 0.15s;
    }
    .menu-item:hover { background: rgba(255, 255, 255, 0.06); }

    .item-label {
        display: block;
        margin-bottom: 0.15rem;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 600;
        color: #fff;
    }
    .menu-item:hover .item-label { color: #fff; }
    .item-desc {
        display: block;
        font-family: var(--font-body);
        font-size: 0.8rem;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.6);
    }

    @media (prefers-reduced-motion: reduce) {
        .menu { animation: none; }
    }
</style>
