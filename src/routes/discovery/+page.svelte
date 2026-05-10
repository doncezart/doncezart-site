<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    const sections = [
        {
            slug: 'curated-resources',
            label: 'Curated Resources',
            description: 'Tools, references & articles worth bookmarking.'
        },
        {
            slug: 'tutorials',
            label: 'Tutorials',
            description: 'Step-by-step guides and learning material.'
        },
        {
            slug: 'pure-art',
            label: 'Pure Art',
            description: 'Artwork and visual inspiration, no context needed.'
        },
        {
            slug: 'videography',
            label: 'Videography',
            description: 'Film, motion, and cinematography work.'
        }
    ];
</script>

<svelte:head>
    <title>Discovery — DONCEZART</title>
    <meta name="description" content="A curated library of media — handpicked resources, art, and inspiration." />
</svelte:head>

<PageHeader
    title="Discovery"
    subtitle="A curated library of media — handpicked resources, art, and inspiration."
/>

<div class="sections-grid">
    {#each sections as section}
        <a href="/discovery/{section.slug}" class="section-card">
            <span class="section-label">{section.label}</span>
            <span class="section-desc">{section.description}</span>
            <span class="section-coming">Coming soon</span>
        </a>
    {/each}
</div>

<style>
    .sections-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-md);
        padding: 0 var(--container-pad) var(--space-4xl);
    }

    @media (max-width: 1200px) {
        .sections-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 666px) {
        .sections-grid { grid-template-columns: 1fr; }
    }

    .section-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        padding: var(--space-xl);
        border: var(--border);
        text-decoration: none;
        transition: border-color var(--transition-base), background var(--transition-base);
    }
    .section-card:hover {
        border-color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.03);
    }

    .section-label {
        font-family: var(--font-display);
        font-size: var(--text-xl);
        font-weight: 600;
        color: var(--color-text-primary);
    }

    .section-desc {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        line-height: 1.5;
        flex: 1;
    }

    .section-coming {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        opacity: 0.4;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-top: var(--space-sm);
    }
</style>
