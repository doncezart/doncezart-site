<script>
    import { formatViews, formatDate, relativeDate } from '$lib/data/yt-format.js';
    import { LAYOUTS, resolveColors, ASPECTS, naturalAspect, DESIGN_WIDTH } from './yt-config.js';

    let { video, config, cardEl = $bindable() } = $props();

    const layout = $derived(LAYOUTS[config.layout] ?? LAYOUTS.classic);

    const colors = $derived(resolveColors(config));

    // Container design width (user-controlled) + per-layout scale.
    // containerSize is a pure uniform zoom: every px metric (gaps, radiuses,
    // padding, type) scales by S so the composition never reflows or squishes.
    const LW = $derived(config.containerSize ?? DESIGN_WIDTH);
    const S = $derived(LW / DESIGN_WIDTH);
    const LS = $derived(LW / 360);

    const pad = $derived(config.padding ?? 0);
    // Content area is the design width; padding is an outer frame.
    const contentW = $derived(LW);

    const aspect = $derived(config.aspect === 'auto' ? naturalAspect(config.layout) : (ASPECTS[config.aspect] ?? 16 / 9));

    // Exact card height for cover-fill layouts; min-height for the rest when an aspect is forced.
    const exactHeight = $derived(config.layout === 'hero'
        ? Math.round(LW / aspect)
        : null);
    const minHeight = $derived(exactHeight ?? (config.aspect !== 'auto' ? Math.round(LW / aspect) : null));

    // ── Shared metrics (multiplied from the 360px YouTube reference) ──
    const m = $derived({
        name: Math.round(12 * LS),
        avatar: Math.round(24 * LS),
        badgeFont: Math.round(12 * LS),
        badgeRadius: Math.round(4 * LS),
        badgePad: Math.round(4 * LS),
        meta: Math.round(12 * LS),
        desc: Math.round(14 * LS)
    });

    // Verified-badge fill + icon contrast: YouTube gray, white, palette accent, or custom.
    const verifiedBg = $derived(
        config.verifiedColor === 'white' ? '#ffffff'
        : config.verifiedColor === 'accent' ? colors.accent
        : config.verifiedColor === 'custom' ? (config.verifiedColorCustom ?? '#a3a3a3')
        : '#a3a3a3'
    );
    const verifiedFg = $derived(verifiedBg === '#ffffff' ? '#0f0f0f' : '#ffffff');

    // All tunable CSS values flow through custom properties (Svelte 5 has no style interpolation).
    // Design-px values are scaled by S (uniform zoom); % values and colors pass through.
    const cssVars = $derived(
        `--yt-font:'${config.font}',sans-serif;` +
        `--yt-bg:${colors.bg};--yt-text:${colors.text};--yt-secondary:${colors.secondary};` +
        `--yt-accent:${colors.accent};` +
        `--yt-verified-bg:${verifiedBg};--yt-verified-fg:${verifiedFg};` +
        `--yt-radius:${Math.round((config.radius ?? 0) * S)}px;--yt-container-radius:${Math.round((config.containerRadius ?? 0) * S)}px;` +
        `--yt-pad:${Math.round(pad * S)}px;` +
        `--yt-thumb-gap:${Math.round((config.thumbGap ?? 48) * S)}px;--yt-column-gap:${Math.round((config.columnGap ?? 48) * S)}px;--yt-text-gap:${Math.round((config.textGap ?? 28) * S)}px;` +
        `--yt-name:${m.name}px;--yt-avatar:${m.avatar}px;` +
        `--yt-badge-font:${m.badgeFont}px;--yt-badge-radius:${m.badgeRadius}px;--yt-badge-pad:${m.badgePad}px;` +
        `--yt-meta:${m.meta}px;--yt-desc:${m.desc}px;` +
        `--yt-scrim-a:${(config.scrimOpacity ?? 85) / 100};` +
        `--yt-clamp:${config.titleLines ?? 2};--yt-clamp-desc:${config.descriptionLines ?? 2};` +
        `--yt-hero-pad:${Math.round(56 * S)}px;--yt-hero-corner:${Math.round(24 * S)}px;` +
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
    // Widths mirror the actual CSS boxes of each layout (incl. hero's 82% cap).
    function clampText(text, fontSize, maxLines, width) {
        if (!text) return '';
        const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.55)));
        const max = charsPerLine * maxLines;
        if (text.length <= max) return text;
        return text.slice(0, max - 1).trimEnd() + '…';
    }

    function titleTextWidth() {
        const cw = contentW - 48 * S;
        if (config.layout === 'split') {
            // text column = width − thumb share − column gap
            return Math.round(contentW - (contentW * (config.ratio ?? 34) / 100) - (config.columnGap ?? 48) * S) - 24 * S;
        }
        if (config.layout === 'hero') {
            // .hr-content has --yt-hero-pad padding; .hr-main caps at 82% of that box
            return Math.round((contentW - 112 * S) * 0.82) - 24 * S;
        }
        if (config.layout === 'underlay') {
            // title bar padding --yt-hero-pad each side
            return contentW - 112 * S;
        }
        return Math.max(Math.round(240 * S), Math.round(cw));
    }
    function descWidth() {
        if (config.layout === 'split') {
            return Math.round(contentW - (contentW * (config.ratio ?? 34) / 100) - (config.columnGap ?? 48) * S) - 24 * S;
        }
        return Math.max(Math.round(240 * S), Math.round(contentW - 48 * S));
    }

    const title = $derived(config.modules.title
        ? clampText(video?.title ?? '', titleSize, config.titleLines ?? 2, titleTextWidth())
        : '');
    const desc = $derived(config.modules.description
        ? clampText(video?.description ?? '', m.desc, config.descriptionLines ?? 2, descWidth())
        : '');
    const metaLine = $derived((() => {
        const parts = [];
        if (config.modules.views && video?.views != null) parts.push(`${formatViews(video.views)} views`);
        if (config.modules.date && video?.publishedAt) {
            parts.push(
                config.dateFormat === 'relative' ? relativeDate(video.publishedAt) : formatDate(video.publishedAt)
            );
        }
        return parts.join(' · ');
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
                {@render descEl()}
            </div>
        </div>

    {:else if config.layout === 'split'}
        <div
            class="sp-wrap"
            style="grid-template-columns:{config.ratio ?? 34}% 1fr;min-height:{Math.max(280, Math.round(LW / (config.splitWideness ?? 3.2)))}px"
        >
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
                    <div style="color:{config.modules.scrim ? 'rgba(255,255,255,0.75)' : 'inherit'}">
                        {@render descEl()}
                    </div>
                </div>
            </div>
            <div class="hr-corner">
                {@render durationBadge()}
                {@render liveBadge()}
            </div>
        </div>
    {:else if config.layout === 'underlay'}
        <div class="ul-wrap">
            <div class="ul-media" style="height:{Math.round(LW / aspect)}px">
                {#if thumbUrl}
                    <div class="ul-bg" style="background-image:url('{thumbUrl}')"></div>
                {/if}
                {#if config.modules.scrim}
                    <div class="ul-scrim"></div>
                {/if}
                <div class="ul-overlay" style="color:{config.modules.scrim ? '#ffffff' : colors.text}">
                    {@render channelRow()}
                    <div style="color:{config.modules.scrim ? 'rgba(255,255,255,0.9)' : colors.secondary};font-size:var(--yt-meta)">
                        {@render metaEl()}
                    </div>
                </div>
                <div class="ul-corner">
                    {@render durationBadge()}
                    {@render liveBadge()}
                </div>
            </div>
            <div class="ul-title-bar">
                {@render titleEl()}
                {@render descEl()}
            </div>
        </div>

    {:else if config.layout === 'compact'}
        <div class="cm-wrap">
            {@render thumb(thumbHeight)}
            <div class="cm-text">
                {@render titleEl()}
                {@render channelRow()}
                {@render metaEl()}
                {@render descEl()}
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
                <img
                    class="yt-avatar"
                    src={video.channel.avatarUrl}
                    alt=""
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                    loading="eager"
                    onerror={(e) => (e.currentTarget.style.display = 'none')}
                />
            {/if}
            <span class="yt-ident">
                <span class="yt-channel-name">{video.channel.name}</span>
                {#if config.modules.verified}
                    <span class="yt-verified">
                        <i class="fa-solid fa-check"></i>
                    </span>
                {/if}
                {#if config.modules.subscribers && video?.channel?.subscribers != null}
                    <span class="yt-subscribers">· {formatViews(video.channel.subscribers)} subscribers</span>
                {/if}
            </span>
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
    /* ── Root ──
       content-box semantics: the design width (--yt-width) belongs to the content;
       padding is an OUTER frame — content and canvas never change size with it. */
    .ycard {
        font-family: var(--yt-font, sans-serif);
        background-color: var(--yt-bg);
        color: var(--yt-text);
        overflow: hidden;
        position: relative;
        line-height: 1.35;
        padding: var(--yt-pad);
        border-radius: var(--yt-container-radius);
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
        gap: var(--yt-text-gap);
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
    .yt-ident {
        display: inline-flex;
        align-items: center;
        gap: 0.6em;
        min-width: 0;
    }
    .yt-ident .yt-channel-name {
        flex: 0 1 auto;
        min-width: 0;
    }
    .yt-subscribers {
        color: var(--yt-secondary);
        font-size: var(--yt-name);
        white-space: nowrap;
        opacity: 0.85;
    }
    .yt-verified {
        width: var(--yt-name);
        height: var(--yt-name);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--yt-verified-bg);
        color: var(--yt-verified-fg);
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
        gap: var(--yt-thumb-gap);
    }
    .yt-text {
        display: flex;
        flex-direction: column;
        gap: var(--yt-text-gap);
    }

    /* ── Wide Split ── */
    .sp-wrap {
        display: grid;
        grid-template-columns: 50% 1fr;
        align-items: stretch;
        gap: var(--yt-column-gap);
    }
    .sp-media {
        position: relative;
    }
    .sp-media .yt-thumb {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
    .sp-text {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: var(--yt-text-gap);
        min-width: 0;
    }

    /* ── Stacked ── */
    .st-wrap {
        display: flex;
        flex-direction: column;
        gap: var(--yt-thumb-gap);
    }
    .st-text {
        display: flex;
        flex-direction: column;
        gap: var(--yt-text-gap);
    }
    .st-sub {
        display: flex;
        align-items: center;
        gap: var(--yt-text-gap);
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
        padding: var(--yt-hero-pad);
        display: flex;
    }
    .hr-main {
        display: flex;
        flex-direction: column;
        gap: var(--yt-text-gap);
        max-width: 82%;
    }
    .hr-main .yt-title {
        color: inherit;
        text-shadow: 0 2px 16px rgba(0, 0, 0, 0.55);
    }
    .hr-main .yt-channel {
        color: inherit;
    }
    .hr-main .yt-subscribers,
    .ul-overlay .yt-subscribers {
        color: inherit;
    }
    .hr-main .yt-desc {
        color: inherit;
    }
    .hr-corner {
        position: absolute;
        right: var(--yt-hero-corner);
        bottom: var(--yt-hero-corner);
    }
    .hr-corner .yt-duration,
    .hr-corner .yt-live {
        position: static;
    }

    /* ── Underlay (hero poster, title moved below) ── */
    .ul-wrap {
        position: relative;
    }
    .ul-media {
        position: relative;
        overflow: hidden;
        background: #000;
    }
    .ul-bg {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
    }
    .ul-scrim {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0) 26%, rgba(0, 0, 0, var(--yt-scrim-a)) 100%);
    }
    .ul-overlay {
        position: absolute;
        left: var(--yt-hero-pad);
        bottom: var(--yt-hero-pad);
        display: flex;
        flex-direction: column;
        gap: var(--yt-text-gap);
        max-width: 82%;
    }
    .ul-overlay .yt-channel {
        color: inherit;
    }
    .ul-corner {
        position: absolute;
        right: var(--yt-hero-corner);
        bottom: var(--yt-hero-corner);
    }
    .ul-corner .yt-duration,
    .ul-corner .yt-live {
        position: static;
    }
    .ul-title-bar {
        padding: calc(var(--yt-hero-pad) * 0.86) var(--yt-hero-pad) var(--yt-hero-pad);
        display: flex;
        flex-direction: column;
        gap: var(--yt-text-gap);
    }

    /* ── Compact (thumb, title, views · date) ── */
    .cm-wrap {
        display: flex;
        flex-direction: column;
        gap: var(--yt-thumb-gap);
    }
    .cm-text {
        display: flex;
        flex-direction: column;
        gap: var(--yt-text-gap);
    }
</style>