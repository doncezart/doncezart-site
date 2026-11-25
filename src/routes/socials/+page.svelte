<script>
	import Seo from '$lib/components/Seo.svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    const socials = [
        { platform: 'Discord', handle: 'doncezart', href: 'https://discord.gg/aJUAyFVyqM', icon: 'fa-brands fa-discord' },
        { platform: 'Instagram', handle: '@doncezart', href: 'https://instagram.com/doncezart', icon: 'fa-brands fa-instagram' },
        { platform: 'YouTube', handle: '@doncezart', href: 'https://youtube.com/@doncezart', icon: 'fa-brands fa-youtube' },
        { platform: 'TikTok', handle: '@doncezart', href: 'https://tiktok.com/@doncezart', icon: 'fa-brands fa-tiktok' }
    ];
</script>

<Seo title="Socials" description="Find DONCEZART on YouTube, Instagram, TikTok and Discord." />

<PageHeader eyebrow="Socials" title="Socials" subtitle="Find me across the internet." />

<ul class="socials-list">
    {#each socials as s}
        <li>
            <a href={s.href} class="social-row" target="_blank" rel="noopener noreferrer"
                onclick={() => window.umami?.track('social-click', { platform: s.platform, location: 'socials-page' })}
            >
                <i class="{s.icon} social-icon"></i>
                <span class="social-platform">{s.platform}</span>
                <span class="social-handle">{s.handle}</span>
                <i class="fa-solid fa-arrow-right social-arrow"></i>
            </a>
        </li>
    {/each}
</ul>

<style>
    /* Same rows as before, now inside one frosted panel. */
    .socials-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        max-width: 46rem;
        margin: 0 auto var(--space-4xl);
        padding: 0.4rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        backdrop-filter: blur(28px) saturate(140%);
    }
    @media (max-width: 800px) {
        .socials-list { margin-inline: clamp(1.25rem, 4vw, 3rem); }
    }
    li + li { border-top: 1px solid rgba(255, 255, 255, 0.08); }

    .social-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.9rem 1rem;
        border-radius: 8px;
        text-decoration: none;
        transition: background 0.2s;
    }
    .social-row:hover { background: rgba(255, 255, 255, 0.05); }

    .social-icon {
        display: grid;
        place-items: center;
        width: 2.5rem;
        height: 2.5rem;
        flex: none;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.04);
        font-size: 1rem;
        color: #fff;
        transition: border-color 0.2s, background 0.2s;
    }
    .social-row:hover .social-icon { border-color: rgba(255, 43, 31, 0.55); background: rgba(255, 43, 31, 0.16); }

    .social-platform {
        flex: 1;
        font-family: var(--font-body);
        font-size: 1.05rem;
        font-weight: 600;
        color: #fff;
    }
    .social-handle { font-size: 0.88rem; color: var(--muted); }
    .social-arrow { font-size: 0.8rem; color: var(--accent); transition: transform 0.2s; }
    .social-row:hover .social-arrow { transform: translateX(3px); }
</style>
