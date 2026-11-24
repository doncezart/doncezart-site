<script>
    // Page title block for the inner pages, in the landing page's type:
    // small eyebrow, display title with an optional red second line, lede.
    let { title, subtitle = '', eyebrow = '', hot = '', align = 'center' } = $props();
</script>

<header class="page-header" class:left={align === 'left'}>
    {#if eyebrow}<p class="eyebrow reveal" style="--d: 0">{eyebrow}</p>{/if}
    <h1 class="reveal" style="--d: 1">
        {title}{#if hot}<span class="hot">{hot}</span>{/if}
    </h1>
    {#if subtitle}
        <p class="subtitle reveal" style="--d: 2">{subtitle}</p>
    {/if}
</header>

<style>
    .page-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.1rem;
        text-align: center;
        padding: clamp(1.75rem, 6vh, 4rem) clamp(1.25rem, 4vw, 3rem) clamp(2rem, 5vh, 3rem);
    }
    .page-header.left { align-items: flex-start; text-align: left; }

    .eyebrow {
        margin: 0;
        font-family: var(--font-display);
        font-size: 0.75rem;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
    }

    h1 {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(2.4rem, min(5.6vw, 10vh), 5.25rem);
        line-height: 1.02;
        letter-spacing: -0.01em;
        color: #fff;
    }
    .hot { display: block; color: var(--accent, #ff2b1f); }

    .subtitle {
        max-width: 38rem;
        margin: 0;
        font-family: var(--font-body);
        font-size: clamp(1rem, 1.3vw, 1.15rem);
        line-height: 1.6;
        color: var(--muted, rgba(255, 255, 255, 0.68));
    }
</style>
