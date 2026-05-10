<script>
    let { title, subtitle = '' } = $props();
</script>

<header class="page-header">
    <h1>{title}</h1>
    {#if subtitle}
        <p class="subtitle">{subtitle}</p>
    {/if}
</header>

<style>
    .page-header {
        text-align: center;
        padding: var(--space-4xl) 0 var(--space-2xl);
    }

    h1 {
        font-family: var(--font-display);
        font-size: var(--text-4xl);
        font-weight: 700;
        color: var(--color-text-primary);
        margin-bottom: var(--space-md);
    }

    .subtitle {
        font-family: var(--font-body);
        font-size: var(--text-base);
        color: var(--color-text-secondary);
        max-width: 50ch;
        margin: 0 auto;
        line-height: 1.6;
    }
</style>
