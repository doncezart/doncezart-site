<script>
    import { formatViews, relativeDate } from '$lib/data/yt-format.js';
    import { LAYOUTS, resolveColors, ASPECTS, naturalAspect, layoutWidth } from './yt-config.js';

    let { video, config, cardEl = $bindable() } = $props();

    const layout = $derived(LAYOUTS[config.layout] ?? LAYOUTS.classic);

    const colors = $derived(resolveColors(config));

    // Per-layout design width + scale (vertical cards are 720 wide, like real Shorts frames).
    const LW = $derived(layoutWidth(config.layout));
    const LS = $derived(LW / 360);

    const pad = $derived(config.padding ?? 0);
    const contentW = $derived(LW - pad * 2);

    const aspect = $derived(config.aspect === 'auto' ? naturalAspect(config.layout) : (ASPECTS[config.aspect] ?? 16 / 9));

    // Exact card height for cover-fill layouts; min-height for the rest when an aspect is forced.
    const exactHeight = $derived(config.layout === 'hero' || config.layout === 'vertical'
        ? Math.round(LW / aspect)
        : null);
    const minHeight = $derived(exactHeight ?? (config.aspect !== 'auto' ? Math.round(LW / aspect) : null));

    // ── Shared metrics (multiplied from the 360px YouTube reference) ──
    const m = $derived({
        gap: Math.round(12 * LS * (config.spacing ?? 1)), // outer block gap
        gapT: Math.round(8 * LS * (config.spacing ?? 1)), // inner (title→channel→meta) gap
        name: Math.round(12 * LS), // 43 @1280
        avatar: Math.round(24 * LS), // 85 @1280
        badgeFont: Math.round(12 * LS),
        badgeRadius: Math.round(4 * LS),
        badgePad: Math.round(4 * LS),
        meta: Math.round(12 * LS),
        desc: Math.round(14 * LS) // 50 @1280
    });

    // All tunable CSS values flow through custom properties (Svelte 5 has no style interpolation).
    const cssVars = $derived(
        `--yt-font:'${config.font}',sans-serif;` +
        `--yt-bg:${colors.bg};--yt-text:${colors.text};--yt-secondary:${colors.secondary};` +
        `--yt-accent:${colors.accent};` +
        `--yt-radius:${config.radius}px;--yt-container-radius:${config.containerRadius ?? 0}px;` +
        `--yt-pad:${pad}px;` +
        `--yt-gap:${m.gap}px;--yt-gap-t:${m.gapT}px;--yt-name:${m.name}px;--yt-avatar:${m.avatar}px;` +
        `--yt-badge-font:${m.badgeFont}px;--yt-badge-radius:${m.badgeRadius}px;--yt-badge-pad:${m.badgePad}px;` +
        `--yt-meta:${m.meta}px;--yt-desc:${m.desc}px;` +
        `--yt-scrim-a:${(config.scrimOpacity ?? 85) / 100};` +
        `--yt-clamp:${config.titleLines ?? 2};--yt-clamp-desc:${config.descriptionLines ?? 2};` +
        `width:${LW}px;--yt-width:${LW}px;` +
        `height:${exactHeight ? exactHeight + 'px' : 'auto'};min-height:${minHeight ? minHeight + 'px' : 'auto'}`
    );

    // Thumbnail candidates with fallback chain (maxres → sd → hq).
    const candidates = $derived((() => {
        const t = video?.thumbnails ?? {};
        return [t.maxres, t.sd, t.hq].filter(Boolean);
    })());

    let thumbUrl = $state(null);
    let thumbIdx = $state(0);

    $effect(() => {
        if (!video || candidates.length === 0) {
            thumbUrl = null;
            thumbIdx = 0;
            return;
        }
        let alive = true;
        const idx = thumbIdx;
        const img = new Image();
        img.onload = () => { if (alive) thumbUrl = candidates[idx]; };
        img.onerror = () => { if (alive && idx < candidates.length - 1) thumbIdx++; };
        img.src = candidates[idx];
        return () => { alive = false; };
    });

    const titleSize = $derived(Math.round(layout.titleSize * LS * (config.titleScale ?? 1)));

    // Rough JS clamp so exported text never overflows its line budget.
    function clampText(text, fontSize, maxLines, width) {
        if (!text) return '';
        const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.55)));
        const max = charsPerLine * maxLines;
        if (text.length <= max) return text;
        return text.slice(0, max - 1).trimEnd() + '…';
    }

    function titleTextWidth() {
        const cw = contentW - 48;
        if (config.layout === 'split') return Math.round(cw * (1 - (config.ratio ?? 50) / 100)) - 24;
        if (config.layout === 'vertical') return Math.max(200, contentW - 24);
        if (config.layout === 'minimal') return Math.round(contentW * 0.85);
        return Math.max(240, cw);
    }
    function descWidth() {
        const cw = contentW - 48;
        if (config.layout === 'vertical') return Math.max(200, contentW - 24);
        return Math.max(240, cw);
    }

    const title = $derived(config.modules.title
        ? clampText(video?.title ?? '', titleSize, config.titleLines ?? 2, titleTextWidth())
        : '');
    const desc = $derived(config.modules.description
        ? clampText(video?.description ?? '', m.desc, config.descriptionLines ?? 2, descWidth())
        : '');
    const metaLine = $derived((() => {
        if (!config.modules.meta) return '';
        const views = video?.views != null ? `${formatViews(video.views)} views` : null;
        const date = video?.publishedAt ? relativeDate(video.publishedAt) : null;
        return [views, date].filter(Boolean).join(' · ');
    })());

    const showAvatar = $derived(config.modules.avatar && !!video?.channel?.avatarUrl && config.modules.channel);

    const thumbHeight = $derived(Math.round(LW * 9 / 16));
</script>

<div
    bind:this={cardEl}
    class="ycard ly-{config.layout}"
    style={cssVars}
>
    {#if config.layout === 'classic'}
        <div class="cl-wrap">
            {@render thumb(thumbHeight)}
            <div class="yt-text">
                {@render titleEl()}
                {@render channelRow()}
                {@render metaEl()}
            </div>
        </div>

    {:else if config.layout === 'split'}
        <div class="sp-wrap" style="grid-template-columns:{config.ratio ?? 50}% 1fr">
            <div class="sp-media">{@render thumb('fill')}</div>
            <div class="sp-text">
                {@render titleEl()}
                {@render channelRow()}
                {@render metaEl()}
                {@render descEl()}
            </div>
        </div>

    {:else if config.layout === 'stacked'}
        <div class="st-wrap">
            {@render thumb(thumbHeight)}
            <div class="st-text">
                {@render titleEl()}
                <div class="st-sub">
                    {@render channelRow()}
                    {@render metaEl()}
                </div>
                {@render descEl()}
            </div>
        </div>

    {:else if config.layout === 'hero'}
        <div class="hr-wrap">
            {#if thumbUrl}
                <div class="hr-bg" style="background-image:url('{thumbUrl}')"></div>
            {/if}
            {#if config.modules.scrim}
                <div class="hr-scrim"></div>
            {/if}
            <div class="hr-content" style="color:{config.modules.scrim ? '#ffffff' : colors.text}">
                <div class="hr-main">
                    {@render titleEl()}
                    {@render channelRow()}
                    <div style="color:{config.modules.scrim ? 'rgba(255,255,255,0.9)' : colors.secondary};font-size:var(--yt-meta)">
                        {@render metaEl()}
                    </div>
                </div>
            </div>
            <div class="hr-corner">
                {@render durationBadge()}
                {@render liveBadge()}
            </div>
        </div>

    {:else if config.layout === 'vertical'}
        <div class="vt-wrap" style="height:{exactHeight}px">
            <div class="vt-media" style="height:{config.ratio ?? 50}%">
                {@render thumb('fill')}
            </div>
            <div class="vt-text">
                {@render titleEl()}
                {@render channelRow()}
                {@render metaEl()}
                {@render descEl()}
            </div>
        </div>

    {:else if config.layout === 'minimal'}
        <div class="mn-wrap">
            <div class="mn-media">{@render thumb(thumbHeight)}</div>
            <div class="mn-text">
                <div class="mn-title-wrap">
                    {@render titleEl()}
                </div>
                <div style="color:var(--yt-secondary);font-size:var(--yt-meta)">
                    {@render metaEl()}
                </div>
            </div>
        </div>
    {/if}
</div>

<!-- ── Shared snippets ─────────────────────────────────────────────────────── -->

{#snippet thumb(height)}
    <div
        class="yt-thumb"
        style="height:{height === 'fill' ? '100%' : height + 'px'};border-radius:var(--yt-radius)"
    >
        {#if thumbUrl}
            <div class="yt-thumb-img" style="background-image:url('{thumbUrl}')"></div>
        {/if}
        {@render durationBadge()}
        {@render liveBadge()}
    </div>
{/snippet}

{#snippet titleEl()}
    {#if title}
        <div
            class="yt-title"
            style="font-size:{titleSize}px;font-weight:{layout.titleWeight}"
        >{title}</div>
    {/if}
{/snippet}

{#snippet channelRow()}
    {#if config.modules.channel && video?.channel?.name}
        <div class="yt-channel">
            {#if showAvatar && video.channel.avatarUrl}
                <img class="yt-avatar" src={video.channel.avatarUrl} alt="" crossorigin="anonymous" referrerpolicy="no-referrer" />
            {/if}
            <span class="yt-channel-name">{video.channel.name}</span>
            {#if config.modules.verified}
                <span class="yt-verified">
                    <i class="fa-solid fa-check"></i>
                </span>
            {/if}
        </div>
    {/if}
{/snippet}

{#snippet metaEl()}
    {#if metaLine}
        <div class="yt-meta">{metaLine}</div>
    {/if}
{/snippet}

{#snippet descEl()}
    {#if desc}
        <div class="yt-desc">{desc}</div>
    {/if}
{/snippet}

{#snippet durationBadge()}
    {#if config.modules.duration && video?.duration?.formatted && !config.modules.live}
        <span class="yt-duration">{video.duration.formatted}</span>
    {/if}
{/snippet}

{#snippet liveBadge()}
    {#if config.modules.live}
        <span class="yt-live">LIVE</span>
    {/if}
{/snippet}

<style>
    /* ── Root ── */
    .ycard {
        font-family: var(--yt-font, sans-serif);
        background-color: var(--yt-bg);
        color: var(--yt-text);
        overflow: hidden;
        position: relative;
        line-height: 1.35;
        padding: var(--yt-pad);
        border-radius: var(--yt-container-radius);
        box-sizing: border-box;
    }

    /* Thumbnail (background-image so object-fit: cover survives html2canvas) */
    .yt-thumb {
        position: relative;
        overflow: hidden;
        background: #000;
        flex-shrink: 0;
    }
    .yt-thumb-img {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }

    /* Duration + LIVE badges */
    .yt-duration {
        position: absolute;
        right: var(--yt-badge-pad);
        bottom: var(--yt-badge-pad);
        background: rgba(0, 0, 0, 0.8);
        color: #ffffff;
        font-size: var(--yt-badge-font);
        font-weight: 500;
        line-height: 1;
        padding: calc(var(--yt-badge-pad) * 0.7) var(--yt-badge-pad);
        border-radius: var(--yt-badge-radius);
    }
    .yt-live {
        position: absolute;
        right: var(--yt-badge-pad);
        bottom: var(--yt-badge-pad);
        background: var(--yt-accent);
        color: #ffffff;
        font-size: calc(var(--yt-badge-font) * 0.85);
        font-weight: 700;
        letter-spacing: 0.05em;
        line-height: 1;
        padding: calc(var(--yt-badge-pad) * 0.75) calc(var(--yt-badge-pad) * 1.5);
        border-radius: var(--yt-badge-radius);
    }

    /* Title */
    .yt-title {
        line-height: 1.25;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--yt-clamp, 2);
        line-clamp: var(--yt-clamp, 2);
        overflow: hidden;
        color: var(--yt-text);
    }

    /* Channel row */
    .yt-channel {
        display: flex;
        align-items: center;
        gap: var(--yt-gap-t);
        font-size: var(--yt-name);
        font-weight: 400;
        color: var(--yt-secondary);
        min-width: 0;
    }
    .yt-avatar {
        width: var(--yt-avatar);
        height: var(--yt-avatar);
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.08);
    }
    .yt-channel-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .yt-verified {
        width: var(--yt-name);
        height: var(--yt-name);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--yt-secondary);
        color: #ffffff;
        flex-shrink: 0;
    }
    .yt-verified i {
        font-size: calc(var(--yt-name) * 0.58);
    }

    /* Meta + description */
    .yt-meta {
        font-size: var(--yt-meta);
        font-weight: 400;
        color: var(--yt-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .yt-desc {
        font-size: var(--yt-desc);
        font-weight: 400;
        line-height: 1.4;
        color: var(--yt-secondary);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--yt-clamp-desc, 2);
        line-clamp: var(--yt-clamp-desc, 2);
        overflow: hidden;
    }

    /* ── Classic ── */
    .cl-wrap {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap);
    }
    .yt-text {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap-t);
    }

    /* ── Wide Split ── */
    .sp-wrap {
        display: grid;
        align-items: stretch;
        min-height: calc(var(--yt-width) * 0.375);
    }
    .sp-media {
        position: relative;
    }
    .sp-media .yt-thumb {
        position: absolute;
        inset: 0;
        height: 100% !important;
        border-radius: 0 !important;
    }
    .sp-text {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: var(--yt-gap);
        padding-left: var(--yt-gap);
        min-width: 0;
    }

    /* ── Stacked ── */
    .st-text {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap);
    }
    .st-sub {
        display: flex;
        align-items: center;
        gap: var(--yt-gap);
        flex-wrap: wrap;
    }

    /* ── Hero ── */
    .hr-wrap {
        position: absolute;
        inset: 0;
    }
    .hr-bg {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
    }
    .hr-scrim {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0) 26%, rgba(0, 0, 0, var(--yt-scrim-a)) 100%);
    }
    .hr-content {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 56px;
        display: flex;
    }
    .hr-main {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap-t);
        max-width: 78%;
    }
    .hr-main .yt-title {
        color: inherit;
        text-shadow: 0 2px 16px rgba(0, 0, 0, 0.55);
    }
    .hr-main .yt-channel {
        color: inherit;
    }
    .hr-corner {
        position: absolute;
        right: 24px;
        bottom: 24px;
    }
    .hr-corner .yt-duration,
    .hr-corner .yt-live {
        position: static;
    }

    /* ── Vertical ── */
    .vt-wrap {
        display: flex;
        flex-direction: column;
        width: 100%;
    }
    .vt-media {
        position: relative;
        flex-shrink: 0;
    }
    .vt-media .yt-thumb {
        position: absolute;
        inset: 0;
        height: 100% !important;
        border-radius: 0 !important;
    }
    .vt-text {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap);
        padding: 48px 56px;
        justify-content: center;
        flex: 1;
        min-width: 0;
    }

    /* ── Minimal ── */
    .mn-wrap {
        display: flex;
        flex-direction: column;
    }
    .mn-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--yt-gap-t);
        text-align: center;
    }
    .mn-title-wrap {
        max-width: 34ch;
        margin: 0 auto;
    }
    .mn-text .yt-title {
        max-width: 34ch;
    }
</style>