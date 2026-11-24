<script>
    // Site footer for every page outside the landing/designer screens: brand
    // and a project button on the left, three link columns, then a bottom bar
    // (copyright, email, socials) over a faint oversized wordmark.
    // The compact version on the landing and designer pages
    // (landing/SiteFooter.svelte) uses the same type, links style and buttons.
    import { EMAIL, SOCIALS } from '$lib/data/site.js';

    let { discoverySections = [] } = $props();
    const year = new Date().getFullYear();

    const columns = $derived([
        {
            heading: 'Work',
            links: [
                { href: '/my-work', label: 'My Work' },
                { href: '/#results', label: 'Results' },
                { href: '/tools', label: 'Free tools' },
                { href: '/designer', label: 'For designers' }
            ]
        },
        {
            heading: 'Discovery',
            links: [
                { href: '/discovery', label: 'Browse all' },
                ...discoverySections.map((s) => ({ href: `/discovery/${s.slug}`, label: s.name }))
            ]
        },
        {
            heading: 'Connect',
            links: [
                { href: '/contact', label: 'Contact' },
                { href: '/socials', label: 'Socials' },
                { href: '/privacy', label: 'Privacy Policy' }
            ]
        }
    ]);
</script>

<footer class="footer">
    <div class="top">
        <div class="brand-col">
            <a href="/" class="brand" aria-label="DONCEZART home"><img src="/logo-long.svg" alt="" /></a>
            <p class="motto">The Swiss army knife of the creative world.</p>
            <a href="/contact" class="btn btn-sm cta" onclick={() => window.umami?.track('nav-click', { link: 'contact', source: 'footer' })}>
                Start a project <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <nav class="cols" aria-label="Footer">
            {#each columns as col}
                <div class="col">
                    <span class="heading">{col.heading}</span>
                    <ul>
                        {#each col.links as l}
                            <li><a href={l.href}>{l.label}</a></li>
                        {/each}
                    </ul>
                </div>
            {/each}
        </nav>
    </div>

    <div class="bottom">
        <small>© {year} DONCEZART. All rights reserved.</small>
        <a href="mailto:{EMAIL}" class="email">{EMAIL}</a>
        <div class="socials">
            {#each SOCIALS as so}
                <a
                    href={so.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={so.name}
                    title={so.name}
                    onclick={() => window.umami?.track('social-click', { platform: so.name, location: 'footer' })}
                ><i class={so.icon}></i></a>
            {/each}
        </div>
    </div>

    <div class="wordmark" aria-hidden="true"><img src="/logo-long.svg" alt="" /></div>
</footer>

<style>
    .footer,
    .footer * { box-sizing: border-box; }

    .footer {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: var(--container-max);
        margin: 0 auto;
        padding: clamp(2.75rem, 6vw, 4.5rem) clamp(1.25rem, 4vw, 3rem) 0;
        overflow: hidden;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-family: var(--font-body);
    }

    .top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
        gap: 3rem;
        padding-bottom: clamp(2.5rem, 5vw, 3.5rem);
    }

    .brand { display: inline-flex; }
    .brand img { display: block; width: auto; height: 13px; }
    .motto {
        max-width: 19rem;
        margin: 1.1rem 0 1.5rem;
        font-size: 0.95rem;
        line-height: 1.55;
        color: rgba(255, 255, 255, 0.6);
    }
    .cta { gap: 0.5rem; }

    .cols {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 2rem;
    }
    .heading {
        display: block;
        margin-bottom: 1rem;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.4);
    }
    .col ul { display: grid; gap: 0.7rem; margin: 0; padding: 0; list-style: none; }
    .col a {
        position: relative;
        font-size: 0.92rem;
        color: rgba(255, 255, 255, 0.78);
        text-decoration: none;
        transition: color 0.2s;
    }
    .col a::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -3px;
        height: 1px;
        background: var(--color-accent);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.1, 1);
    }
    .col a:hover { color: #fff; }
    .col a:hover::after { transform: scaleX(1); }

    .bottom {
        display: flex;
        align-items: center;
        gap: 1rem 2rem;
        padding: 1.25rem 0;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .bottom small { font-size: 0.8rem; color: rgba(255, 255, 255, 0.45); }
    .email {
        margin-left: auto;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
        text-decoration: none;
        transition: color 0.2s;
    }
    .email:hover { color: #fff; }
    .socials { display: flex; gap: 0.4rem; }
    .socials a {
        display: grid;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.75);
        font-size: 0.9rem;
        text-decoration: none;
        transition: border-color 0.2s, background 0.2s, color 0.2s;
    }
    .socials a:hover { border-color: var(--color-accent); background: rgba(255, 43, 31, 0.12); color: #fff; }

    /* The wordmark runs edge to edge and is cut off by the page bottom. */
    .wordmark {
        height: clamp(2.2rem, 6.2vw, 6.4rem);
        margin-top: 0.5rem;
        overflow: hidden;
        pointer-events: none;
        -webkit-mask-image: linear-gradient(to bottom, #000 10%, transparent 95%);
        mask-image: linear-gradient(to bottom, #000 10%, transparent 95%);
    }
    .wordmark img { display: block; width: 100%; height: auto; opacity: 0.08; }

    @media (max-width: 860px) {
        .top { grid-template-columns: minmax(0, 1fr); gap: 2.5rem; }
    }
    @media (max-width: 560px) {
        .cols { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem 1.25rem; }
        .bottom { flex-wrap: wrap; }
        .bottom small { order: 3; flex-basis: 100%; }
        .email { margin-left: 0; }
        .socials { margin-left: auto; }
    }
</style>
