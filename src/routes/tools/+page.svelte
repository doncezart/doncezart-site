<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import { tools } from '$lib/data/tools.js';

    $effect(() => { window.umami?.track('page-view', { page: 'tools' }); });
</script>

<svelte:head>
    <title>Tools — DONCEZART</title>
    <meta name="description" content="Free tools and utilities for digital artists: video reference cards and more." />
</svelte:head>

<PageHeader
    title="Tools"
    subtitle="Free utilities built for the creative workflow. No signup, no watermarks."
/>

<div class="tools-grid">
    {#each tools as tool}
        <a href={tool.href} class="tool-card">
            <span class="tool-icon"><i class={tool.icon}></i></span>
            <span class="tool-name">{tool.name}</span>
            <span class="tool-desc">{tool.description}</span>
            <span class="tool-cta">Open tool <i class="fa-solid fa-arrow-right"></i></span>
        </a>
    {/each}
</div>

<style>
    .tools-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-md);
        padding: 0 var(--container-pad) var(--space-4xl);
    }

    @media (max-width: 1200px) {
        .tools-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 666px) {
        .tools-grid { grid-template-columns: 1fr; }
    }

    .tool-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        padding: var(--space-xl);
        border: var(--border);
        text-decoration: none;
        transition: border-color var(--transition-base), background var(--transition-base);
    }
    .tool-card:hover {
        border-color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.03);
    }

    .tool-icon {
        color: var(--color-text-secondary);
        font-size: var(--text-xl);
    }

    .tool-name {
        font-family: var(--font-display);
        font-size: var(--text-xl);
        font-weight: 600;
        color: var(--color-text-primary);
    }

    .tool-desc {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        line-height: 1.5;
        flex: 1;
    }

    .tool-cta {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        margin-top: var(--space-sm);
    }
    .tool-cta i {
        font-size: 0.8em;
        transition: transform var(--transition-base);
    }
    .tool-card:hover .tool-cta i {
        transform: translateX(3px);
    }
</style>