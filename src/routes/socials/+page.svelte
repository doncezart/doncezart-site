<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    const socials = [
        { platform: 'Discord', handle: 'doncezart', href: 'https://discord.gg/aJUAyFVyqM', icon: 'fa-brands fa-discord' },
        { platform: 'X (Twitter)', handle: '@doncezart', href: 'https://x.com/doncezart', icon: 'fa-brands fa-x-twitter' },
        { platform: 'Instagram', handle: '@doncezart', href: 'https://instagram.com/doncezart', icon: 'fa-brands fa-instagram' },
        { platform: 'YouTube', handle: '@doncezart', href: 'https://youtube.com/@doncezart', icon: 'fa-brands fa-youtube' },
        { platform: 'TikTok', handle: '@doncezart', href: 'https://tiktok.com/@doncezart', icon: 'fa-brands fa-tiktok' }
    ];
</script>

<svelte:head>
    <title>Socials — DONCEZART</title>
    <meta name="description" content="Find DONCEZART on social media." />
</svelte:head>

<PageHeader title="Socials" subtitle="Find me across the internet." />

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
    .socials-list {
        list-style: none;
        padding: 0 var(--container-pad);
        margin: 0 auto;
        max-width: 48rem;
        padding-bottom: var(--space-4xl);
        display: flex;
        flex-direction: column;
    }

    .social-row {
        display: flex;
        align-items: center;
        gap: var(--space-lg);
        padding: var(--space-lg) 0;
        border-bottom: var(--border);
        text-decoration: none;
        transition: opacity var(--transition-fast);
    }
    li:first-child .social-row {
        border-top: var(--border);
    }
    .social-row:hover {
        opacity: 0.7;
    }

    .social-icon {
        font-size: var(--text-xl);
        color: var(--color-text-primary);
        width: 1.5rem;
        text-align: center;
    }

    .social-platform {
        font-family: var(--font-display);
        font-size: var(--text-lg);
        font-weight: 600;
        color: var(--color-text-primary);
        flex: 1;
    }

    .social-handle {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
    }

    .social-arrow {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
    }
</style>
