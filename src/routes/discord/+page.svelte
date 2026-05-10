<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    const servers = [
        {
            name: 'DONCEZART Community',
            description: 'The main community hub — a gathering place for fans, collaborators, and creatives. Open to everyone.',
            details: 'Public community',
            href: 'https://discord.gg/aJUAyFVyqM'
        },
        {
            name: 'DONCEZART Personal',
            description: "The owner's personal server — a smaller, more intimate space. Link will be updated by the owner.",
            details: 'Personal server',
            href: '#'
        }
    ];
</script>

<svelte:head>
    <title>Discord — DONCEZART</title>
    <meta name="description" content="Join the DONCEZART Discord community." />
</svelte:head>

<PageHeader title="Discord" subtitle="Join the community." />

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
                    class="join-btn"
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
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--container-pad) var(--space-4xl);
    }

    .servers-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-xl);
    }

    @media (max-width: 666px) {
        .servers-grid {
            grid-template-columns: 1fr;
        }
    }

    .server-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        border: var(--border);
        padding: var(--space-2xl);
        border-radius: var(--radius);
    }

    .discord-icon {
        font-size: var(--text-2xl);
        color: var(--color-text-secondary);
        opacity: 0.6;
    }

    .server-name {
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0;
    }

    .server-details {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        opacity: 0.5;
        margin: 0;
    }

    .server-desc {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        line-height: 1.6;
        margin: 0;
        flex: 1;
    }

    .join-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 2rem;
        font-family: var(--font-body);
        font-size: var(--text-base);
        font-weight: 400;
        text-decoration: none;
        cursor: pointer;
        border-radius: var(--radius);
        background: var(--color-text-primary);
        color: var(--color-bg);
        border: var(--border-solid);
        transition:
            background var(--transition-base),
            color var(--transition-base);
        align-self: flex-start;
        margin-top: var(--space-sm);
    }

    .join-btn:hover {
        background: var(--color-bg);
        color: var(--color-text-primary);
    }
</style>
