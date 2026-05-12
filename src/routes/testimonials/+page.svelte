<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    $effect(() => { window.umami?.track('page-view', { page: 'testimonials' }); });
</script>

<svelte:head>
    <title>Testimonials — DONCEZART</title>
    <meta name="description" content="What clients and collaborators say about working with DONCEZART." />
</svelte:head>

<PageHeader
    title="Testimonials"
    subtitle="What clients and collaborators say about working together."
/>

<div class="coming-soon">
    <p>Client reviews are being collected and will appear here soon.</p>
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
</style>
