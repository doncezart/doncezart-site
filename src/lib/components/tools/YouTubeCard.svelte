<script>
    // A YouTube video card. Every layout recreates a real YouTube component
    // from its real measurements (see TYPE below and LAYOUTS in yt-config.js):
    // each px value is YouTube's own at the width YouTube draws that component
    // (`w0`), multiplied by k = card width / w0. So the proportions stay true
    // at any export size, and all layouts share the same badges, tick,
    // separators and colours.
    import { formatViews, formatDate, relativeDate } from '$lib/data/yt-format.js';
    import { LAYOUTS, resolveColors, ASPECTS, naturalAspect, resolveWidth } from './yt-config.js';

    let { video, config, cardEl = $bindable() } = $props();

    /** Real YouTube type per layout: [size, line height, weight] in px at w0. */
    const TYPE = {
        classic: { title: [16, 22, 500], name: [14, 20], meta: [14, 20], desc: [14, 20], avatar: 36 },
        compact: { title: [14, 18, 500], name: [13, 18], meta: [13, 18], desc: [13, 18], avatar: 18 },
        upnext: { title: [14, 20, 500], name: [12, 18], meta: [12, 18], desc: [12, 18], avatar: 18 },
        split: { title: [18, 26, 400], name: [12, 18], meta: [12, 18], desc: [12, 18], avatar: 24 },
        watch: { title: [20, 28, 700], name: [16, 22], meta: [14, 20], desc: [14, 20], avatar: 40 },
        embed: { title: [18, 24, 500], name: [13, 18], meta: [13, 18], desc: [13, 18], avatar: 40 },
        hero: { title: [28, 36, 700], name: [16, 22], meta: [14, 20], desc: [14, 20], avatar: 32 },
        underlay: { title: [24, 32, 700], name: [16, 22], meta: [14, 20], desc: [14, 20], avatar: 32 }
    };
    /** Distance of the duration badge from the thumbnail corner, real px. */
    const BADGE_OFFSET = { compact: 4, upnext: 4, hero: 24, underlay: 24, embed: 12 };

    const key = $derived(LAYOUTS[config.layout] ? config.layout : 'classic');
    const L = $derived(LAYOUTS[key]);
    const t = $derived(TYPE[key]);
    const colors = $derived(resolveColors(config));

    const LW = $derived(resolveWidth(config)); // content width, px
    const S = $derived(LW / 1280); // frame + card corners are set relative to a 1280 card
    const k = $derived(LW / L.w0); // real YouTube px → card px
    const T = $derived(config.textScale ?? 1);
    const TS = $derived(T * (config.titleScale ?? 1));
    const r2 = (v) => Math.round(v * 100) / 100;

    const pad = $derived(Math.round((config.padding ?? 0) * S));
    const cardRadius = $derived(Math.round((config.containerRadius ?? 0) * S));
    const aspect = $derived(config.aspect === 'auto' ? naturalAspect(key) : (ASPECTS[config.aspect] ?? 16 / 9));

    // Sizes in card px
    const titlePx = $derived(r2(t.title[0] * k * TS));
    const namePx = $derived(r2(t.name[0] * k * T));
    const metaPx = $derived(r2(t.meta[0] * k * T));
    const descPx = $derived(r2(t.desc[0] * k * T));
    const avatarPx = $derived(r2(t.avatar * k * T));
    const gThumb = $derived(r2((config.thumbGap ?? 12) * k));
    const gCol = $derived(r2((config.columnGap ?? 12) * k));
    const gText = $derived(r2((config.textGap ?? 4) * k));

    // With no frame the thumbnail touches the card's corners, so it follows
    // the card radius (otherwise slivers of background show between the arcs).
    const thumbRadius = $derived(pad < 0.5 ? cardRadius : r2((config.radius ?? 12) * k));

    // Verified tick: like YouTube, a filled circle in the secondary colour with
    // the check cut out in the background colour (or white / accent / custom).
    const verifiedBg = $derived(
        config.verifiedColor === 'white' ? '#ffffff'
            : config.verifiedColor === 'accent' ? colors.accent
                : config.verifiedColor === 'custom' ? (config.verifiedColorCustom ?? '#a3a3a3')
                    : colors.secondary
    );
    const verifiedFg = $derived(
        config.verifiedColor === 'white' ? '#0f0f0f' : config.verifiedColor === 'gray' ? colors.bg : '#ffffff'
    );

    /** Mix two hex colours (for the watch page's description box). */
    function mix(a, b, w) {
        const p = (h) => {
            const x = h.replace('#', '');
            const f = x.length === 3 ? [...x].map((c) => c + c).join('') : x;
            return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
        };
        const [ca, cb] = [p(a), p(b)];
        return '#' + ca.map((v, i) => Math.round(v * (1 - w) + cb[i] * w).toString(16).padStart(2, '0')).join('');
    }
    const boxBg = $derived(mix(colors.bg, colors.text, 0.08));

    const cssVars = $derived(
        `--yt-font:'${config.font}','Noto Color Emoji',sans-serif;` +
        `--bg:${colors.bg};--text:${colors.text};--sec:${colors.secondary};--accent:${colors.accent};` +
        `--v-bg:${verifiedBg};--v-fg:${verifiedFg};` +
        `--pad:${pad}px;--cr:${cardRadius}px;--r:${thumbRadius}px;` +
        `--ts:${titlePx}px;--tl:${r2(t.title[1] * k * TS)}px;--tw:${t.title[2]};` +
        `--ns:${namePx}px;--nl:${r2(t.name[1] * k * T)}px;` +
        `--ms:${metaPx}px;--ml:${r2(t.meta[1] * k * T)}px;` +
        `--ds:${descPx}px;--dl:${r2(t.desc[1] * k * T)}px;` +
        `--av:${avatarPx}px;--g-thumb:${gThumb}px;--g-col:${gCol}px;--g-text:${gText}px;` +
        `--b-font:${r2(12 * k * T)}px;--b-lh:${r2(18 * k * T)}px;--b-px:${r2(4 * k * T)}px;--b-r:${r2(4 * k)}px;` +
        `--b-off:${r2((BADGE_OFFSET[key] ?? 8) * k)}px;--k:${r2(k)};` +
        `--scrim:${(config.scrimOpacity ?? 85) / 100};` +
        `--clamp:${key === 'embed' ? 1 : (config.titleLines ?? 2)};--clamp-desc:${config.descriptionLines ?? 2};` +
        `--box-bg:${boxBg};width:${LW}px;` +
        (config.aspect !== 'auto' && !['hero', 'embed', 'underlay'].includes(key) ? `min-height:${Math.round(LW / aspect)}px;` : '')
    );

    // ── Thumbnail with fallbacks (maxres → sd → hq) ──
    const candidates = $derived((() => {
        const th = video?.thumbnails ?? {};
        return [th.maxres, th.sd, th.hq].filter(Boolean);
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

    // ── Text ──
    const showAvatar = $derived(config.modules.avatar && !!video?.channel?.avatarUrl && config.modules.channel);
    const thumbW = $derived(
        key === 'upnext' ? r2(168 * k) : key === 'split' ? r2((LW * (config.ratio ?? 40)) / 100) : LW
    );

    // Rough JS clamp so exported text never overflows its line budget
    // (html2canvas ignores line-clamp). Widths mirror each layout's text box.
    function clampText(text, size, lines, width) {
        if (!text) return '';
        const perLine = Math.max(8, Math.floor(width / (size * 0.5)));
        const max = perLine * lines;
        return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…';
    }
    const textW = $derived(
        key === 'classic' ? LW - (showAvatar ? avatarPx + gCol : 0)
            : key === 'upnext' || key === 'split' ? LW - thumbW - gCol
                : key === 'embed' ? LW - 24 * k - (showAvatar ? avatarPx + gCol : 0) - 24 * k
                    : key === 'hero' ? (LW - 48 * k) * 0.85
                        : key === 'underlay' ? LW - 48 * k
                            : LW
    );
    const title = $derived(config.modules.title
        ? clampText(video?.title ?? '', titlePx, key === 'embed' ? 1 : (config.titleLines ?? 2), textW)
        : '');
    const desc = $derived(config.modules.description && key !== 'embed'
        ? clampText(video?.description ?? '', descPx, config.descriptionLines ?? 2, key === 'watch' ? LW - 24 * k : textW)
        : '');
    const dateText = $derived(video?.publishedAt
        ? (config.dateFormat === 'absolute' ? formatDate(video.publishedAt) : relativeDate(video.publishedAt))
        : '');
    const meta = $derived((() => {
        const parts = [];
        if (config.modules.views && video?.views != null) parts.push(`${formatViews(video.views)} views`);
        if (config.modules.date && dateText) parts.push(dateText);
        // the watch page's description box uses two spaces, everywhere else a bullet
        return parts.join(key === 'watch' ? '  ' : ' • ');
    })());
    const subs = $derived(
        config.modules.subscribers && video?.channel?.subscribers != null ? `${formatViews(video.channel.subscribers)} subscribers` : ''
    );
    const channelName = $derived(config.modules.channel ? (video?.channel?.name ?? '') : '');

    const posterH = $derived(Math.round(LW / aspect));
    const onPoster = $derived(['hero', 'underlay', 'embed'].includes(key));
    // Text over a poster is white while the fade is on; otherwise theme colours.
    const posterText = $derived(key === 'embed' || config.modules.scrim ? '#ffffff' : colors.text);
    const posterSec = $derived(key === 'embed' || config.modules.scrim ? 'rgba(255,255,255,0.82)' : colors.secondary);
</script>

<div bind:this={cardEl} class="ycard ly-{key}" style={cssVars}>
    {#if key === 'classic'}
        <div class="col">
            {@render thumb(LW, Math.round((LW * 9) / 16))}
            <div class="row" style="gap:var(--g-col);margin-top:var(--g-thumb)">
                {#if showAvatar}{@render avatar()}{/if}
                <div class="stack">
                    {@render titleEl()}
                    <div class="lines" style={title ? 'margin-top:var(--g-text)' : ''}>
                        {@render nameLine()}
                        {@render metaLine()}
                    </div>
                    {@render descEl()}
                </div>
            </div>
        </div>

    {:else if key === 'compact'}
        <div class="col">
            {@render thumb(LW, Math.round((LW * 9) / 16))}
            <div class="stack" style="margin-top:var(--g-thumb)">
                {@render titleEl()}
                <div class="lines" style={title ? 'margin-top:var(--g-text)' : ''}>
                    {@render nameLine(true)}
                    {@render metaLine()}
                </div>
                {@render descEl()}
            </div>
        </div>

    {:else if key === 'upnext'}
        <div class="row" style="gap:var(--g-col)">
            {@render thumb(thumbW, r2(94 * k))}
            <div class="stack">
                {@render titleEl()}
                <div class="lines" style={title ? 'margin-top:var(--g-text)' : ''}>
                    {@render nameLine(true)}
                    {@render metaLine()}
                </div>
                {@render descEl()}
            </div>
        </div>

    {:else if key === 'split'}
        <div class="row" style="gap:var(--g-col)">
            <div class="media" style="width:{thumbW}px">
                {@render thumb(thumbW, Math.round((thumbW * 9) / 16))}
                {#if config.modules.scrim}<div class="scrim" style="border-radius:var(--r)"></div>{/if}
            </div>
            <div class="stack">
                {@render titleEl()}
                {@render metaLine()}
                {#if channelName}
                    <div class="chan" style="margin:var(--g-text) 0">
                        {#if showAvatar}{@render avatar()}{/if}
                        {@render nameText()}
                    </div>
                {/if}
                {@render descEl()}
            </div>
        </div>

    {:else if key === 'watch'}
        <div class="col">
            {@render thumb(LW, Math.round((LW * 9) / 16))}
            <div style="margin-top:var(--g-thumb)">{@render titleEl()}</div>
            {#if channelName || config.modules.subscribe}
                <div class="owner" style="margin-top:var(--g-text);gap:var(--g-col)">
                    {#if showAvatar}{@render avatar()}{/if}
                    {#if channelName}
                        <div class="owner-text">
                            {@render nameText()}
                            {#if subs}<span class="subs">{subs}</span>{/if}
                        </div>
                    {/if}
                    {#if config.modules.subscribe}<span class="subscribe">Subscribe</span>{/if}
                </div>
            {/if}
            {#if meta || desc}
                <div class="desc-box" style="margin-top:var(--g-text)">
                    {#if meta}<div class="box-meta">{meta}</div>{/if}
                    {#if desc}<div class="desc box-desc">{desc}</div>{/if}
                </div>
            {/if}
        </div>

    {:else if key === 'embed'}
        <div class="poster" style="height:{posterH}px;border-radius:var(--r)">
            {@render bgImage()}
            <div class="embed-top"></div>
            <div class="embed-head" style="gap:var(--g-col)">
                {#if showAvatar}{@render avatar()}{/if}
                <div class="stack">
                    {#if title}<div class="title" style="color:#fff">{title}</div>{/if}
                    {#if channelName}<div class="embed-chan">{channelName}</div>{/if}
                </div>
            </div>
            <div class="play"><span></span></div>
            <div class="corner">{@render badges()}</div>
        </div>

    {:else if key === 'hero'}
        <div class="poster" style="height:{posterH}px;border-radius:var(--r)">
            {@render bgImage()}
            {#if config.modules.scrim}<div class="scrim"></div>{/if}
            <div class="poster-text" style="color:{posterText};--sec:{posterSec}">
                {@render titleEl()}
                {#if channelName}
                    <div class="chan" style="margin-top:var(--g-text);gap:var(--g-col)">
                        {#if showAvatar}{@render avatar()}{/if}
                        {@render nameText()}
                    </div>
                {/if}
                <div style="margin-top:var(--g-text)">{@render metaLine()}</div>
                {@render descEl()}
            </div>
            <div class="corner">{@render badges()}</div>
        </div>

    {:else if key === 'underlay'}
        <div class="col">
            <div class="poster" style="height:{posterH}px;border-radius:var(--r) var(--r) 0 0">
                {@render bgImage()}
                {#if config.modules.scrim}<div class="scrim"></div>{/if}
                <div class="poster-text" style="color:{posterText};--sec:{posterSec}">
                    {#if channelName}
                        <div class="chan" style="gap:var(--g-col)">
                            {#if showAvatar}{@render avatar()}{/if}
                            {@render nameText()}
                        </div>
                    {/if}
                    <div style={channelName ? 'margin-top:var(--g-text)' : ''}>{@render metaLine()}</div>
                </div>
                <div class="corner">{@render badges()}</div>
            </div>
            {#if title || desc}
                <div class="under">
                    {@render titleEl()}
                    {@render descEl()}
                </div>
            {/if}
        </div>
    {/if}
</div>

<!-- ── Shared pieces ── -->

{#snippet bgImage()}
    {#if thumbUrl}<div class="img" style="background-image:url('{thumbUrl}')"></div>{/if}
{/snippet}

{#snippet thumb(w, h)}
    <div class="thumb" style="width:{w}px;height:{h}px">
        {@render bgImage()}
        {@render badges()}
    </div>
{/snippet}

{#snippet badges()}
    {#if config.modules.live}
        <span class="badge live">LIVE</span>
    {:else if config.modules.duration && video?.duration?.formatted}
        <span class="badge">{video.duration.formatted}</span>
    {/if}
{/snippet}

{#snippet avatar()}
    <img class="avatar" src={video.channel.avatarUrl} alt="" crossorigin="anonymous" referrerpolicy="no-referrer"
        loading="eager" onerror={(e) => (e.currentTarget.style.display = 'none')} />
{/snippet}

{#snippet titleEl()}
    {#if title}<div class="title">{title}</div>{/if}
{/snippet}

{#snippet nameText()}
    <span class="name">
        <span class="name-text">{channelName}</span>
        {#if config.modules.verified}<span class="tick"><i class="fa-solid fa-check"></i></span>{/if}
    </span>
{/snippet}

{#snippet nameLine(smallAvatar = false)}
    {#if channelName}
        <div class="name-line">
            {#if smallAvatar && showAvatar}<img class="avatar inline" src={video.channel.avatarUrl} alt="" crossorigin="anonymous" referrerpolicy="no-referrer" loading="eager" />{/if}
            {@render nameText()}
            {#if subs}<span class="subs inline">• {subs}</span>{/if}
        </div>
    {/if}
{/snippet}

{#snippet metaLine()}
    {#if meta}<div class="meta">{meta}</div>{/if}
{/snippet}

{#snippet descEl()}
    {#if desc}<div class="desc" style="margin-top:var(--g-text)">{desc}</div>{/if}
{/snippet}

<style>
    /* Content-box: the width is the content; padding is an outer frame.
       No box-shadow here: html2canvas would paint it over the frame. */
    .ycard {
        position: relative;
        overflow: hidden;
        padding: var(--pad);
        border-radius: var(--cr);
        background: var(--bg);
        color: var(--text);
        font-family: var(--yt-font, Roboto, sans-serif);
        line-height: 1.4;
    }
    .ycard * { box-sizing: border-box; }

    .col { display: flex; flex-direction: column; }
    .row { display: flex; align-items: flex-start; }
    .stack { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .lines { display: flex; flex-direction: column; min-width: 0; }

    /* Thumbnail (a background image, so cover-fit survives html2canvas) */
    .thumb {
        position: relative;
        flex-shrink: 0;
        overflow: hidden;
        border-radius: var(--r);
        background: #000;
    }
    .img {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }

    /* Duration / LIVE badge: YouTube's own */
    .badge {
        position: absolute;
        right: var(--b-off);
        bottom: var(--b-off);
        padding: 0 var(--b-px);
        border-radius: var(--b-r);
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: var(--b-font);
        line-height: var(--b-lh);
        font-weight: 500;
        letter-spacing: 0.01em;
    }
    .badge.live { background: var(--accent); font-weight: 500; }

    .title {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--clamp, 2);
        line-clamp: var(--clamp, 2);
        overflow: hidden;
        font-size: var(--ts);
        line-height: var(--tl);
        font-weight: var(--tw);
        color: inherit;
    }
    .ly-embed .title { -webkit-line-clamp: 1; line-clamp: 1; white-space: nowrap; text-overflow: ellipsis; display: block; }

    .avatar {
        width: var(--av);
        height: var(--av);
        flex-shrink: 0;
        border-radius: 50%;
        object-fit: cover;
        background: rgba(128, 128, 128, 0.2);
    }
    .avatar.inline { width: var(--nl); height: var(--nl); margin-right: calc(var(--ns) * 0.4); }

    .name-line, .chan {
        display: flex;
        align-items: center;
        min-width: 0;
        font-size: var(--ns);
        line-height: var(--nl);
        color: var(--sec);
    }
    .chan { gap: calc(var(--ns) * 0.6); }
    .name { display: inline-flex; align-items: center; gap: calc(var(--ns) * 0.3); min-width: 0; }
    .name-text { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .tick {
        display: inline-grid;
        place-items: center;
        flex-shrink: 0;
        width: calc(var(--ns) * 0.92);
        height: calc(var(--ns) * 0.92);
        border-radius: 50%;
        background: var(--v-bg);
        color: var(--v-fg);
    }
    .tick i { font-size: calc(var(--ns) * 0.52); }
    .subs { color: var(--sec); font-size: var(--ms); line-height: var(--ml); white-space: nowrap; }
    .subs.inline { margin-left: calc(var(--ns) * 0.3); font-size: inherit; line-height: inherit; }

    .meta {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: var(--ms);
        line-height: var(--ml);
        color: var(--sec);
    }
    .desc {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--clamp-desc, 2);
        line-clamp: var(--clamp-desc, 2);
        overflow: hidden;
        font-size: var(--ds);
        line-height: var(--dl);
        color: var(--sec);
    }

    /* Search result */
    .media { position: relative; flex-shrink: 0; }
    .scrim {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, var(--scrim)) 100%);
    }

    /* Watch page */
    .owner { display: flex; align-items: center; min-width: 0; }
    .owner-text { display: flex; flex-direction: column; min-width: 0; }
    .owner .name { font-size: var(--ns); line-height: var(--nl); font-weight: 500; color: var(--text); }
    .subscribe {
        flex-shrink: 0;
        margin-left: calc(12px * var(--k));
        padding: 0 calc(16px * var(--k));
        border-radius: calc(18px * var(--k));
        background: var(--text);
        color: var(--bg);
        font-size: calc(14px * var(--k));
        line-height: calc(36px * var(--k));
        font-weight: 500;
    }
    .desc-box {
        padding: calc(12px * var(--k));
        border-radius: calc(12px * var(--k));
        background: var(--box-bg);
    }
    .box-meta { font-size: var(--ms); line-height: var(--ml); font-weight: 500; color: var(--text); white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    .box-desc { color: var(--text); }

    /* Posters: Embed, Poster, Poster + title */
    .poster { position: relative; overflow: hidden; background: #000; }
    .poster .scrim { border-radius: 0; }
    .poster-text {
        position: absolute;
        left: calc(24px * var(--k));
        bottom: calc(24px * var(--k));
        max-width: 85%;
        display: flex;
        flex-direction: column;
    }
    .poster-text .title { text-shadow: 0 calc(2px * var(--k)) calc(12px * var(--k)) rgba(0, 0, 0, 0.45); }
    .poster-text .chan { color: inherit; font-weight: 500; }
    .corner { position: absolute; right: var(--b-off); bottom: var(--b-off); }
    .corner .badge { position: static; display: inline-block; }
    .ly-hero .corner, .ly-underlay .corner { bottom: calc(24px * var(--k)); }
    .under { display: flex; flex-direction: column; padding: calc(20px * var(--k)) calc(24px * var(--k)) calc(24px * var(--k)); }

    /* Embed: top fade with avatar + title, the red play button */
    .embed-top {
        position: absolute;
        inset: 0 0 auto;
        height: 32%;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0));
    }
    .embed-head {
        position: absolute;
        top: calc(12px * var(--k));
        left: calc(12px * var(--k));
        right: calc(24px * var(--k));
        display: flex;
        align-items: center;
    }
    .embed-chan { font-size: var(--ns); line-height: var(--nl); color: rgba(255, 255, 255, 0.8); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .play {
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(68px * var(--k));
        height: calc(48px * var(--k));
        margin: calc(-24px * var(--k)) 0 0 calc(-34px * var(--k));
        border-radius: 22% / 30%;
        background: #ff0000;
    }
    .play span {
        position: absolute;
        left: 41%;
        top: 50%;
        margin-top: calc(-10px * var(--k));
        border-style: solid;
        border-width: calc(10px * var(--k)) 0 calc(10px * var(--k)) calc(17px * var(--k));
        border-color: transparent transparent transparent #fff;
    }
</style>
