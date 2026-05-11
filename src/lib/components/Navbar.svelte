<script>
    import NavDropdown from './ui/NavDropdown.svelte';
    import { fade } from 'svelte/transition';

    let mobileOpen = $state(false);

    const discoveryItems = [
        {
            label: 'Resources',
            description: 'Tools, references & articles worth bookmarking',
            href: '/discovery/resources'
        },
        {
            label: 'Tutorials',
            description: 'Step-by-step guides and learning material',
            href: '/discovery/tutorials'
        },
        {
            label: 'Pure Art',
            description: 'Artwork and visual inspiration, no context needed',
            href: '/discovery/pure-art'
        },
        {
            label: 'Videography',
            description: 'Film, motion, and cinematography work',
            href: '/discovery/videography'
        }
    ];
</script>

<div class="navbar">
    <div class="nav-links-desktop">
        <div class="btn-gap">
            <a href="/" class="btn-navbar">My work</a>
            <a href="/assets" class="btn-navbar">Assets</a>
            <NavDropdown
                label="Discovery"
                headerDescription="A curated library of media — handpicked resources, art, and inspiration."
                items={discoveryItems}
            />
        </div>
        <div class="center">
            <a href="/"><img src="logo-square.svg" alt="DONCEZART Logo" /></a>
        </div>
        <div class="btn-gap">
            <a href="/discord" class="btn-navbar">Discord Servers</a>
            <a href="/socials" class="btn-navbar">Socials</a>
            <a href="/contact" class="btn-navbar">Contact</a>
        </div>
    </div>
    <button
        class="hamburger"
        onclick={() => (mobileOpen = !mobileOpen)}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
    >
        {mobileOpen ? '×' : '☰'}
    </button>
</div>

{#if mobileOpen}
    <div class="mobile-menu" transition:fade={{ duration: 150 }}>
        <button class="mobile-close" onclick={() => (mobileOpen = false)} aria-label="Close menu">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <nav class="mobile-nav">
            <a href="/" class="mobile-link" onclick={() => (mobileOpen = false)}>My Work</a>
            <a href="/assets" class="mobile-link" onclick={() => (mobileOpen = false)}>Assets</a>
            <span class="mobile-section-label">Discovery</span>
            <a href="/discovery/resources" class="mobile-link mobile-sub" onclick={() => (mobileOpen = false)}>Resources</a>
            <a href="/discovery/tutorials" class="mobile-link mobile-sub" onclick={() => (mobileOpen = false)}>Tutorials</a>
            <a href="/discovery/pure-art" class="mobile-link mobile-sub" onclick={() => (mobileOpen = false)}>Pure Art</a>
            <a href="/discovery/videography" class="mobile-link mobile-sub" onclick={() => (mobileOpen = false)}>Videography</a>
            <a href="/discord" class="mobile-link" onclick={() => (mobileOpen = false)}>Discord Servers</a>
            <a href="/socials" class="mobile-link" onclick={() => (mobileOpen = false)}>Socials</a>
            <a href="/contact" class="mobile-link" onclick={() => (mobileOpen = false)}>Contact</a>
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
        z-index: 100;

        height: 2.5rem;
        padding: 1rem var(--container-pad);

        background: var(--color-glass-bg);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border-bottom: var(--border);
    }

    @media (max-width: 666px) {
        .navbar {
            height: 2rem;
        }
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

    .hamburger {
        margin-left: auto;
        background: transparent;
        border: 0;
        font-family: var(--font-display);
        color: var(--color-text-primary);
        font-size: 1.4rem;
        cursor: pointer;
        line-height: 1;
        padding: 0;
    }

    @media (min-width: 667px) {
        .hamburger {
            display: none;
        }
    }

    .mobile-menu {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(0, 0, 0, 0.97);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        display: flex;
        flex-direction: column;
        padding: var(--space-xl) var(--container-pad);
        overflow-y: auto;
    }

    .mobile-close {
        position: absolute;
        top: 1rem;
        right: var(--container-pad);
        background: transparent;
        border: 0;
        color: var(--color-text-primary);
        font-size: 1.5rem;
        cursor: pointer;
        line-height: 1;
        padding: 0;
    }

    .mobile-nav {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        margin-top: var(--space-4xl);
    }

    .mobile-link {
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 500;
        color: var(--color-text-primary);
        text-decoration: none;
        transition: opacity var(--transition-fast);
    }
    .mobile-link:hover {
        opacity: 0.7;
    }

    .mobile-sub {
        font-size: var(--text-xl);
        padding-left: var(--space-lg);
        color: var(--color-text-secondary);
    }
    .mobile-sub:hover {
        opacity: 0.7;
    }

    .mobile-section-label {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        opacity: 0.5;
        padding-bottom: 0;
        margin-bottom: calc(-1 * var(--space-sm));
    }
</style>