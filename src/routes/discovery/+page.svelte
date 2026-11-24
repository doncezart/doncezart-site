<script>
	import Seo from '$lib/components/Seo.svelte';
    import { onMount } from 'svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    let { data } = $props();

    // Cover clips only play while their card is on screen.
    let grid = $state();
    onMount(() => {
        if (!grid || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const vids = [...grid.querySelectorAll('video')];
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause();
            },
            { threshold: 0.25 }
        );
        vids.forEach((v) => io.observe(v));
        return () => io.disconnect();
    });
</script>

<Seo
    title="Discovery"
    description="A curated library of media: handpicked resources, art and inspiration."
/>

<PageHeader
    eyebrow="Discovery library"
    title="Discovery"
    subtitle="A curated library of media: handpicked resources, art, and inspiration."
/>

<div class="sections-grid" bind:this={grid}>
    {#each data.sections as section, i}
        <a
            href="/discovery/{section.slug}"
            class="section-card reveal"
            class:empty={!section.count}
            style="--d: {3 + i}"
        >
            <div class="covers" class:solo={section.covers?.length === 1}>
                {#if section.covers?.length}
                    {#each section.covers as c}
                        <figure>
                            {#if c.kind === 'video'}
                                <video src="{c.src}#t=0.1" poster={c.poster ?? undefined} muted loop playsinline preload="metadata"></video>
                            {:else}
                                <img src={c.src} alt="" loading="lazy" />
                            {/if}
                        </figure>
                    {/each}
                {:else}
                    <div class="covers-empty"><span>Coming soon</span></div>
                {/if}
            </div>
            <div class="section-body">
                <div class="section-head">
                    <span class="section-label">{section.name}</span>
                    <span class="section-count">{section.count ? section.count : 'Soon'}</span>
                </div>
                {#if section.description}
                    <span class="section-desc">{section.description}</span>
                {/if}
                <span class="section-go">Open <i class="fa-solid fa-arrow-right"></i></span>
            </div>
        </a>
    {/each}
</div>

<style>
    .sections-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1rem;
        max-width: 1500px;
        margin: 0 auto;
        padding: 0 clamp(1.25rem, 4vw, 3rem) clamp(4rem, 10vh, 6rem);
    }

    @media (max-width: 1200px) {
        .sections-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 666px) {
        .sections-grid { grid-template-columns: minmax(0, 1fr); }
    }

    .section-card {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 0.6rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        color: #fff;
        text-decoration: none;
        transition: border-color 0.2s, background 0.2s;
    }
    .section-card:hover {
        border-color: rgba(255, 255, 255, 0.28);
        background: rgba(20, 20, 20, 0.62);
    }

    .covers {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.4rem;
        aspect-ratio: 16 / 10;
        border-radius: 8px;
        overflow: hidden;
    }
    .covers.solo { grid-template-columns: minmax(0, 1fr); }
    .covers figure {
        margin: 0;
        min-height: 0;
        border-radius: 6px;
        overflow: hidden;
        background: var(--w-raised, #1b1b1b);
    }
    .covers video,
    .covers img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s;
    }
    .section-card:hover .covers video,
    .section-card:hover .covers img { transform: scale(1.04); }

    .covers-empty {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background:
            repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0 10px, transparent 10px 20px),
            var(--w-raised, #1b1b1b);
    }
    .covers-empty span {
        font-family: var(--font-display);
        font-size: 0.68rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.4);
    }

    .section-body {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        flex: 1;
        padding: 0 0.5rem 0.5rem;
    }
    .section-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
    }
    .section-label {
        font-family: var(--font-display);
        font-size: 1.2rem;
        font-weight: 600;
        color: #fff;
    }
    .section-count {
        font-family: var(--font-display);
        font-size: 0.8rem;
        color: var(--accent, #ff2b1f);
    }
    .section-card.empty .section-count {
        color: rgba(255, 255, 255, 0.4);
        font-size: 0.68rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .section-desc {
        font-family: var(--font-body);
        font-size: 0.88rem;
        color: var(--muted, rgba(255, 255, 255, 0.68));
        line-height: 1.5;
        flex: 1;
    }

    .section-go {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin-top: 0.35rem;
        font-size: 0.82rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
    }
    .section-go i { font-size: 0.8em; color: var(--accent, #ff2b1f); transition: transform 0.2s; }
    .section-card:hover .section-go { color: #fff; }
    .section-card:hover .section-go i { transform: translateX(3px); }

    @media (prefers-reduced-motion: reduce) {
        .covers video,
        .covers img { transition: none; }
    }
</style>
