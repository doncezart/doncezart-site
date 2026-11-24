<script>
	import Seo from '$lib/components/Seo.svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import ToolGrid from '$lib/components/landing/ToolGrid.svelte';

    const track = (name) => window.umami?.track('tools-index', { name });
</script>

<Seo
    title="Free tools"
    description="Free tools for video editors and designers: YouTube cards, social profile cards and cutting mat textures. No signup, no watermarks."
    image="/og/tools.png"
/>

<PageHeader
    eyebrow="Free tools"
    title="Tools"
    subtitle="Free utilities built for the creative workflow. No signup, no watermarks."
/>

<div class="wrap">
    <ToolGrid stagger={3} {track} />
</div>

<style>
    .wrap {
        max-width: 1500px;
        margin: 0 auto;
        padding: 0 clamp(1.25rem, 4vw, 3rem) var(--space-4xl);
    }
</style>
