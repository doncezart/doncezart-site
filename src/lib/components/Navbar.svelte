<script>
    // The one navbar every public page uses (rendered by LandingShell): logo
    // left, links centred, a call to action right, frosting once the page
    // scrolls. Tools and Discovery open dropdowns. Under 860px the links move
    // into a full-screen menu (numbered links, Tools and Discovery as cards,
    // the CTA and socials pinned at the bottom); under 420px the CTA moves in
    // there too.
    import NavDropdown from './ui/NavDropdown.svelte';
    import { tools } from '$lib/data/tools.js';
    import { page } from '$app/state';
    import { fade, fly, slide } from 'svelte/transition';
    import { EMAIL, SOCIALS } from '$lib/data/site.js';

    // `cta`: the button on the right. Most pages ask for a project; the
    // designer side points at the tools instead.
    let {
        discoverySections = [],
        scrolled = false,
        cta = { href: '/contact', label: 'Start a project', track: 'contact' }
    } = $props();

    let mobileOpen = $state(false);
    let discoveryOpen = $state(false);
    let toolsOpen = $state(false);

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

    let toolsItems = $derived(tools.map(t => ({
        label: t.name,
        description: t.description,
        href: t.href
    })));

    const here = (href) => page.url.pathname === href || page.url.pathname.startsWith(href + '/');
    const track = (link, source) => window.umami?.track('nav-click', source ? { link, source } : { link });

    function onKeydown(e) {
        if (e.key === 'Escape' && mobileOpen) closeMobile();
    }

    // Discord stays on the Socials page, not in the menu.
    const menuSocials = SOCIALS.filter((s) => s.name !== 'Discord');
    // Staggered entrance: each row flies in a beat after the one above.
    const enter = (i) => ({ y: 18, duration: 380, delay: 60 + i * 45, opacity: 0 });

    function closeMobile() {
        mobileOpen = false;
        discoveryOpen = false;
        toolsOpen = false;
    }
</script>

<svelte:window onkeydown={onKeydown} />

<header class="nav navbar" class:scrolled class:menu-open={mobileOpen}>
    <a href="/" class="brand" aria-label="DONCEZART home" onclick={() => track('home-logo')}>
        <img src="/logo-long.svg" alt="" />
    </a>

    <nav class="links" aria-label="Main">
        <a href="/#results" onclick={() => track('results')}>Results</a>
        <a href="/my-work" class:active={here('/my-work')} onclick={() => track('my-work')}>My Work</a>
        <NavDropdown label="Tools" active={here('/tools')} items={toolsItems} />
        <NavDropdown label="Discovery" active={here('/discovery')} items={discoveryItems} />
        <a href="/socials" class:active={here('/socials')} onclick={() => track('socials')}>Socials</a>
    </nav>

    <div class="end">
        <a href={cta.href} class="btn btn-sm" onclick={() => track(cta.track)}>{cta.label}</a>
        <button class="hamburger" class:open={mobileOpen} onclick={() => (mobileOpen ? closeMobile() : (mobileOpen = true))}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} aria-controls="mobile-menu">
            <span></span><span></span>
        </button>
    </div>
</header>

{#if mobileOpen}
    <div id="mobile-menu" class="mm" role="dialog" aria-modal="true" aria-label="Menu" transition:fade={{ duration: 200 }}>
        <div class="mm-glow" aria-hidden="true"></div>
        <nav class="mm-nav" aria-label="Main">
            {#snippet row(i, href, label, name, active = false)}
                <a {href} class="mm-link" class:active onclick={() => { track(name, 'mobile'); closeMobile(); }} in:fly={enter(i)}>
                    <small>{String(i + 1).padStart(2, '0')}</small>
                    <span class="mm-label">{label}</span>
                    <i class="fa-solid fa-arrow-right mm-arrow" aria-hidden="true"></i>
                </a>
            {/snippet}
            {#snippet group(i, label, open, toggle, items, active)}
                <button type="button" class="mm-link" class:active class:open onclick={toggle} aria-expanded={open} in:fly={enter(i)}>
                    <small>{String(i + 1).padStart(2, '0')}</small>
                    <span class="mm-label">{label}</span>
                    <i class="fa-solid fa-plus mm-arrow" aria-hidden="true"></i>
                </button>
                {#if open}
                    <div class="mm-cards" transition:slide={{ duration: 220 }}>
                        {#each items as it}
                            <a href={it.href} class="mm-card" class:active={here(it.href)} onclick={closeMobile}>
                                <i class="{it.icon} mm-card-icon" aria-hidden="true"></i>
                                <span class="mm-card-text">
                                    <b>{it.label}</b>
                                    {#if it.description}<small>{it.description}</small>{/if}
                                </span>
                            </a>
                        {/each}
                    </div>
                {/if}
            {/snippet}

            {@render row(0, '/#results', 'Results', 'results')}
            {@render row(1, '/my-work', 'My Work', 'my-work', here('/my-work'))}
            {@render group(2, 'Tools', toolsOpen, () => (toolsOpen = !toolsOpen),
                [{ label: 'All tools', description: 'Every free tool in one place.', href: '/tools', icon: 'fa-solid fa-toolbox' },
                 ...tools.map((t) => ({ label: t.name, description: t.description, href: t.href, icon: t.icon }))],
                here('/tools'))}
            {@render group(3, 'Discovery', discoveryOpen, () => (discoveryOpen = !discoveryOpen),
                [{ label: 'Browse everything', description: 'Videography, resources, tutorials and art.', href: '/discovery', icon: 'fa-solid fa-compass' },
                 ...discoverySections.map((s) => ({ label: s.name, description: s.description ?? '', href: `/discovery/${s.slug}`, icon: 'fa-solid fa-hashtag' }))],
                here('/discovery'))}
            {@render row(4, '/socials', 'Socials', 'socials', here('/socials'))}
        </nav>

        <div class="mm-foot" in:fly={enter(5)}>
            <a href={cta.href} class="btn mm-cta" onclick={() => { track(cta.track, 'mobile'); closeMobile(); }}>
                {cta.label} <i class="fa-solid fa-arrow-right"></i>
            </a>
            <div class="mm-meta">
                <a href="mailto:{EMAIL}" class="mm-email">{EMAIL}</a>
                <div class="mm-socials">
                    {#each menuSocials as so}
                        <a href={so.href} target="_blank" rel="noopener noreferrer" aria-label={so.name}
                            onclick={() => window.umami?.track('social-click', { platform: so.name, location: 'mobile-menu' })}><i class={so.icon}></i></a>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Three columns so the links sit dead centre (mirrors the landing nav). */
    .nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 40;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 2rem;
        padding: 1.25rem clamp(1.25rem, 4vw, 3rem);
        border-bottom: 1px solid transparent;
        transition: background 0.4s, border-color 0.4s, backdrop-filter 0.4s, padding 0.4s;
    }
    .nav.scrolled {
        padding-block: 0.85rem;
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        border-bottom-color: rgba(255, 255, 255, 0.12);
    }
    /* Menu open: the bar sits above the menu (its logo and the X stay put). */
    .nav.menu-open {
        z-index: 510;
        background: transparent;
        border-bottom-color: transparent;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }
    .nav.menu-open .end .btn { visibility: hidden; }
    .brand { justify-self: start; display: flex; }
    .brand img { height: 11px; width: auto; display: block; }

    .links { display: flex; align-items: center; gap: 2.25rem; }
    .links a,
    .links :global(button) { white-space: nowrap; }
    .links a {
        color: rgba(255, 255, 255, 0.68);
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: color 0.2s;
    }
    .links a:hover,
    .links a.active { color: #fff; }

    .end { justify-self: end; display: flex; align-items: center; gap: 1rem; }

    /* Menu button: two bars that cross into an X when the menu is open. It
       sits above the menu overlay, so it is also the close button. */
    .hamburger {
        position: relative;
        display: none;
        width: 2.6rem;
        height: 2.6rem;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.35);
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
    }
    .hamburger span {
        position: absolute;
        left: 50%;
        width: 1.05rem;
        height: 1.5px;
        margin-left: -0.525rem;
        border-radius: 2px;
        background: #fff;
        transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.1, 1), top 0.35s cubic-bezier(0.2, 0.7, 0.1, 1);
    }
    .hamburger span:first-child { top: calc(50% - 4px); }
    .hamburger span:last-child { top: calc(50% + 3px); }
    .hamburger.open { border-color: rgba(255, 43, 31, 0.6); background: rgba(255, 43, 31, 0.12); }
    .hamburger.open span:first-child { top: calc(50% - 0.75px); transform: rotate(45deg); }
    .hamburger.open span:last-child { top: calc(50% - 0.75px); transform: rotate(-45deg); }

    /* ── Full-screen mobile menu ── */
    .mm, .mm * { box-sizing: border-box; }
    .mm {
        position: fixed;
        inset: 0;
        z-index: 500;
        display: flex;
        flex-direction: column;
        padding: calc(4.6rem + env(safe-area-inset-top, 0px)) clamp(1.25rem, 4vw, 3rem) calc(1.25rem + env(safe-area-inset-bottom, 0px));
        overflow: hidden;
        background: #050505;
        font-family: var(--font-body);
    }
    .mm-glow {
        position: absolute;
        inset: auto -30% -35% 10%;
        height: 70%;
        background: radial-gradient(closest-side, rgba(255, 43, 31, 0.38), rgba(255, 43, 31, 0.08) 55%, transparent);
        filter: blur(30px);
        pointer-events: none;
    }
    .mm-nav {
        position: relative;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: flex;
        flex-direction: column;
        padding-top: clamp(0.5rem, 3vh, 1.75rem);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        scrollbar-width: none;
    }
    .mm-link {
        display: grid;
        grid-template-columns: 2.1rem 1fr auto;
        align-items: baseline;
        width: 100%;
        padding: clamp(0.45rem, 1.6vh, 0.8rem) 0;
        border: 0;
        background: none;
        color: #fff;
        text-align: left;
        text-decoration: none;
        cursor: pointer;
    }
    .mm-link small {
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.35);
        transition: color 0.2s;
    }
    .mm-label {
        font-family: var(--font-display);
        font-size: clamp(1.75rem, min(9vw, 6.2vh), 2.6rem);
        font-weight: 600;
        line-height: 1.05;
        letter-spacing: -0.01em;
        transition: color 0.2s, transform 0.3s cubic-bezier(0.2, 0.7, 0.1, 1);
    }
    .mm-arrow {
        align-self: center;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.3);
        transition: color 0.2s, transform 0.3s cubic-bezier(0.2, 0.7, 0.1, 1);
    }
    @media (hover: hover) {
        .mm-link:hover .mm-label { transform: translateX(0.35rem); }
        .mm-link:not(.open):hover .mm-arrow { color: #fff; transform: translateX(0.2rem); }
    }
    .mm-link:focus-visible .mm-label { transform: translateX(0.35rem); }
    .mm-link.open .mm-arrow { color: #ff2b1f; transform: rotate(45deg); }
    .mm-link.active small, .mm-link.open small { color: #ff2b1f; }
    .mm-link.active .mm-label { color: #ff2b1f; }

    .mm-cards { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.4rem; padding: 0.2rem 0 0.7rem 2.1rem; }
    .mm-card {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.6rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
        color: #fff;
        text-decoration: none;
        transition: border-color 0.2s, background 0.2s;
    }
    .mm-card:hover, .mm-card.active { border-color: rgba(255, 43, 31, 0.5); background: rgba(255, 43, 31, 0.08); }
    .mm-card-icon {
        flex-shrink: 0;
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.06);
        font-size: 0.85rem;
        color: #ff2b1f;
    }
    .mm-card-text { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .mm-card-text b { font-size: 0.9rem; font-weight: 600; }
    .mm-card-text small {
        overflow: hidden;
        font-size: 0.74rem;
        line-height: 1.35;
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    .mm-foot {
        position: relative;
        display: grid;
        gap: 0.9rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .mm-cta { justify-content: center; width: 100%; }
    .mm-meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .mm-email { font-size: 0.85rem; color: rgba(255, 255, 255, 0.6); text-decoration: none; }
    .mm-email:hover { color: #fff; }
    .mm-socials { display: flex; gap: 0.4rem; }
    .mm-socials a {
        display: grid;
        place-items: center;
        width: 2.3rem;
        height: 2.3rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.75);
        font-size: 0.9rem;
        text-decoration: none;
        transition: border-color 0.2s, color 0.2s, background 0.2s;
    }
    .mm-socials a:hover { border-color: #ff2b1f; background: rgba(255, 43, 31, 0.12); color: #fff; }

    @media (prefers-reduced-motion: reduce) {
        .hamburger span, .mm-label, .mm-arrow { transition: none; }
    }

    @media (max-width: 1080px) {
        .nav { gap: 1.5rem; }
        .links { gap: 1.6rem; }
    }
    @media (max-width: 860px) {
        .nav { grid-template-columns: 1fr auto; }
        .links { display: none; }
        .brand img { height: 10px; }
        .hamburger { display: block; }
    }
    @media (max-width: 420px) {
        /* !important: the shared .btn rules are more specific than this scoped one. */
        .end .btn { display: none !important; }
    }
</style>
