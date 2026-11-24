<script>
    // Bare card for the API renderer (see $lib/server/card-render.js): the
    // same component the tool exports, at its true size, then a ready flag
    // once fonts and images have settled.
    import { onMount, tick } from 'svelte';
    import YouTubeCard from '$lib/components/tools/YouTubeCard.svelte';
    import { FONTS_HREF } from '$lib/components/tools/yt-config.js';

    let { data } = $props();
    let cardEl = $state(null);

    onMount(async () => {
        const font = data.config.font;
        const weights = [400, 500, 700];
        await Promise.allSettled([
            ...weights.map((w) => document.fonts.load(`${w} 32px "${font}"`)),
            // Servers rarely have an emoji font; titles full of them would render as boxes.
            document.fonts.load('32px "Noto Color Emoji"', '\u{1F4DA}')
        ]);
        await document.fonts.ready;

        // The card picks its thumbnail through a maxres → sd → hq fallback, so
        // wait for the chosen one to land (or give up after 8s and render anyway).
        const hasThumb = Object.values(data.video.thumbnails ?? {}).some(Boolean);
        const start = Date.now();
        const settled = () => {
            const imgs = [...(cardEl?.querySelectorAll('img') ?? [])];
            const thumb = cardEl?.querySelector('[style*="background-image"]');
            return imgs.every((i) => i.complete) && (!hasThumb || !!thumb);
        };
        while (!settled() && Date.now() - start < 8000) await new Promise((r) => setTimeout(r, 50));

        // The thumbnail is a CSS background: decode it before the screenshot.
        const bg = /** @type {HTMLElement | null} */ (cardEl?.querySelector('[style*="background-image"]'))?.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if (bg) {
            const img = new Image();
            img.src = bg;
            await img.decode().catch(() => {});
        }
        await tick();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        /** @type {any} */ (window).__cardReady = true;
    });
</script>

<svelte:head>
    <meta name="robots" content="noindex" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href={FONTS_HREF} rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" rel="stylesheet" />
</svelte:head>

<div class="stage" data-render-stage>
    <YouTubeCard video={data.video} config={data.config} bind:cardEl />
</div>

<style>
    :global(html), :global(body) { margin: 0; background: transparent !important; }
    /* Left-aligned at its true width; the renderer screenshots the card itself. */
    .stage { display: flex; align-items: flex-start; }
</style>
