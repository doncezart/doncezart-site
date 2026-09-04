<script>
    import { formatViews, relativeDate } from '$lib/data/yt-format.js';
    import { DESIGN_WIDTH, YT_SCALE, LAYOUTS, resolveColors, ASPECTS, naturalAspect } from './yt-config.js';

    let { video, config, cardEl = $bindable() } = $props();

    const layout = $derived(LAYOUTS[config.layout] ?? LAYOUTS.classic);

    const colors = $derived(resolveColors(config));

    const aspect = $derived(config.aspect === 'auto' ? naturalAspect(config.layout) : (ASPECTS[config.aspect] ?? 16 / 9));

    // Exact card height for cover-fill layouts; min-height for the rest when an aspect is forced.
    const exactHeight = $derived(config.layout === 'hero' || config.layout === 'vertical'
        ? Math.round(DESIGN_WIDTH / aspect)
        : null);
    const minHeight = $derived(exactHeight ?? (config.aspect !== 'auto' ? Math.round(DESIGN_WIDTH / aspect) : null));

    // ── Shared metrics (multiplied from the 360px YouTube reference) ──
    const m = {
        gap: Math.round(12 * YT_SCALE), // 43
        gapT: Math.round(8 * YT_SCALE), // 28
        name: Math.round(12 * YT_SCALE), // 43
        avatar: Math.round(24 * YT_SCALE), // 85
        badgeFont: Math.round(12 * YT_SCALE), // 43
        badgeRadius: Math.round(4 * YT_SCALE), // 14
        badgePad: Math.round(4 * YT_SCALE), // 14
        meta: Math.round(12 * YT_SCALE), // 43
        desc: Math.round(14 * YT_SCALE) // 50
    };

    // All tunable CSS values flow through custom properties (Svelte 5 has no style interpolation).
    const cssVars = $derived(
        `--yt-font:'${config.font}',sans-serif;` +
        `--yt-bg:${colors.bg};--yt-text:${colors.text};--yt-secondary:${colors.secondary};` +
        `--yt-accent:${colors.accent};--yt-radius:${config.radius}px;` +
        `--yt-gap:${m.gap}px;--yt-gap-t:${m.gapT}px;--yt-name:${m.name}px;--yt-avatar:${m.avatar}px;` +
        `--yt-badge-font:${m.badgeFont}px;--yt-badge-radius:${m.badgeRadius}px;--yt-badge-pad:${m.badgePad}px;` +
        `--yt-meta:${m.meta}px;--yt-desc:${m.desc}px;` +
        `--yt-clamp:${config.titleLines ?? 2};--yt-clamp-desc:${config.descriptionLines ?? 2};` +
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
        const idx = thumbIdx;
        const img = new Image();
        img.onload = () => { thumbUrl = candidates[idx]; };
        img.onerror = () => { if (idx < candidates.length - 1) thumbIdx++; };
        img.src = candidates[idx];
    });

    const titleSize = $derived(Math.round(layout.titleSize * YT_SCALE * (config.titleScale ?? 1)));

    // Rough JS clamp so exported text never overflows its line budget.
    function clampText(text, fontSize, maxLines, width) {
        if (!text) return '';
        const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.55)));
        const max = charsPerLine * maxLines;
        if (text.length <= max) return text;
        return text.slice(0, max - 1).trimEnd() + '…';
    }

    function titleTextWidth() {
        if (config.layout === 'split') return Math.round(DESIGN_WIDTH * (1 - (config.ratio ?? 50) / 100)) - 144;
        if (config.layout === 'magazine') return 560;
        if (config.layout === 'vertical') return DESIGN_WIDTH - 128;
        if (config.layout === 'hero') return DESIGN_WIDTH - 144;
        return DESIGN_WIDTH - 160;
    }
    function descWidth() {
        if (config.layout === 'stacked') return DESIGN_WIDTH - 160;
        if (config.layout === 'magazine') return 560;
        return DESIGN_WIDTH - 160;
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
</script>

<div
    bind:this={cardEl}
    class="ycard ly-{config.layout}"
    style={cssVars}
>
    {#if config.layout === 'classic'}
        <div class="cl-wrap">
            {@render thumb(720)}
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
            {@render thumb(720)}
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
            <div class="hr-bg" style="background-image:url('{thumbUrl}')"></div>
            {#if config.modules.scrim}
                <div class="hr-scrim"></div>
            {/if}
            <div class="hr-content" style="color:{config.modules.scrim ? '#ffffff' : colors.text}">
                <div class="hr-main">
                    {@render titleEl()}
                    {@render channelRow()}
                    <div style="color:{config.modules.scrim ? 'rgba(255,255,255,0.85)' : colors.secondary};font-size:var(--yt-meta)">
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

    {:else if config.layout === 'terminal'}
        <div class="tm-wrap" style="--tm-border:3px solid {colors.text}">
            <div class="tm-thumb">{@render thumb(720)}</div>
            <div class="tm-rows">
                {#if config.modules.title}
                    <div class="tm-row"><span class="tm-label">Title</span><span class="tm-value">{video?.title ?? ''}</span></div>
                {/if}
                {#if config.modules.channel}
                    <div class="tm-row"><span class="tm-label">Channel</span><span class="tm-value">{video?.channel?.name ?? ''}</span></div>
                {/if}
                {#if config.modules.duration && video?.duration?.formatted}
                    <div class="tm-row"><span class="tm-label">Duration</span><span class="tm-value">{video.duration.formatted}</span></div>
                {/if}
                {#if config.modules.live}
                    <div class="tm-row"><span class="tm-label">Status</span><span class="tm-value">LIVE</span></div>
                {/if}
                {#if metaLine}
                    <div class="tm-row"><span class="tm-label">Meta</span><span class="tm-value">{metaLine}</span></div>
                {/if}
                {#if desc}
                    <div class="tm-row tm-desc"><span class="tm-label">Description</span><span class="tm-value tm-desc-value">{desc}</span></div>
                {/if}
            </div>
        </div>

    {:else if config.layout === 'minimal'}
        <div class="mn-wrap">
            <div class="mn-media">{@render thumb(720)}</div>
            <div class="mn-text">
                {@render titleEl()}
                <div style="color:var(--yt-secondary)">
                    {@render metaEl()}
                </div>
            </div>
        </div>

    {:else if config.layout === 'magazine'}
        <div class="mg-wrap">
            <div class="mg-left">
                <div class="mg-rule"></div>
                {@render titleEl()}
                <div class="mg-rule"></div>
                {@render channelRow()}
                {@render metaEl()}
                {@render descEl()}
            </div>
            <div class="mg-right">{@render thumb(432)}</div>
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
        width: 1280px;
        font-family: var(--yt-font, sans-serif);
        overflow: hidden;
        position: relative;
        line-height: 1.35;
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
        padding-bottom: var(--yt-gap);
    }
    .yt-text {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap-t);
        padding: 0 24px;
    }

    /* ── Wide Split ── */
    .sp-wrap {
        display: grid;
        align-items: stretch;
        min-height: 720px;
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
        padding: calc(var(--yt-gap) * 2) calc(var(--yt-gap) * 2) calc(var(--yt-gap) * 2) var(--yt-gap);
    }

    /* ── Stacked ── */
    .st-text {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap);
        padding: calc(var(--yt-gap) * 2) calc(var(--yt-gap) * 2) calc(var(--yt-gap) * 2.5);
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
        background: linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.85) 100%);
    }
    .hr-content {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: calc(var(--yt-gap) * 2);
        display: flex;
    }
    .hr-main {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap);
        max-width: 80%;
    }
    .hr-main .yt-title {
        text-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
    }
    .hr-corner {
        position: absolute;
        right: var(--yt-gap);
        bottom: var(--yt-gap);
    }
    .hr-corner .yt-duration,
    .hr-corner .yt-live {
        position: static;
    }

    /* ── Vertical ── */
    .vt-wrap {
        display: flex;
        flex-direction: column;
        width: 1280px;
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
        padding: calc(var(--yt-gap) * 2);
        justify-content: center;
        flex: 1;
    }

    /* ── Terminal ── */
    .tm-wrap {
        border: var(--tm-border);
        font-size: var(--yt-name);
    }
    .tm-thumb .yt-thumb {
        border-radius: 0 !important;
    }
    .tm-rows {
        display: flex;
        flex-direction: column;
    }
    .tm-row {
        display: grid;
        grid-template-columns: 300px 1fr;
        border-top: 2px solid;
        border-top-color: var(--yt-text);
    }
    .tm-label {
        padding: var(--yt-gap-t) var(--yt-gap);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: calc(var(--yt-name) * 0.8);
        border-right: 2px solid;
        border-right-color: var(--yt-text);
    }
    .tm-value {
        padding: var(--yt-gap-t) var(--yt-gap);
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .tm-desc .tm-value {
        line-height: 1.45;
    }
    .tm-thumb .yt-duration,
    .tm-thumb .yt-live {
        border-radius: 0 !important;
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
        gap: var(--yt-gap);
        text-align: center;
        padding: calc(var(--yt-gap) * 2.5) calc(var(--yt-gap) * 3);
    }
    .mn-text .yt-title {
        max-width: 80ch;
    }

    /* ── Magazine ── */
    .mg-wrap {
        display: grid;
        grid-template-columns: 1.15fr 1fr;
        gap: calc(var(--yt-gap) * 2);
        padding: calc(var(--yt-gap) * 2);
        align-items: start;
    }
    .mg-left {
        display: flex;
        flex-direction: column;
        gap: var(--yt-gap);
        min-width: 0;
    }
    .mg-rule {
        height: 2px;
        background: var(--yt-text);
        opacity: 0.85;
    }
    .mg-rule:nth-of-type(2) {
        margin-bottom: var(--yt-gap-t);
    }
    .mg-right .yt-thumb {
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
    }
</style>