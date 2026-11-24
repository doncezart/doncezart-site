<script>
	import Seo from '$lib/components/Seo.svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    const servers = [
        {
            name: 'Nitro Design',
            description: 'A place to share your work, find clients, and ask for advice!',
            details: 'Community server',
            href: 'https://discord.gg/CyMGumJjkp'
        },
        {
            name: 'DONCEZART',
            description: 'My personal server where I can offer advice and feedback to you directly.',
            details: 'Personal server',
            href: 'https://discord.gg/aJUAyFVyqM'
        }
    ];
</script>

<Seo title="Discord" description="Join the DONCEZART Discord community." />

<PageHeader eyebrow="Community" title="Discord" subtitle="Join the community." />

<div class="page-content">
    <div class="servers-grid">
        {#each servers as server}
            <div class="server-card">
                <i class="fa-brands fa-discord discord-icon"></i>
                <h2 class="server-name">{server.name}</h2>
                <p class="server-details">{server.details}</p>
                <p class="server-desc">{server.description}</p>
                <a
                    href={server.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn"
                    onclick={() => window.umami?.track('discord-join', { server: server.name })}
                >
                    Join Server
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            </div>
        {/each}
    </div>
</div>

<style>
    .page-content {
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 clamp(1.25rem, 4vw, 3rem) var(--space-4xl);
    }
    .servers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    @media (max-width: 700px) {
        .servers-grid { grid-template-columns: 1fr; }
    }

    /* Frosted card, same surface as the contact form. */
    .server-card {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: clamp(1.5rem, 3vw, 2.25rem);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        transition: border-color 0.25s, transform 0.25s;
    }
    .server-card:hover { border-color: rgba(255, 255, 255, 0.3); transform: translateY(-3px); }

    .discord-icon {
        order: -2;
        display: grid;
        place-items: center;
        width: 3rem;
        height: 3rem;
        margin-bottom: 0.4rem;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(255, 255, 255, 0.04);
        font-size: 1.3rem;
        color: #fff;
    }
    .server-name {
        margin: 0;
        font-family: var(--font-display);
        font-size: clamp(1.5rem, 2.4vw, 2rem);
        font-weight: 600;
        line-height: 1.1;
        color: #fff;
    }
    /* Kind label sits above the name, as an eyebrow. */
    .server-details {
        order: -1;
        margin: 0;
        font-family: var(--font-display);
        font-size: 0.72rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
    }
    .server-desc {
        flex: 1;
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--muted);
    }
    .server-card .btn { align-self: flex-start; margin-top: 0.6rem; }
</style>
