<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import Button from '$lib/components/ui/Button.svelte';

    let { data } = $props();
</script>

<svelte:head>
    <title>{data.section.name} — Discovery — DONCEZART</title>
    <meta name="description" content={data.section.description} />
</svelte:head>

<PageHeader title={data.section.name} subtitle={data.section.description} />

<div class="placeholder">
    <p>Content for this section is being curated. Check back soon.</p>
    <Button href="/discovery" variant="outline">Back to Discovery</Button>
</div>

<style>
    .placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xl);
        text-align: center;
        padding-bottom: var(--space-4xl);
    }

    p {
        font-family: var(--font-body);
        color: var(--color-text-secondary);
        font-size: var(--text-base);
    }
</style>
