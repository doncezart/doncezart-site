<script>
    import NavDropdown from './ui/NavDropdown.svelte';
    import { fade, slide } from 'svelte/transition';

    let { discoverySections = [] } = $props();

    let mobileOpen = $state(false);
    let discoveryOpen = $state(false);

    $effect(() => {
        const body = document.body;
        const html = document.documentElement;
        body.style.overflow = mobileOpen ? 'hidden' : '';
        html.style.overflow = mobileOpen ? 'hidden' : '';
        return () => {
            body.style.overflow = '';
            html.style.overflow = '';
        };
    });

    let discoveryItems = $derived(discoverySections.map(s => ({
        label: s.name,
        description: s.description ?? '',
        href: `/discovery/${s.slug}`
    })));

    function closeMobile() {
        mobileOpen = false;
        discoveryOpen = false;
    }
</script>

<div class="navbar">
    <div class="nav-links-desktop">
        <div class="btn-gap">
            <a href="/my-work" class="btn-navbar" onclick={() => window.umami?.track('nav-click', { link: 'my-work' })}>My Work</a>
            <a href="/assets" class="btn-navbar" onclick={() => window.umami?.track('nav-click', { link: 'assets' })}>Assets</a>
            <NavDropdown
                label="Discovery"
                headerDescription="A curated library of media — handpicked resources, art, and inspiration."
                items={discoveryItems}
            />
        </div>
        <div class="center">
            <a href="/" onclick={() => window.umami?.track('nav-click', { link: 'home-logo' })}><img src="/logo-square.svg" alt="DONCEZART Logo" /></a>
        </div>
        <div class="btn-gap">
            <a href="/discord" class="btn-navbar" onclick={() => window.umami?.track('nav-click', { link: 'discord' })}>Discord Servers</a>
            <a href="/socials" class="btn-navbar" onclick={() => window.umami?.track('nav-click', { link: 'socials' })}>Socials</a>
            <a href="/contact" class="btn-navbar" onclick={() => window.umami?.track('nav-click', { link: 'contact' })}>Contact</a>
        </div>
    </div>
    <!-- Mobile: logo left + hamburger right -->
    <a href="/" class="mobile-logo-link">
        <img src="/logo-square.svg" alt="DONCEZART Logo" class="mobile-logo" />
    </a>
    <button
        class="hamburger"
        onclick={() => (mobileOpen = true)}
        aria-label="Open menu"
    >
        <i class="fa-solid fa-bars"></i>
    </button>
</div>

{#if mobileOpen}
    <div class="mobile-overlay" transition:fade={{ duration: 150 }}>
        <!-- Header row: same visual height as navbar, X button aligned with hamburger -->
        <div class="mobile-header">
            <button class="mobile-close" onclick={closeMobile} aria-label="Close menu">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <nav class="mobile-nav">
            <a href="/my-work" class="mobile-link" onclick={() => { window.umami?.track('nav-click', { link: 'my-work', source: 'mobile' }); closeMobile(); }}>My Work</a>
            <a href="/assets" class="mobile-link" onclick={() => { window.umami?.track('nav-click', { link: 'assets', source: 'mobile' }); closeMobile(); }}>Assets</a>

            <!-- Discovery collapsible -->
            <button
                class="mobile-link mobile-discovery-btn"
                onclick={() => (discoveryOpen = !discoveryOpen)}
                aria-expanded={discoveryOpen}
            >
                <span>Discovery</span>
                <i class="fa-solid fa-chevron-down mobile-chevron" class:rotated={discoveryOpen}></i>
            </button>
            {#if discoveryOpen}
                <div class="mobile-sub-group" transition:slide={{ duration: 180 }}>
                    {#each discoverySections as s}
                        <a href="/discovery/{s.slug}" class="mobile-sub-link" onclick={closeMobile}>{s.name}</a>
                    {/each}
                </div>
            {/if}

            <a href="/discord" class="mobile-link" onclick={() => { window.umami?.track('nav-click', { link: 'discord', source: 'mobile' }); closeMobile(); }}>Discord Servers</a>
            <a href="/socials" class="mobile-link" onclick={() => { window.umami?.track('nav-click', { link: 'socials', source: 'mobile' }); closeMobile(); }}>Socials</a>
            <a href="/contact" class="mobile-link" onclick={() => { window.umami?.track('nav-click', { link: 'contact', source: 'mobile' }); closeMobile(); }}>Contact</a>
        </nav>
    </div>
{/if}

<style>
    .navbar {
        align-items: center;
        display: flex;
        justify-content: flex-start;

        position: sticky;
        top: 0;
        z-index: 300;

        height: 2.5rem;
        padding: 1rem var(--container-pad);

        background: rgba(0, 0, 0, 0.85);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        backdrop-filter: blur(24px) saturate(180%);
        border-bottom: var(--border);
    }

    .nav-links-desktop {
        color: var(--color-text-primary);
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        max-width: var(--container-max);
        margin: 0 auto;
        position: relative;
    }

    @media (max-width: 666px) {
        .nav-links-desktop {
            display: none;
        }
    }

    .btn-gap {
        display: flex;
        justify-content: space-between;
        gap: var(--space-xl);
        align-items: center;
    }

    .center {
        left: 50%;
        position: absolute;
        transform: translateX(-50%);
    }

    img {
        margin: 0;
        height: 2rem;
        transition: height var(--transition-base);
        width: auto;
    }
    img:hover {
        height: 2.2rem;
    }

    .btn-navbar {
        background-color: transparent;
        border: 0;
        color: var(--color-text-secondary);
        transition: color var(--transition-fast);
        text-align: center;
        text-decoration: none;
        font-family: var(--font-body);
        font-weight: 500;
        font-size: var(--text-base);
        cursor: pointer;
        padding: 0;
    }
    .btn-navbar:hover {
        color: var(--color-text-primary);
    }

    /* ── Hamburger / X ── */
    .hamburger {
        display: none;
        margin-left: auto;
        background: transparent;
        border: 0;
        color: var(--color-text-primary);
        font-size: 1.25rem;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 1.5rem;
        text-align: center;
    }

    .mobile-logo-link {
        display: none;
    }

    @media (max-width: 666px) {
        .hamburger {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .mobile-logo-link {
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }
        .mobile-logo {
            height: 1.75rem;
            width: auto;
        }
    }

    /* ── Mobile overlay (full-screen, z-index above navbar) ── */
    .mobile-overlay {
        position: fixed;
        inset: 0;
        z-index: 500;
        background: rgba(0, 0, 0, 0.97);
        -webkit-backdrop-filter: blur(24px);
        backdrop-filter: blur(24px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* Mirrors the navbar height & alignment so X sits where hamburger was */
    .mobile-header {
        flex-shrink: 0;
        height: var(--nav-height);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 0 var(--container-pad);
        border-bottom: var(--border);
    }

    .mobile-close {
        background: transparent;
        border: 0;
        color: var(--color-text-primary);
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
    }

    .mobile-nav {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        display: flex;
        flex-direction: column;
        padding: var(--space-xl) var(--container-pad);
        gap: 0;
    }

    .mobile-link {
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 500;
        color: var(--color-text-primary);
        text-decoration: none;
        background: none;
        border: none;
        padding: var(--space-sm) 0;
        cursor: pointer;
        transition: opacity var(--transition-fast);
        display: block;
        text-align: left;
        width: 100%;
    }
    .mobile-link:hover {
        opacity: 0.6;
    }

    .mobile-discovery-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .mobile-chevron {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        transition: transform var(--transition-fast);
    }
    .mobile-chevron.rotated {
        transform: rotate(180deg);
    }

    .mobile-sub-group {
        display: flex;
        flex-direction: column;
        padding-left: var(--space-lg);
        padding-bottom: var(--space-xs);
    }

    .mobile-sub-link {
        font-family: var(--font-display);
        font-size: var(--text-xl);
        font-weight: 400;
        color: var(--color-text-secondary);
        text-decoration: none;
        padding: var(--space-xs) 0;
        transition: color var(--transition-fast);
        display: block;
    }
    .mobile-sub-link:hover {
        color: var(--color-text-primary);
    }
</style>