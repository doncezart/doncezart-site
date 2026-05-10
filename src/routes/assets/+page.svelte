<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
</script>

<svelte:head>
    <title>Assets — DONCEZART</title>
    <meta name="description" content="Free design assets and resources from DONCEZART — coming soon." />
</svelte:head>

<PageHeader
    title="Assets"
    subtitle="Free design resources, templates, and downloads — coming soon."
/>

<div class="coming-soon">
    <p>This section is being built. Check back soon, or join the <a href="https://discord.gg/aJUAyFVyqM" target="_blank" rel="noopener noreferrer">Discord server</a> to be notified when it launches.</p>
</div>

<style>
    .coming-soon {
        text-align: center;
        padding-bottom: var(--space-4xl);
        max-width: 48ch;
        margin: 0 auto;
    }

    p {
        font-family: var(--font-body);
        font-size: var(--text-base);
        color: var(--color-text-secondary);
        line-height: 1.7;
    }

    a {
        color: var(--color-text-primary);
    }
    a:hover {
        opacity: 0.7;
    }
</style>
