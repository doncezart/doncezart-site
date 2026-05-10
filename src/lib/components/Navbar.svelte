<script>
    import NavDropdown from './ui/NavDropdown.svelte';

    let mobileOpen = $state(false);

    const discoveryItems = [
        {
            label: 'Curated Resources',
            description: 'Tools, references & articles worth bookmarking',
            href: '/discovery/curated-resources'
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
            <a href="https://discord.gg/aJUAyFVyqM" class="btn-navbar">Discord Server</a>
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
    <div class="nav-links-mobile" id="menu-mobile">
        <a href="/" class="btn-navbar" onclick={() => (mobileOpen = false)}>My work</a>
        <a href="/assets" class="btn-navbar" onclick={() => (mobileOpen = false)}>Assets</a>
        <a href="/discovery" class="btn-navbar" onclick={() => (mobileOpen = false)}>Discovery</a>
        <a href="/socials" class="btn-navbar" onclick={() => (mobileOpen = false)}>Socials</a>
        <a href="/contact" class="btn-navbar" onclick={() => (mobileOpen = false)}>Get in Touch</a>
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

    .nav-links-mobile {
        background: var(--color-bg);
        position: sticky;
        top: 4.5rem;
        z-index: 99;
        display: flex;
        flex-direction: column;
        padding: var(--space-sm) 0 var(--space-md);
        border-bottom: var(--border-solid);
    }

    .nav-links-mobile .btn-navbar {
        padding: 0.5rem var(--container-pad);
        text-align: left;
    }
</style>