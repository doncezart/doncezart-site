<script>
    import Seo from '$lib/components/Seo.svelte';
    import { SITE } from '$lib/data/site.js';
    import { slide } from 'svelte/transition';
    import { page } from '$app/state';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import SnapSlider from '$lib/components/ui/SnapSlider.svelte';
    import YouTubeCard from '$lib/components/tools/YouTubeCard.svelte';
    import { captureElement, canvasBlob } from '$lib/components/tools/capture.js';
    import YouTubeCardGuide from '$lib/components/tools/YouTubeCardGuide.svelte';
    import { STEPS, FAQ, TUTORIAL_ID } from '$lib/components/tools/yt-guide-data.js';
    import { configToParams, layoutConfig } from '$lib/components/tools/yt-api.js';
    import { DEFAULT_CONFIG, LAYOUTS, FONTS, PALETTES, PALETTE_NAMES, ASPECTS, FONTS_HREF, boxWidth, resolveWidth } from '$lib/components/tools/yt-config.js';

    let { data } = $props();


    // ── Video ─────────────────────────────────────────────
    // A demo video (loaded server-side, streamed) fills the editor until the
    // user loads their own, so every control can be tried straight away.
    let video = $state(null);
    let url = $state('');
    let loading = $state(false);
    let error = $state('');

    $effect(() => {
        let alive = true;
        Promise.resolve(data.demo).then((v) => { if (alive && v && !video) video = v; });
        return () => { alive = false; };
    });

    async function fetchVideo(target = url) {
        target = target.trim();
        if (!target) { error = 'Paste a YouTube link first.'; return; }
        loading = true;
        error = '';
        try {
            const r = await fetch(`/api/youtube/info?url=${encodeURIComponent(target)}`);
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Something went wrong.');
            video = j;
            url = '';
            window.umami?.track('tool-generate', { tool: 'youtube-card' });
        } catch (e) {
            error = e.message || 'Could not load that video. Try again in a moment.';
        } finally {
            loading = false;
        }
    }

    // Some data comes only from the YouTube Data API; without it the card
    // still works but duration, views, avatar etc. are missing.
    const partialData = $derived(
        !!video && !video.demo && (video.source === 'oembed' || !video.duration || !video.channel?.avatarUrl || video.views == null)
    );
    let partialDismissed = $state(false);
    $effect(() => { if (partialData) window.umami?.track('tool-api-fallback', { tool: 'youtube-card' }); });

    // ── Config ────────────────────────────────────────────
    // The tool starts with a card sized for dropping onto a 1080p timeline
    // (about 45% of the width); the API default stays 1280.
    // Size is a share of the video frame (config.frame / config.size), the
    // same model the API uses; 50% of the width is the recommended default.
    const freshConfig = () => structuredClone(DEFAULT_CONFIG);
    let config = $state(freshConfig());
    let cardEl = $state(null);

    // Per-layout defaults apply on layout switch until the user tunes a value.
    const touched = $state({
        padding: false, thumbGap: false, columnGap: false, textGap: false,
        titleLines: false, titleScale: false, textScale: false, description: false, radius: false
    });
    // Module switches the user flipped: layout defaults stop overriding them.
    const touchedModules = $state(new Set());

    const L = $derived(LAYOUTS[config.layout]);
    const layoutKeys = Object.keys(LAYOUTS);

    function setLayout(key) {
        config.layout = key;
        const l = LAYOUTS[key];
        if (!touched.padding) config.padding = l.defaultPadding ?? 0;
        if (!touched.radius) config.radius = l.defaultRadius ?? 12;
        if (!touched.thumbGap) config.thumbGap = l.defaults.thumb;
        if (!touched.columnGap) config.columnGap = l.defaults.column;
        if (!touched.textGap) config.textGap = l.defaults.text;
        if (!touched.titleLines) config.titleLines = l.defaultTitleLines ?? 2;
        if (!touched.titleScale) config.titleScale = l.defaultTitleScale ?? 1;
        if (!touched.textScale) config.textScale = l.defaultTextScale ?? 1;
        if (!touched.description) config.modules.description = l.descriptionOn ?? false;
        // Every switch goes back to this layout's default (not just the ones it
        // lists), so one layout's choices don't leak into the next.
        const defaults = layoutConfig(key).modules;
        for (const [k, v] of Object.entries(defaults)) {
            if (k !== 'description' && !touchedModules.has(k)) config.modules[k] = v;
        }
    }

    function resetAll() {
        config = freshConfig();
        for (const k of Object.keys(touched)) touched[k] = false;
        touchedModules.clear();
        cardPos = { x: 0.5, y: 0.5 };
    }

    function toggleModule(key) {
        config.modules[key] = !config.modules[key];
        if (key === 'description') touched.description = true;
        touchedModules.add(key);
    }

    // Layout thumbnails: each layout drawn with its own defaults in the current style.
    const layoutPreviews = $derived(
        Object.fromEntries(layoutKeys.map((k) => [k, {
            ...layoutConfig(k),
            // Drawn at YouTube's own size (360 px) so the shrink to a tile is
            // small and the text and thumbnail stay crisp.
            containerSize: 360,
            padding: 40,
            palette: config.palette,
            colors: config.colors,
            font: config.font
        }]))
    );

    // Fit each mini card inside its tile: measure the card and the tile, scale
    // to the smaller fit, and re-fit whenever either one changes size.
    function fitMini(node) {
        const tile = node.parentElement;
        const fit = () => {
            const w = node.offsetWidth;
            const h = node.offsetHeight;
            if (!w || !h) return;
            const k = Math.min((tile.clientWidth - 12) / w, (tile.clientHeight - 12) / h);
            node.style.setProperty('--k', String(k));
        };
        const ro = new ResizeObserver(fit);
        ro.observe(node);
        ro.observe(tile);
        fit();
        return { destroy: () => ro.disconnect() };
    }

    // What each layout actually uses, so irrelevant controls are hidden, not greyed.
    const usesThumbGap = $derived(['classic', 'compact', 'watch'].includes(config.layout));
    const usesColumns = $derived(['classic', 'upnext', 'split', 'watch', 'embed', 'hero', 'underlay'].includes(config.layout));
    const usesRatio = $derived(config.layout === 'split');
    const posterLayout = $derived(['hero', 'underlay', 'embed'].includes(config.layout));
    const usesScrim = $derived(['hero', 'underlay', 'split'].includes(config.layout));
    const overlay = $derived(['hero', 'underlay'].includes(config.layout));

    // ── Content: modules grouped by what they describe ──
    const GROUPS = [
        { title: 'Video', items: [
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
            { key: 'duration', label: 'Duration badge' },
            { key: 'live', label: 'Live badge' }
        ] },
        { title: 'Channel', items: [
            { key: 'avatar', label: 'Avatar' },
            { key: 'channel', label: 'Channel name' },
            { key: 'verified', label: 'Verified tick' },
            { key: 'subscribers', label: 'Subscribers' },
            { key: 'subscribe', label: 'Subscribe button', only: ['watch'] }
        ] },
        { title: 'Stats', items: [
            { key: 'views', label: 'Views' },
            { key: 'date', label: 'Upload date' }
        ] }
    ];

    const VERIFIED = [
        { key: 'gray', label: 'Gray' },
        { key: 'white', label: 'White' },
        { key: 'accent', label: 'Accent' },
        { key: 'custom', label: 'Custom' }
    ];

    const COLOR_FIELDS = [
        { key: 'bg', label: 'Background' },
        { key: 'text', label: 'Text' },
        { key: 'secondary', label: 'Secondary' },
        { key: 'accent', label: 'Accent' }
    ];

    function setPalette(key) {
        // Custom starts from the theme you were on, not from stale colours.
        if (key === 'custom' && config.palette !== 'custom') config.colors = { ...PALETTES[config.palette] };
        config.palette = key;
    }

    // ── Tabs ──────────────────────────────────────────────
    const TABS = [
        { id: 'content', label: 'Content', icon: 'fa-solid fa-list-check' },
        { id: 'style', label: 'Style', icon: 'fa-solid fa-palette' },
        { id: 'shape', label: 'Shape', icon: 'fa-solid fa-ruler-combined' },
        { id: 'ai', label: 'Use with AI', icon: 'fa-solid fa-wand-magic-sparkles' }
    ];
    let tab = $state('content');
    let more = $state({ shape: false });
    let panelEl = $state(null);

    function openAiTab() {
        tab = 'ai';
        const el = panelEl;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    // ── Screen: the video frame the card is dropped onto ──
    // Sizes are real pixels; the stage shows them in proportion.
    const SCREENS = [
        { label: '720p', w: 1280, h: 720 },
        { label: '1080p', w: 1920, h: 1080 },
        { label: '1440p', w: 2560, h: 1440 },
        { label: '4K', w: 3840, h: 2160 },
        { label: 'Vertical', w: 1080, h: 1920 },
        { label: 'Square', w: 1080, h: 1080 }
    ];
    const screen = $derived({ w: config.frame[0], h: config.frame[1] });
    let cardPos = $state({ x: 0.5, y: 0.5 }); // card centre, as a fraction of the screen
    const screenLabel = $derived(SCREENS.find((s) => s.w === screen.w && s.h === screen.h)?.label ?? 'Custom');
    const clampScreen = (v) => Math.min(7680, Math.max(320, Math.round(v / 2) * 2 || 320));
    function setScreen(w, h) {
        config.frame = [clampScreen(w), clampScreen(h)];
    }

    // Card size in real pixels (frame included)
    let cardW = $state(0);
    let cardH = $state(0);
    $effect(() => {
        const el = cardEl;
        if (!el) return;
        const update = () => { cardW = el.offsetWidth; cardH = el.offsetHeight; };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    });
    // Box width is derived from the config (not measured) so the preview
    // follows size changes in the same frame.
    const boxW = $derived(boxWidth(config));
    const boxH = $derived(cardH || boxW * 0.8);
    const shadowRadius = $derived(Math.round((config.containerRadius * resolveWidth(config)) / 1280));
    const cardShare = $derived(Math.round(config.size));

    /** Set the card's full width (frame px) as a share of the frame width. */
    function setCardWidth(totalW) {
        config.size = Math.min(100, Math.max(2, Math.round((totalW / screen.w) * 1000) / 10));
    }
    // Back to the recommended 50% of the width (less if that's too tall), centred.
    function fitCard() {
        const ratio = boxH / boxW;
        setCardWidth(Math.min(screen.w * 0.5, (screen.h * 0.8) / ratio));
        cardPos = { x: 0.5, y: 0.5 };
    }

    // Stage → screen scale (frozen while the screen itself is being resized,
    // so the handle stays under the pointer)
    let stageW = $state(0);
    let stageH = $state(0);
    let scaleLock = $state(null);
    // Room kept for the resolution bar (top) and the tag/buttons (bottom).
    const BAR = 60;
    const FOOT = 60;
    const fitScale = $derived(stageW && stageH ? Math.min((stageW - 64) / screen.w, (stageH - BAR - FOOT - 16) / screen.h) : 0.3);
    const s = $derived(scaleLock ?? fitScale);
    const sw = $derived(screen.w * s);
    const sh = $derived(screen.h * s);
    const sx = $derived((stageW - sw) / 2);
    const sy = $derived(BAR + (stageH - BAR - FOOT - sh) / 2);
    // Card box on the stage
    const cw = $derived(boxW * s);
    const ch = $derived(boxH * s);
    const cx = $derived(cardPos.x * sw - cw / 2);
    const cy = $derived(cardPos.y * sh - ch / 2);

    // Pointer interactions: move card, resize card, resize screen.
    // ── Guides: padding inside the frame, snapping to its edges and centre ──
    let snapOn = $state(true);
    let showGuides = $state(true);
    let pad = $state(64); // frame px, applied on all four sides
    let snapped = $state({ x: null, y: null }); // frame-px positions of active guides
    let guideMenu = $state(false);
    const maxPad = $derived(Math.floor(Math.min(screen.w, screen.h) / 4));
    const padFrac = (k) => Math.round(Math.min(screen.w, screen.h) * k);
    const PAD_PRESETS = [
        { label: 'None', k: 0 },
        { label: '2.5%', k: 0.025 },
        { label: '5%', k: 0.05 },
        { label: '10%', k: 0.1 }
    ];
    $effect(() => { if (pad > maxPad) pad = maxPad; });
    const SNAP_PX = 10; // on screen, whatever the zoom

    /** Lines a value can snap to on one axis: frame edges, padding and the centre. */
    const linesFor = (size) => [...new Set([0, pad, size / 2, size - pad, size])];

    /** Snap a card centre (frame px) on one axis; returns [centre, guide or null]. */
    function snapAxis(c, half, size, tol) {
        let best = null;
        for (const line of linesFor(size)) {
            for (const cand of [line - half, line, line + half]) {
                // card start, centre or end on the line
                const d = Math.abs(cand - c);
                if (d <= tol && (!best || d < best.d)) best = { d, c: cand, line };
            }
        }
        return best ? [best.c, best.line] : [c, null];
    }

    /** Place the card so it sits in a 3×3 spot inside the padding. */
    function align(ax, ay) {
        const hw = boxW / 2;
        const hh = boxH / 2;
        const x = ax === 0 ? pad + hw : ax === 2 ? screen.w - pad - hw : screen.w / 2;
        const y = ay === 0 ? pad + hh : ay === 2 ? screen.h - pad - hh : screen.h / 2;
        cardPos = { x: x / screen.w, y: y / screen.h };
    }

    let drag = null;
    function startDrag(e, kind, corner = null) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        // Resizing keeps the opposite corner (or edge) where it is, like design tools.
        const X = cardPos.x * screen.w;
        const Y = cardPos.y * screen.h;
        const anchor = corner ? { x: X - (corner[0] * boxW) / 2, y: Y - (corner[1] * boxH) / 2 } : null;
        drag = { kind, corner, anchor, ratio: boxH / boxW, id: e.pointerId, x: e.clientX, y: e.clientY, pos: { ...cardPos }, boxW, screen: { ...screen }, s };
        if (kind === 'screen') scaleLock = s;
        dragging = kind;
        dragCorner = corner;
    }
    let dragging = $state(null);
    let dragCorner = $state(null);

    // Handles only show when the pointer is close to them (or while dragging).
    let ptr = $state(null);
    let stageEl = $state(null);
    const NEAR = 44;
    function trackPointer(e) {
        const r = stageEl?.getBoundingClientRect();
        if (r) ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    const near = (x, y) => !!ptr && Math.hypot(ptr.x - x, ptr.y - y) < NEAR;
    const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    // The four edges: invisible strips over the outline, grabbable anywhere along it.
    const EDGES = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const EDGE_NAMES = { '0,-1': 'top', '1,0': 'right', '0,1': 'bottom', '-1,0': 'left' };
    const cornerName = (c) => `${c[1] < 0 ? 'top' : 'bottom'} ${c[0] < 0 ? 'left' : 'right'}`;
    function onDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = (e.clientX - drag.x) / drag.s;
        const dy = (e.clientY - drag.y) / drag.s;
        const snap = snapOn && !e.altKey; // Alt: place freely
        const tol = SNAP_PX / drag.s;
        if (drag.kind === 'move') {
            let x = drag.pos.x * screen.w + dx;
            let y = drag.pos.y * screen.h + dy;
            let gx = null;
            let gy = null;
            if (snap) {
                [x, gx] = snapAxis(x, boxW / 2, screen.w, tol);
                [y, gy] = snapAxis(y, boxH / 2, screen.h, tol);
            }
            snapped = { x: gx, y: gy };
            cardPos = {
                x: Math.min(1, Math.max(0, x / screen.w)),
                y: Math.min(1, Math.max(0, y / screen.h))
            };
        } else if (drag.kind === 'card') {
            const [sx, sy] = drag.corner;
            const A = drag.anchor;
            const ratio = drag.ratio;
            // New width from the dragged corner or edge. The card keeps its
            // shape, so a side edge sets the width and a top/bottom edge sets
            // the height (and the width follows).
            let w;
            if (sx && sy) {
                // corner: project the pointer onto the card's diagonal, so
                // moving along either axis (in or out) resizes it
                const qx = A.x + sx * drag.boxW + dx;
                const qy = A.y + sy * drag.boxW * ratio + dy;
                w = (sx * (qx - A.x) + sy * (qy - A.y) * ratio) / (1 + ratio * ratio);
            } else if (sx) {
                w = drag.boxW + sx * dx;
            } else {
                w = (drag.boxW * ratio + sy * dy) / ratio;
            }
            let gx = null;
            let gy = null;
            if (snap) {
                // the moving corner/edge onto frame edges, padding and centre lines
                let best = null;
                if (sx) for (const line of linesFor(screen.w)) {
                    const cand = sx * (line - A.x);
                    const d = Math.abs(cand - w);
                    if (cand > 0 && d <= tol && (!best || d < best.d)) best = { d, w: cand, gx: line, gy: null };
                }
                if (sy) for (const line of linesFor(screen.h)) {
                    const cand = (sy * (line - A.y)) / ratio;
                    const d = Math.abs(cand - w) * ratio;
                    if (cand > 0 && d <= tol && (!best || d < best.d)) best = { d, w: cand, gx: null, gy: line };
                }
                if (best) ({ w, gx, gy } = best);
            }
            snapped = { x: gx, y: gy };
            setCardWidth(Math.max(40, w));
            const nw = boxW; // after clamping
            cardPos = {
                x: (A.x + (sx * nw) / 2) / screen.w,
                y: (A.y + (sy * nw * ratio) / 2) / screen.h
            };
        } else if (drag.kind === 'screen') {
            let w = drag.screen.w + 2 * dx;
            let h = drag.screen.h + 2 * dy;
            if (e.shiftKey) h = (w * drag.screen.h) / drag.screen.w; // keep the ratio
            setScreen(w, h);
        }
    }
    function endDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        dragging = null;
        scaleLock = null;
        snapped = { x: null, y: null };
    }
    function cardKeys(e) {
        const step = e.shiftKey ? 0.05 : 0.01;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        e.preventDefault();
        if (e.altKey) {
            // Alt + arrows: jump to the next spot inside the padding
            const col = cardPos.x < 0.34 ? 0 : cardPos.x > 0.66 ? 2 : 1;
            const row = cardPos.y < 0.34 ? 0 : cardPos.y > 0.66 ? 2 : 1;
            align(Math.min(2, Math.max(0, col + Math.sign(d[0]))), Math.min(2, Math.max(0, row + Math.sign(d[1]))));
            return;
        }
        cardPos = { x: Math.min(1, Math.max(0, cardPos.x + d[0])), y: Math.min(1, Math.max(0, cardPos.y + d[1])) };
    }

    // Screen fill (preview only, never exported): a plain frame, the video's
    // own thumbnail, a colour, or a frame from the user's footage.
    let bgMenu = $state(false);
    let screenBg = $state({ type: 'frame', value: null });
    let screenBgColor = $state('#2a2a2a');
    const thumbBg = $derived(video?.thumbnails?.maxres ?? video?.thumbnails?.hq ?? null);
    const screenBgStyle = $derived(
        screenBg.type === 'color' ? `background:${screenBg.value};`
            : screenBg.type === 'image' ? `background:url('${screenBg.value}') center / cover;`
                : screenBg.type === 'thumb' && thumbBg ? `background:url('${thumbBg}') center / cover;`
                    : ''
    );
    function setScreenBg(type, value = null) {
        if (screenBg.type === 'image' && screenBg.value !== value) URL.revokeObjectURL(screenBg.value);
        screenBg = { type, value };
        bgMenu = false;
    }
    function onBgImage(e) {
        const f = e.currentTarget.files?.[0];
        if (!f) return;
        setScreenBg('image', URL.createObjectURL(f));
        // Match the screen to the frame's own resolution
        const img = new Image();
        img.onload = () => setScreen(img.naturalWidth, img.naturalHeight);
        img.src = screenBg.value;
    }

    // ── Export ────────────────────────────────────────────
    let format = $state('png');
    let exporting = $state(false);
    let copied = $state(false);
    let exportError = $state('');
    const px = (n) => Math.round(n).toLocaleString('en-US');

    async function download() {
        if (!cardEl || exporting) return;
        exporting = true;
        exportError = '';
        try {
            const blob = await canvasBlob(await captureElement(cardEl, format === 'jpeg' ? '#ffffff' : null), format);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${video.id}.${format === 'jpeg' ? 'jpg' : format}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
            logExport(format, 'download');
        } catch (e) {
            console.error(e);
            exportError = 'Export failed. Try another layout or reload the page.';
        } finally {
            exporting = false;
        }
    }

    async function copy() {
        if (!cardEl || exporting) return;
        exporting = true;
        exportError = '';
        try {
            const blob = await canvasBlob(await captureElement(cardEl, null), 'png');
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            copied = true;
            setTimeout(() => (copied = false), 2000);
            logExport('png', 'copy');
        } catch (e) {
            console.error(e);
            exportError = 'The browser blocked the clipboard. Use Download instead.';
        } finally {
            exporting = false;
        }
    }

    function logExport(fmt, action) {
        window.umami?.track('tool-export', { tool: 'youtube-card', format: fmt, action });
        if (!video || video.demo) return;
        const body = JSON.stringify({
            videoId: video.id, title: video.title, channel: video.channel?.name,
            layout: config.layout, format: fmt, action
        });
        navigator.sendBeacon?.('/api/youtube/track', new Blob([body], { type: 'application/json' }));
    }

    // ── Use with AI: this exact style as an API URL + a prompt ──
    const styleParams = $derived(configToParams(config, format));
    const apiUrl = $derived(video
        ? `${page.url.origin}/api/youtube/card?` + new URLSearchParams({ url: `https://youtu.be/${video.id}`, ...styleParams }).toString()
        : '');
    const styleSuffix = $derived(Object.entries(styleParams).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join(''));
    const aiPrompt = $derived(`Make YouTube cards with this free image API (no key):
${page.url.origin}/api/youtube/card?url=<YouTube link>${styleSuffix}
When I send a YouTube link, put it in url, keep the rest, and show me the image.`);
    const SNIPPETS = [
        { id: 'prompt', label: 'Prompt' },
        { id: 'url', label: 'Image URL' }
    ];
    let snippet = $state('prompt');
    const snippetText = $derived(snippet === 'prompt' ? aiPrompt : apiUrl);
    let apiCopied = $state(false);
    async function copyApi() {
        try {
            await navigator.clipboard.writeText(snippetText);
            apiCopied = true;
            setTimeout(() => (apiCopied = false), 2000);
            window.umami?.track('tool-api-url', { tool: 'youtube-card', snippet });
        } catch { /* clipboard blocked: the text is still selectable */ }
    }

    // ── Search: structured data for the tool, the steps and the FAQ ──
    const pageUrl = `${SITE}/tools/youtube-card`;
    const DESCRIPTION = 'Free YouTube card generator for video editors. Turn any YouTube link into a clean video card, size it on your 1080p, 4K or vertical frame, and download a transparent PNG for Premiere, DaVinci Resolve, Final Cut or CapCut. Works with AI.';
    const jsonLd = $derived(JSON.stringify([
        {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'YouTube Card Generator',
            url: pageUrl,
            description: DESCRIPTION,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any (runs in the browser)',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            featureList: [
                'Eight layouts copied from YouTube: home feed, watch page, search, embed and more', 'Light, dark, OLED and custom themes', 'Nine fonts',
                'Preview on 720p, 1080p, 1440p, 4K, vertical and custom frames',
                'Snapping guides and safe padding', 'Transparent PNG and WebP, JPEG',
                'Free image API for AI assistants and automations'
            ]
        },
        {
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'How to make a YouTube video card for your edit',
            step: STEPS.map((st, i) => ({ '@type': 'HowToStep', position: i + 1, name: st.name, text: st.text, url: `${pageUrl}#how-to` }))
        },
        {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
        },
        ...(TUTORIAL_ID ? [{
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            name: 'How to use the YouTube Card Generator',
            description: DESCRIPTION,
            thumbnailUrl: `https://i.ytimg.com/vi/${TUTORIAL_ID}/maxresdefault.jpg`,
            embedUrl: `https://www.youtube-nocookie.com/embed/${TUTORIAL_ID}`,
            contentUrl: `https://www.youtube.com/watch?v=${TUTORIAL_ID}`
        }] : [])
    ]).replace(/</g, '\\u003c'));

    const fmtCount = (n) => (n == null ? '' : Intl.NumberFormat('en', { notation: 'compact' }).format(n));
</script>

<Seo title="YouTube Card Generator for Video Editors" description={DESCRIPTION} image="/og/youtube-card.png" />

<svelte:head>
    {@html `<script type="application/ld+json">${jsonLd}</` + `script>`}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href={FONTS_HREF} rel="stylesheet" />
</svelte:head>

<PageHeader
    eyebrow="Free tool"
    title="YouTube Card"
    hot="Generator"
    subtitle="Paste a video link, see the card on your video frame, drop it into your edit. No signup."
/>

<button type="button" class="api-banner reveal" style="--d: 3" onclick={openAiTab}>
    <span class="api-tag"><i class="fa-solid fa-wand-magic-sparkles"></i> AI</span>
    <span class="api-text"><b>Works with AI.</b> One prompt, and your assistant makes these cards.</span>
    <span class="api-cta">Get the prompt <i class="fa-solid fa-arrow-right"></i></span>
</button>

<!-- ── Top: video + layout ── -->
<div class="top reveal" style="--d: 4">
    <section class="box video-box">
        <div class="block-head">
            <h2>Video</h2>
            {#if !video || video.demo}<span class="head-note">Showing a demo until you paste a link</span>{/if}
        </div>
        <form class="url-row" onsubmit={(e) => { e.preventDefault(); fetchVideo(); }}>
            <input class="text" type="text" bind:value={url} placeholder="Paste a YouTube link"
                aria-label="YouTube video URL" autocomplete="off" spellcheck="false" />
            <button class="btn go" type="submit" disabled={loading}>
                {#if loading}<i class="fa-solid fa-spinner fa-spin"></i>{:else}Load <i class="fa-solid fa-arrow-right"></i>{/if}
            </button>
        </form>
        {#if error}<p class="err"><i class="fa-solid fa-circle-exclamation"></i>{error}</p>{/if}
        {#if video}
            <div class="current">
                <img src={video.thumbnails?.hq ?? video.thumbnails?.sd} alt="" loading="lazy" />
                <div class="current-text">
                    <b title={video.title}>{video.title}</b>
                    <span>
                        {#if video.demo}<em class="demo">Demo</em>{/if}
                        {video.channel?.name ?? ''}{#if video.views != null} · {fmtCount(video.views)} views{/if}
                    </span>
                </div>
            </div>
        {/if}
    </section>

    <section class="box layout-box">
        <div class="block-head"><h2>Layout</h2><span class="head-note">{L.hint}</span></div>
        <div class="layouts">
            {#each layoutKeys as key}
                <button type="button" class="layout" class:active={config.layout === key} onclick={() => { setLayout(key); window.umami?.track('tool-layout', { tool: 'youtube-card', layout: key }); }} aria-pressed={config.layout === key}>
                    <span class="layout-img">
                        {#if video}
                            <span class="mini" use:fitMini><YouTubeCard {video} config={layoutPreviews[key]} /></span>
                        {/if}
                    </span>
                    <span class="layout-name">{LAYOUTS[key].label}</span>
                </button>
            {/each}
        </div>
    </section>
</div>

<div class="editor reveal" style="--d: 5">
    <!-- ── Stage: the card on a video frame, in proportion ── -->
    <div class="stage" class:busy={dragging} bind:this={stageEl} bind:clientWidth={stageW} bind:clientHeight={stageH}
        role="presentation" onpointermove={trackPointer} onpointerleave={() => (ptr = null)}>
        <div class="stage-bar">
            <span class="seg screens" role="group" aria-label="Video resolution">
                {#each SCREENS as sc}
                    <button type="button" class:active={screen.w === sc.w && screen.h === sc.h} onclick={() => setScreen(sc.w, sc.h)}
                        title="{sc.w} × {sc.h}">{sc.label}</button>
                {/each}
            </span>
            <span class="res">
                <input type="number" value={screen.w} min="320" max="7680" aria-label="Frame width in pixels"
                    onchange={(e) => setScreen(+e.currentTarget.value, screen.h)} />
                <span>×</span>
                <input type="number" value={screen.h} min="320" max="7680" aria-label="Frame height in pixels"
                    onchange={(e) => setScreen(screen.w, +e.currentTarget.value)} />
                <button type="button" class="mini-btn" onclick={() => setScreen(screen.h, screen.w)} title="Swap width and height" aria-label="Swap width and height">
                    <i class="fa-solid fa-right-left"></i>
                </button>
            </span>
        </div>

        <div class="screen" style="left:{sx}px;top:{sy}px;width:{sw}px;height:{sh}px;{screenBgStyle}" class:frame={screenBg.type === 'frame'}>
            {#if showGuides || dragging === 'move' || dragging === 'card'}
                {#if pad > 0}
                    <div class="safe" class:live={dragging === 'move' || dragging === 'card'} style="inset:{pad * s}px"></div>
                {/if}
                <div class="mid v" class:live={!!dragging}></div>
                <div class="mid h" class:live={!!dragging}></div>
            {/if}
            {#if snapped.x != null}<div class="guide v" style="left:{snapped.x * s}px"></div>{/if}
            {#if snapped.y != null}<div class="guide h" style="top:{snapped.y * s}px"></div>{/if}
            {#if video}
                <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (drag / arrow keys move the card) -->
                <div class="card-holder" class:moving={dragging === 'move'} role="group" aria-label="Card: drag to move, arrow keys to nudge" tabindex="0"
                    style="width:{cw}px;height:{ch}px;left:{cx}px;top:{cy}px"
                    onpointerdown={(e) => startDrag(e, 'move')} onpointermove={onDrag} onpointerup={endDrag} onpointercancel={endDrag} onkeydown={cardKeys}>
                    <div class="scaled" style="transform:scale({s});width:{boxW}px;border-radius:{shadowRadius}px">
                        <YouTubeCard bind:cardEl {video} {config} />
                    </div>
                </div>
            {:else}
                <div class="stage-empty">
                    {#await data.demo}
                        <i class="fa-solid fa-spinner fa-spin"></i><span>Loading a demo video…</span>
                    {:then demo}
                        {#if !demo}<i class="fa-brands fa-youtube"></i><span>Paste a YouTube link to start.</span>{/if}
                    {/await}
                </div>
            {/if}
        </div>
        {#if video}
            <!-- Handles live outside the clipped screen so they never get cut off -->
            {#each EDGES as e}
                <button type="button" class="edge" class:vert={e[0] !== 0}
                    class:active={dragging === 'card' && dragCorner === e}
                    aria-label="Resize the card from the {EDGE_NAMES[e.join()]} edge" title="Drag to resize"
                    style={e[0] !== 0
                        ? `left:${sx + cx + (e[0] > 0 ? cw : 0)}px;top:${sy + cy}px;height:${ch}px`
                        : `left:${sx + cx}px;top:${sy + cy + (e[1] > 0 ? ch : 0)}px;width:${cw}px`}
                    onpointerdown={(ev) => startDrag(ev, 'card', e)} onpointermove={onDrag} onpointerup={endDrag} onpointercancel={endDrag}></button>
            {/each}
            {#each CORNERS as c}
                {@const hx = sx + cx + (c[0] > 0 ? cw : 0)}
                {@const hy = sy + cy + (c[1] > 0 ? ch : 0)}
                <button type="button" class="handle card-handle" class:nesw={c[0] !== c[1]}
                    class:shown={near(hx, hy) || (dragging === 'card' && dragCorner === c)}
                    aria-label="Resize the card from the {cornerName(c)} corner" title="Drag to resize"
                    style="left:{hx}px;top:{hy}px"
                    onpointerdown={(e) => startDrag(e, 'card', c)} onpointermove={onDrag} onpointerup={endDrag} onpointercancel={endDrag}></button>
            {/each}
        {/if}
        <button type="button" class="handle screen-handle" class:shown={near(sx + sw, sy + sh) || dragging === 'screen'}
            aria-label="Resize the video frame" title="Drag to resize the frame (Shift keeps the ratio)"
            style="left:{sx + sw}px;top:{sy + sh}px"
            onpointerdown={(e) => startDrag(e, 'screen')} onpointermove={onDrag} onpointerup={endDrag} onpointercancel={endDrag}></button>

        {#if partialData && !partialDismissed}
            <div class="stage-note" role="status" transition:slide={{ duration: 160 }}>
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>
                    <b>Some details couldn't be fetched.</b> YouTube's data API didn't answer, so duration, views, avatar and description
                    may be missing. Everything else works. <a href="/contact">Report it</a>
                </p>
                <button type="button" onclick={() => (partialDismissed = true)} aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
            </div>
        {/if}

        <span class="stage-tag">
            <b>{screenLabel === 'Custom' ? `${px(screen.w)} × ${px(screen.h)}` : `${screenLabel} frame`}</b>
            {#if video}<span class="tag-detail">· card {px(boxW)} × {px(boxH)} px, {cardShare}% of the width</span>{/if}
        </span>
        <div class="stage-btns">
            <button type="button" class="stage-btn wide" onclick={() => fitCard()} disabled={!video} title="Back to 50% of the width, centred">
                <i class="fa-solid fa-compress"></i> Fit card
            </button>
            <button type="button" class="stage-btn" class:on={guideMenu} onclick={() => { guideMenu = !guideMenu; bgMenu = false; }}
                title="Guides, snapping and padding" aria-label="Guides, snapping and padding" aria-expanded={guideMenu}>
                <i class="fa-solid fa-magnet"></i>
            </button>
            <button type="button" class="stage-btn" class:on={bgMenu} onclick={() => { bgMenu = !bgMenu; guideMenu = false; }}
                title="Frame background" aria-label="Frame background" aria-expanded={bgMenu}>
                <i class="fa-solid fa-image"></i>
            </button>
        </div>
        {#if guideMenu}
            <div class="bg-menu guide-menu" transition:slide={{ duration: 140 }}>
                <div class="row-between">
                    <span class="bg-title">Snap to edges and centre <small>hold Alt to place freely</small></span>
                    {@render switchBtn(snapOn, () => (snapOn = !snapOn), 'Snapping')}
                </div>
                <div class="row-between">
                    <span class="bg-title">Always show guides</span>
                    {@render switchBtn(showGuides, () => (showGuides = !showGuides), 'Always show guides')}
                </div>
                <div class="pad-field">
                    <div class="row-between">
                        <span class="bg-title">Padding <small>from every edge</small></span>
                        <label class="pad-num"><input type="number" min="0" max={maxPad} step="1" bind:value={pad} aria-label="Padding in pixels" /><em>px</em></label>
                    </div>
                    <input class="range" type="range" min="0" max={maxPad} step="1" bind:value={pad} aria-label="Padding" />
                    <div class="seg wide">
                        {#each PAD_PRESETS as pp}
                            <button type="button" class:active={pad === padFrac(pp.k)} onclick={() => (pad = padFrac(pp.k))}>{pp.label}</button>
                        {/each}
                    </div>
                </div>
                <div class="row-between">
                    <span class="bg-title">Place the card</span>
                    <div class="spots" role="group" aria-label="Place the card">
                        {#each [0, 1, 2] as ay}
                            {#each [0, 1, 2] as ax}
                                <button type="button" class="spot" onclick={() => align(ax, ay)}
                                    aria-label="{['Top', 'Middle', 'Bottom'][ay]} {['left', 'centre', 'right'][ax]}"><span></span></button>
                            {/each}
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
        {#if bgMenu}
            <div class="bg-menu" transition:slide={{ duration: 140 }}>
                <span class="bg-title">Frame background <small>preview only</small></span>
                <label class="bg-upload">
                    <i class="fa-solid fa-upload"></i> Use a frame from your video
                    <input type="file" accept="image/*" onchange={onBgImage} />
                </label>
                <div class="bg-row">
                    <button type="button" class="bg-sw frame-sw" class:active={screenBg.type === 'frame'} onclick={() => setScreenBg('frame')} title="Plain frame" aria-label="Plain frame"></button>
                    {#if thumbBg}
                        <button type="button" class="bg-sw" class:active={screenBg.type === 'thumb'} style="background:url('{thumbBg}') center / cover"
                            onclick={() => setScreenBg('thumb')} title="Video thumbnail" aria-label="Video thumbnail"></button>
                    {/if}
                    {#each ['#000000', '#ffffff', '#00b140'] as c}
                        <button type="button" class="bg-sw" class:active={screenBg.type === 'color' && screenBg.value === c}
                            style="background:{c}" onclick={() => setScreenBg('color', c)} title={c === '#00b140' ? 'Green screen' : c} aria-label={c === '#00b140' ? 'Green screen' : c}></button>
                    {/each}
                    <label class="bg-sw pick" title="Any colour" style="background:{screenBgColor}">
                        <input type="color" bind:value={screenBgColor} oninput={() => setScreenBg('color', screenBgColor)} aria-label="Frame colour" />
                    </label>
                </div>
            </div>
        {/if}
    </div>

    <!-- ── Panel ── -->
    <aside class="panel" bind:this={panelEl}>
        <div class="tabs" role="tablist" aria-label="Settings">
            {#each TABS as t}
                <button type="button" role="tab" class="tab" class:active={tab === t.id} aria-selected={tab === t.id} onclick={() => (tab = t.id)}>
                    <i class={t.icon}></i><span>{t.label}</span>
                </button>
            {/each}
        </div>

        <div class="panel-scroll">
            <div class="tab-body" role="tabpanel">
                {#if tab === 'content'}
                    {#each GROUPS as g}
                        <div class="group">
                            <h3 class="sub">{g.title}</h3>
                            {#each g.items.filter((it) => !it.only || it.only.includes(config.layout)) as it}
                                <div class="row-between">
                                    <span class="lbl">{it.label}</span>
                                    {@render switchBtn(config.modules[it.key], () => toggleModule(it.key), it.label)}
                                </div>
                                {#if it.key === 'title' && config.modules.title}
                                    <div class="nested" transition:slide={{ duration: 150 }}>
                                        <span class="lbl dim">Max lines</span>
                                        {@render lines(config.titleLines, (n) => { config.titleLines = n; touched.titleLines = true; })}
                                    </div>
                                {:else if it.key === 'description' && config.modules.description}
                                    <div class="nested" transition:slide={{ duration: 150 }}>
                                        <span class="lbl dim">Max lines</span>
                                        {@render lines(config.descriptionLines, (n) => (config.descriptionLines = n))}
                                    </div>
                                {:else if it.key === 'verified' && config.modules.verified}
                                    <div class="nested" transition:slide={{ duration: 150 }}>
                                        <span class="lbl dim">Colour</span>
                                        <span class="seg">
                                            {#each VERIFIED as v}
                                                <button type="button" class:active={config.verifiedColor === v.key} onclick={() => (config.verifiedColor = v.key)}>{v.label}</button>
                                            {/each}
                                        </span>
                                    </div>
                                    {#if config.verifiedColor === 'custom'}
                                        <div class="nested">
                                            <span class="lbl dim">Custom</span>
                                            <input class="swatch-input" type="color" bind:value={config.verifiedColorCustom} aria-label="Verified tick colour" />
                                        </div>
                                    {/if}
                                {:else if it.key === 'date' && config.modules.date}
                                    <div class="nested" transition:slide={{ duration: 150 }}>
                                        <span class="lbl dim">Format</span>
                                        <span class="seg">
                                            <button type="button" class:active={config.dateFormat === 'absolute'} onclick={() => (config.dateFormat = 'absolute')}>Jul 5, 2025</button>
                                            <button type="button" class:active={config.dateFormat === 'relative'} onclick={() => (config.dateFormat = 'relative')}>5 months ago</button>
                                        </span>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    {/each}

                {:else if tab === 'style'}
                    <div class="field">
                        <span class="lbl">Theme</span>
                        <div class="themes">
                            {#each [...Object.keys(PALETTES), 'custom'] as k}
                                {@const p = k === 'custom' ? config.colors : PALETTES[k]}
                                <button type="button" class="theme" class:active={config.palette === k} onclick={() => setPalette(k)}>
                                    <span class="theme-img" style="background:{p.bg}">
                                        <span style="background:{p.secondary};opacity:.35"></span>
                                        <span style="background:{p.text}"></span>
                                        <span style="background:{p.secondary}"></span>
                                        <i style="background:{p.accent}"></i>
                                    </span>
                                    <span class="theme-name">{PALETTE_NAMES[k].replace('YouTube ', '')}</span>
                                </button>
                            {/each}
                        </div>
                    </div>
                    {#if config.palette === 'custom'}
                        <div class="pickers" transition:slide={{ duration: 160 }}>
                            {#each COLOR_FIELDS as f}
                                <label class="picker">
                                    <input type="color" bind:value={config.colors[f.key]} />
                                    <span>{f.label} <em>{config.colors[f.key]}</em></span>
                                </label>
                            {/each}
                        </div>
                    {/if}
                    <div class="field">
                        <span class="lbl">Font</span>
                        <div class="fonts">
                            {#each FONTS as f}
                                <button type="button" class="font" class:active={config.font === f} onclick={() => (config.font = f)}>
                                    <span class="font-aa" style="font-family:'{f}',sans-serif">Aa</span>
                                    <span class="font-name">{f}</span>
                                </button>
                            {/each}
                        </div>
                    </div>
                    <SnapSlider label="Title size" unit="×" bind:value={config.titleScale}
                        min={0.8} max={1.6} step={0.05} notches={[1]} snapDistance={0.05}
                        baseline={L.defaultTitleScale ?? 1}
                        reset={() => { touched.titleScale = false; config.titleScale = L.defaultTitleScale ?? 1; }}
                        tune={() => (touched.titleScale = true)} />
                    <SnapSlider label="Text size" unit="×" bind:value={config.textScale}
                        min={0.5} max={1.5} step={0.05} notches={[0.5, 0.75, 1, 1.25]} snapDistance={0.05}
                        baseline={L.defaultTextScale ?? 1}
                        reset={() => { touched.textScale = false; config.textScale = L.defaultTextScale ?? 1; }}
                        tune={() => (touched.textScale = true)} />
                    {#if usesScrim}
                        <div class="group">
                            <h3 class="sub">Thumbnail shade</h3>
                            <div class="row-between">
                                <span class="lbl">{overlay ? 'Dark fade behind the text' : 'Dark fade on the thumbnail'}</span>
                                {@render switchBtn(config.modules.scrim, () => toggleModule('scrim'), 'Thumbnail shade')}
                            </div>
                            {#if config.modules.scrim}
                                <SnapSlider label="Strength" unit="%" bind:value={config.scrimOpacity}
                                    min={30} max={100} step={1} notches={[50, 70, 85, 100]} snapDistance={5}
                                    baseline={85} reset={() => (config.scrimOpacity = 85)} />
                            {/if}
                        </div>
                    {/if}

                {:else if tab === 'shape'}
                    <div class="field">
                        <span class="lbl">Size on the frame <small>{px(boxW)} px wide on a {px(screen.w)} px frame</small></span>
                        <div class="seg wide">
                            {#each [25, 35, 50, 75] as pc}
                                <button type="button" class:active={Math.abs(config.size - pc) < 0.5} onclick={() => (config.size = pc)}>{pc}%{pc === 50 ? ' ★' : ''}</button>
                            {/each}
                        </div>
                        <SnapSlider label="Card width" unit="%" bind:value={config.size}
                            min={2} max={100} step={0.5} notches={[15, 25, 35, 50, 75, 100]} snapDistance={1}
                            baseline={50} reset={() => (config.size = 50)} />
                        <p class="hint">★ 50% is the recommended size. The card stays at this share when you change the frame, and downloads at exactly that many pixels, so it drops in at 100%.</p>
                    </div>
                    <div class="field">
                        <span class="lbl">Aspect</span>
                        <div class="seg wide">
                            <button type="button" class:active={config.aspect === 'auto'} onclick={() => (config.aspect = 'auto')}>Auto</button>
                            {#each Object.keys(ASPECTS) as a}
                                <button type="button" class:active={config.aspect === a} onclick={() => (config.aspect = a)}>{a}</button>
                            {/each}
                        </div>
                    </div>
                    <SnapSlider label="Frame" unit="px" bind:value={config.padding}
                        min={0} max={80} step={1} notches={[0, 16, 24, 40, 64, 80]} snapDistance={2}
                        baseline={L.defaultPadding ?? 0}
                        reset={() => { touched.padding = false; config.padding = L.defaultPadding ?? 0; }}
                        tune={() => (touched.padding = true)} />
                    <SnapSlider label="Card corners" unit="px" bind:value={config.containerRadius}
                        min={0} max={128} step={1} notches={[0, 16, 32, 48, 64, 96, 128]} snapDistance={3}
                        baseline={32} reset={() => (config.containerRadius = 32)} />
                    {#if !posterLayout}
                        <SnapSlider label="Thumbnail corners" unit="px" bind:value={config.radius}
                            min={0} max={32} step={1} notches={[0, 4, 8, 12, 16, 24, 32]} snapDistance={0.6}
                            baseline={L.defaultRadius ?? 12}
                            reset={() => { touched.radius = false; config.radius = L.defaultRadius ?? 12; }}
                            tune={() => (touched.radius = true)} />
                    {/if}
                    {#if usesRatio}
                        <SnapSlider label="Thumbnail share" unit="%" bind:value={config.ratio}
                            min={25} max={85} step={1} notches={[34, 40, 50, 60, 70, 85]} snapDistance={2}
                            baseline={40} reset={() => (config.ratio = 40)} />
                    {/if}

                    <button type="button" class="more-btn" class:open={more.shape} aria-expanded={more.shape} onclick={() => (more.shape = !more.shape)}>
                        {more.shape ? 'Fewer options' : 'Spacing'}
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                    {#if more.shape}
                        <div class="more" transition:slide={{ duration: 180 }}>
                            <SnapSlider label="Between text lines" unit="px" bind:value={config.textGap}
                                min={0} max={32} step={1} notches={[0, 2, 4, 8, 12, 16, 24]} snapDistance={0.6}
                                baseline={L.defaults.text}
                                reset={() => { touched.textGap = false; config.textGap = L.defaults.text; }}
                                tune={() => (touched.textGap = true)} />
                            {#if usesThumbGap}
                                <SnapSlider label="Below the thumbnail" unit="px" bind:value={config.thumbGap}
                                    min={0} max={40} step={1} notches={[0, 8, 12, 16, 24, 32]} snapDistance={0.6}
                                    baseline={L.defaults.thumb}
                                    reset={() => { touched.thumbGap = false; config.thumbGap = L.defaults.thumb; }}
                                    tune={() => (touched.thumbGap = true)} />
                            {/if}
                            {#if usesColumns}
                                <SnapSlider label="Side gap" unit="px" bind:value={config.columnGap}
                                    min={0} max={40} step={1} notches={[0, 8, 12, 16, 24, 32]} snapDistance={0.6}
                                    baseline={L.defaults.column}
                                    reset={() => { touched.columnGap = false; config.columnGap = L.defaults.column; }}
                                    tune={() => (touched.columnGap = true)} />
                            {/if}
                        </div>
                    {/if}

                {:else if tab === 'ai'}
                    <p class="hint lead">Paste this into ChatGPT, Claude or your agent, then send it YouTube links. Cards come back in this exact style.</p>
                    <div class="seg wide">
                        {#each SNIPPETS as sn}
                            <button type="button" class:active={snippet === sn.id} onclick={() => (snippet = sn.id)}>{sn.label}</button>
                        {/each}
                    </div>
                    <textarea class="code" readonly rows={snippet === 'prompt' ? 6 : 5} value={snippetText} aria-label={snippet === 'prompt' ? 'Prompt for an AI assistant' : 'Image URL'}
                        onfocus={(e) => e.currentTarget.select()}></textarea>
                    <div class="api-actions">
                        <button type="button" class="btn btn-sm" onclick={copyApi} disabled={!video}>
                            <i class="fa-solid {apiCopied ? 'fa-check' : 'fa-copy'}"></i>{apiCopied ? 'Copied' : snippet === 'prompt' ? 'Copy prompt' : 'Copy URL'}
                        </button>
                        <a class="btn btn-ghost btn-sm" href={apiUrl} target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i>Test it</a>
                    </div>
                    <ul class="facts">
                        <li><i class="fa-solid fa-key"></i>No API key: the AI can use it straight away</li>
                        <li><i class="fa-solid fa-palette"></i>The prompt carries your layout, colours, font and size</li>
                        <li><i class="fa-solid fa-robot"></i>Works in agents and automations (n8n, Zapier, Make) too</li>
                    </ul>
                    <a class="wide-btn" href="#api"><i class="fa-solid fa-book"></i> API reference</a>
                {/if}
            </div>
        </div>

        <!-- ── Export: always in reach ── -->
        <div class="export">
            <div class="export-top">
                <span class="seg">
                    {#each [['png', 'PNG'], ['jpeg', 'JPEG'], ['webp', 'WebP']] as [f, l]}
                        <button type="button" class:active={format === f} onclick={() => (format = f)}>{l}</button>
                    {/each}
                </span>
                <span class="export-hint">{cardH ? `${px(cardW)} × ${px(cardH)} px` : ''}</span>
            </div>
            <div class="export-actions">
                <button class="btn btn-download" disabled={exporting || !video} onclick={download}>
                    <i class="fa-solid fa-download"></i>
                    {exporting ? 'Rendering…' : `Download ${format === 'jpeg' ? 'JPEG' : format === 'webp' ? 'WebP' : 'PNG'}`}
                </button>
                <button class="btn btn-ghost btn-copy" disabled={exporting || !video} onclick={copy} title="Copy PNG to clipboard" aria-label="Copy PNG to clipboard">
                    <i class="fa-solid {copied ? 'fa-check' : 'fa-clipboard'}"></i>
                </button>
            </div>
            <p class="export-meta">{format === 'jpeg' ? 'JPEG has no transparency: the corners go white.' : 'Transparent corners, ready to drop on your timeline.'}</p>
            {#if exportError}<p class="export-error">{exportError}</p>{/if}
        </div>
    </aside>
</div>

<YouTubeCardGuide origin={page.url.origin} />

{#snippet switchBtn(on, fn, label)}
    <button type="button" class="switch" class:on role="switch" aria-checked={!!on} aria-label={label} onclick={fn}><span></span></button>
{/snippet}

{#snippet lines(value, set)}
    <span class="seg">
        {#each [1, 2, 3] as n}
            <button type="button" class:active={value === n} onclick={() => set(n)}>{n}</button>
        {/each}
    </span>
{/snippet}

<style>
    .editor,
    .editor *,
    .top,
    .top *,
    .api-banner,
    .api-banner * { box-sizing: border-box; }

    /* ── API banner ── */
    .api-banner {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        width: calc(100% - 2 * clamp(1.25rem, 4vw, 3rem));
        max-width: 760px;
        margin: -0.75rem auto 1.75rem;
        padding: 0.55rem 0.6rem 0.55rem 0.55rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        color: rgba(255, 255, 255, 0.75);
        font-family: var(--font-body);
        font-size: 0.85rem;
        text-align: left;
        cursor: pointer;
        transition: border-color 0.2s;
    }
    .api-banner:hover { border-color: rgba(255, 43, 31, 0.55); }
    .api-tag {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        background: #ff2b1f;
        color: #fff;
        font-family: var(--font-display);
        font-size: 0.7rem;
        letter-spacing: 0.12em;
    }
    .api-text { flex: 1; min-width: 0; }
    .api-text b { color: #fff; font-weight: 600; }
    .api-cta {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.8rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        color: #fff;
        font-size: 0.78rem;
        white-space: nowrap;
    }
    .api-cta i { font-size: 0.7rem; color: #ff2b1f; transition: transform 0.2s; }
    .api-banner:hover .api-cta i { transform: translateX(2px); }

    /* ── Top: video + layout ── */
    .top {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
        max-width: 1500px;
        margin: 0 auto 1rem;
        padding: 0 clamp(1.25rem, 4vw, 3rem);
    }
    .box {
        min-width: 0;
        padding: 1.1rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
    }

    /* Layout tiles fill the box, whatever the Video box's height */
    /* Video box: link field and the loaded video side by side */
    .video-box { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 1rem; align-items: center; }
    .video-box > .block-head, .video-box > .err { grid-column: 1 / -1; }
    .video-box > .current { margin-top: 0; }
    .layout-box { display: flex; flex-direction: column; }
    .layout-box .layouts { flex: 1; align-content: start; }

    /* ── Workspace: stage + panel, sized to the screen ── */
    .editor {
        --h: clamp(540px, calc(100vh - 7.5rem), 820px);
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 1rem;
        max-width: 1500px;
        margin: 0 auto var(--space-4xl);
        padding: 0 clamp(1.25rem, 4vw, 3rem);
    }

    .stage {
        position: sticky;
        top: 5.5rem;
        height: var(--h);
        min-width: 0;
        overflow: hidden;
        user-select: none;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background:
            radial-gradient(110% 80% at 50% 115%, rgba(255, 43, 31, 0.16), transparent 60%),
            radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1.2px) 0 0 / 22px 22px,
            rgba(10, 10, 10, 0.6);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
    }
    /* The video frame, in proportion */
    .screen {
        position: absolute;
        overflow: hidden;
        border-radius: 3px;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 30px 70px rgba(0, 0, 0, 0.6);
        background: #000;
    }
    .screen.frame {
        background:
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px) 0 0 / 33.333% 33.333%,
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px) 0 0 / 33.333% 33.333%,
            radial-gradient(120% 120% at 30% 20%, #262626, #0b0b0b 70%);
    }
    .card-holder {
        position: absolute;
        cursor: grab;
        touch-action: none;
        outline: 0;
    }
    .card-holder::after {
        content: '';
        position: absolute;
        inset: -1px;
        border: 1px dashed rgba(255, 255, 255, 0);
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .card-holder:hover::after,
    .card-holder:focus-visible::after,
    .card-holder.moving::after { border-color: rgba(255, 43, 31, 0.8); }
    .card-holder.moving { cursor: grabbing; }
    .scaled {
        transform-origin: 0 0;
        pointer-events: none;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5), 0 3px 10px rgba(0, 0, 0, 0.3);
    }
    .stage.busy { cursor: grabbing; }

    /* Guides */
    .safe {
        position: absolute;
        border: 1px dashed rgba(255, 255, 255, 0.22);
        pointer-events: none;
        transition: border-color 0.15s;
    }
    .safe.live { border-color: rgba(255, 255, 255, 0.45); }
    .mid {
        position: absolute;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s;
    }
    .mid.v { left: 50%; top: 0; bottom: 0; border-left: 1px dashed rgba(255, 255, 255, 0.35); }
    .mid.h { top: 50%; left: 0; right: 0; border-top: 1px dashed rgba(255, 255, 255, 0.35); }
    .mid.live { opacity: 1; }
    .guide {
        position: absolute;
        z-index: 2;
        pointer-events: none;
        background: #ff2b1f;
        box-shadow: 0 0 6px rgba(255, 43, 31, 0.8);
    }
    .guide.v { top: 0; bottom: 0; width: 1px; margin-left: -0.5px; }
    .guide.h { left: 0; right: 0; height: 1px; margin-top: -0.5px; }
    .guide-menu { width: 300px; gap: 0.8rem; }
    .guide-menu .bg-title small { display: block; margin: 0.1rem 0 0; }
    .pad-field { display: flex; flex-direction: column; gap: 0.5rem; }
    .pad-num {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        padding: 0.15rem 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 6px;
        font-family: var(--font-body);
    }
    .pad-num input {
        width: 3.2rem;
        border: 0;
        outline: 0;
        background: none;
        color: #fff;
        font-size: 0.8rem;
        text-align: right;
        font-variant-numeric: tabular-nums;
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .pad-num input::-webkit-inner-spin-button { -webkit-appearance: none; }
    .pad-num em { font-style: normal; font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); }
    .range { width: 100%; accent-color: #ff2b1f; }
    .spots {
        display: grid;
        grid-template-columns: repeat(3, 1.5rem);
        gap: 2px;
        padding: 3px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 5px;
    }
    .spot { display: grid; place-items: center; height: 1rem; padding: 0; border: 0; border-radius: 2px; background: none; cursor: pointer; }
    .spot span { width: 0.55rem; height: 0.35rem; border-radius: 1px; background: rgba(255, 255, 255, 0.3); }
    .spot:hover { background: rgba(255, 43, 31, 0.2); }
    .spot:hover span { background: #ff2b1f; }

    /* Resize handles (outside the clipped frame) */
    .handle {
        position: absolute;
        z-index: 3;
        width: 14px;
        height: 14px;
        margin: -7px 0 0 -7px;
        padding: 0;
        border: 2px solid #fff;
        border-radius: 3px;
        background: #ff2b1f;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
        cursor: nwse-resize;
        touch-action: none;
        opacity: 0;
        transform: scale(0.6);
        transition: opacity 0.15s, transform 0.15s;
    }
    .handle.nesw { cursor: nesw-resize; }
    .handle.shown, .handle:focus-visible { opacity: 1; transform: scale(1); }
    .handle.shown:hover { transform: scale(1.2); }
    /* No hover on touch screens: keep them visible */
    @media (hover: none) { .handle { opacity: 1; transform: none; } }
    .screen-handle { background: #fff; border-color: #0b0b0b; border-radius: 50%; }

    /* Edge strips: the whole outline resizes; a thin accent line shows on hover. */
    .edge {
        position: absolute;
        z-index: 2;
        width: 0;
        height: 12px;
        margin-top: -6px;
        padding: 0;
        border: 0;
        background: none;
        cursor: ns-resize;
        touch-action: none;
    }
    .edge.vert { width: 12px; height: 0; margin: 0 0 0 -6px; cursor: ew-resize; }
    .edge::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 5px;
        height: 2px;
        background: #ff2b1f;
        opacity: 0;
        transition: opacity 0.15s;
    }
    .edge.vert::after { top: 0; bottom: 0; left: 5px; right: auto; width: 2px; height: auto; }
    .edge:hover::after, .edge.active::after, .edge:focus-visible::after { opacity: 1; }

    /* Resolution bar */
    .stage-bar {
        position: absolute;
        top: 0.8rem;
        left: 0.9rem;
        right: 0.9rem;
        z-index: 4;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.6rem;
    }
    .stage-bar .seg { background: rgba(0, 0, 0, 0.45); }
    .screens { overflow-x: auto; scrollbar-width: none; max-width: 100%; }
    .res {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.2rem 0.25rem 0.2rem 0.6rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.45);
        font-family: var(--font-body);
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.45);
    }
    .res input {
        width: 3.6rem;
        padding: 0.2rem 0;
        border: 0;
        outline: 0;
        background: none;
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.78rem;
        text-align: center;
        font-variant-numeric: tabular-nums;
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .res input::-webkit-inner-spin-button { -webkit-appearance: none; }
    .res input:focus { color: #ff6a5f; }
    .mini-btn {
        width: 1.6rem;
        height: 1.6rem;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.65rem;
        cursor: pointer;
    }
    .mini-btn:hover { color: #fff; background: rgba(255, 43, 31, 0.3); }
    .stage-empty {
        position: absolute;
        inset: 0;
        justify-content: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        font-family: var(--font-body);
        font-size: 0.9rem;
    }
    .stage-empty i { font-size: 1.6rem; color: #ff2b1f; }
    .stage-tag {
        position: absolute;
        left: 1rem;
        bottom: 0.9rem;
        padding: 0.3rem 0.7rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.45);
        font-family: var(--font-body);
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.75);
        font-variant-numeric: tabular-nums;
    }
    .stage-tag b { color: #fff; font-weight: 600; }
    .stage-btns { position: absolute; right: 0.9rem; bottom: 0.75rem; display: flex; gap: 0.4rem; }
    .stage-btn {
        width: 2.2rem;
        height: 2.2rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.45);
        color: #fff;
        cursor: pointer;
        transition: border-color 0.2s, color 0.2s;
    }
    .stage-btn:hover, .stage-btn.on { border-color: rgba(255, 43, 31, 0.6); color: #ff2b1f; }
    .stage-btn.wide {
        width: auto;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0 0.85rem;
        font-family: var(--font-body);
        font-size: 0.75rem;
    }
    .stage-btn:disabled { opacity: 0.4; cursor: default; }
    .stage-tag, .stage-btns { z-index: 4; }
    .bg-upload {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        padding: 0.5rem 0.7rem;
        border: 1px dashed rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.78rem;
        color: #fff;
        cursor: pointer;
    }
    .bg-upload i { color: #ff2b1f; }
    .bg-upload:hover { border-color: rgba(255, 43, 31, 0.6); }
    .bg-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .bg-sw.frame-sw { background: radial-gradient(120% 120% at 30% 20%, #3a3a3a, #0b0b0b 70%); }
    .bg-menu {
        position: absolute;
        z-index: 5;
        right: 0.9rem;
        bottom: 3.4rem;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        padding: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        background: rgba(18, 18, 18, 0.88);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .bg-title { font-family: var(--font-body); font-size: 0.78rem; color: #fff; }
    .bg-title small { margin-left: 0.3rem; color: rgba(255, 255, 255, 0.4); font-size: 0.7rem; }
    .bg-row { display: flex; gap: 0.4rem; }
    .bg-sw {
        position: relative;
        display: grid;
        place-items: center;
        width: 1.9rem;
        height: 1.9rem;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.75);
        font-size: 0.75rem;
        cursor: pointer;
        overflow: hidden;
    }
    .bg-sw:hover { border-color: rgba(255, 255, 255, 0.6); }
    .bg-sw.active { box-shadow: 0 0 0 2px #121212, 0 0 0 3px #ff2b1f; }
    .bg-sw input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

    .stage-note {
        position: absolute;
        top: 3.8rem;
        left: 0.9rem;
        right: 0.9rem;
        z-index: 5;
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        padding: 0.7rem 0.8rem;
        border: 1px solid rgba(255, 43, 31, 0.4);
        border-radius: 10px;
        background: rgba(30, 10, 8, 0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        font-family: var(--font-body);
        font-size: 0.8rem;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.72);
    }
    .stage-note > i { color: #ff2b1f; margin-top: 0.2rem; }
    .stage-note p { flex: 1; margin: 0; }
    .stage-note b { color: #fff; }
    .stage-note a { color: #fff; }
    .stage-note button { border: 0; background: none; color: rgba(255, 255, 255, 0.6); cursor: pointer; }
    .stage-note button:hover { color: #fff; }

    /* ── Panel: scrolls inside, export pinned below ── */
    .panel {
        position: sticky;
        top: 5.5rem;
        height: var(--h);
        display: flex;
        flex-direction: column;
        min-width: 0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        overflow: hidden;
    }
    .panel-scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }

    .block { padding: 1.1rem 1.1rem 1rem; }
    .block-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
    }
    .head-note { font-family: var(--font-body); font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); text-align: right; }
    .text-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border: 0;
        background: none;
        color: rgba(255, 255, 255, 0.5);
        font-family: var(--font-body);
        font-size: 0.78rem;
        cursor: pointer;
    }
    .text-btn:hover { color: #fff; }

    /* Video */
    .url-row { display: flex; gap: 0.45rem; margin: 0; }
    .go { flex-shrink: 0; gap: 0.5rem; justify-content: center; font-family: var(--font-body); white-space: nowrap; }
    .go:disabled { opacity: 0.6; cursor: progress; }
    .err { display: flex; gap: 0.5rem; align-items: center; margin: 0.6rem 0 0; font-family: var(--font-body); font-size: 0.8rem; color: #ff8a80; }
    .current {
        display: flex;
        gap: 0.7rem;
        align-items: center;
        margin-top: 0.7rem;
        padding: 0.45rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.025);
    }
    .current img { width: 4.6rem; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 5px; flex-shrink: 0; }
    .current-text { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; font-family: var(--font-body); }
    .current-text b {
        font-size: 0.8rem;
        font-weight: 500;
        color: #fff;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.3;
    }
    .current-text span { font-size: 0.72rem; color: rgba(255, 255, 255, 0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .demo {
        font-style: normal;
        margin-right: 0.35rem;
        padding: 0.05rem 0.4rem;
        border-radius: 999px;
        background: rgba(255, 43, 31, 0.16);
        color: #ff6a5f;
        font-size: 0.66rem;
    }

    /* Layouts: real miniature cards */
    .layouts { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0.5rem; }
    .layout {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        min-width: 0;
        padding: 0.35rem 0.35rem 0.45rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.02);
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s, color 0.2s;
    }
    .layout:hover { border-color: rgba(255, 255, 255, 0.25); color: #fff; }
    .layout.active { border-color: rgba(255, 43, 31, 0.6); background: rgba(255, 43, 31, 0.1); color: #fff; }
    .layout-img {
        position: relative;
        display: grid;
        place-items: center;
        aspect-ratio: 16 / 11;
        overflow: hidden;
        border-radius: 5px;
        background: rgba(0, 0, 0, 0.25);
        pointer-events: none;
    }
    /* A YouTube-sized card (about 380px) scaled down to fit its tile */
    .mini {
        position: absolute;
        left: 50%;
        top: 50%;
        display: block;
        width: max-content;
        transform: translate(-50%, -50%) scale(var(--k, 0.3));
        transform-origin: center;
    }
    .layout-name { font-family: var(--font-body); font-size: 0.75rem; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Tabs */
    .tabs {
        flex-shrink: 0;
        z-index: 2;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(16, 16, 16, 0.6);
    }
    .tab {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        padding: 0.75rem 0.1rem 0.65rem;
        border: 0;
        background: none;
        color: rgba(255, 255, 255, 0.5);
        font-family: var(--font-body);
        font-size: 0.72rem;
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.2s;
    }
    .tab i { font-size: 0.9rem; }
    .tab:hover, .tab.active { color: #fff; }
    .tab.active i { color: #ff2b1f; }
    .tab.active::after {
        content: '';
        position: absolute;
        left: 18%;
        right: 18%;
        bottom: -1px;
        height: 2px;
        border-radius: 2px;
        background: #ff2b1f;
    }

    .tab-body { display: flex; flex-direction: column; gap: 1.1rem; padding: 1.1rem; }
    .field { display: flex; flex-direction: column; gap: 0.5rem; }
    .lbl { font-family: var(--font-body); font-size: 0.85rem; color: rgba(255, 255, 255, 0.85); }
    .lbl small { margin-left: 0.4rem; font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); }
    .lbl.dim { font-size: 0.78rem; color: rgba(255, 255, 255, 0.5); }
    .row-between { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; min-height: 1.6rem; }
    .group { display: flex; flex-direction: column; gap: 0.6rem; }
    .group + .group { padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.06); }
    .sub {
        margin: 0 0 0.1rem;
        font-family: var(--font-display);
        font-size: 0.68rem;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #ff2b1f;
    }
    .nested {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin: -0.15rem 0 0.1rem;
        padding-left: 0.8rem;
        border-left: 2px solid rgba(255, 255, 255, 0.08);
    }

    /* Chips + segmented controls */
    .chip {
        padding: 0.4rem 0.8rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
        color: rgba(255, 255, 255, 0.72);
        font-family: var(--font-body);
        font-size: 0.8rem;
        cursor: pointer;
        transition: color 0.2s, background 0.2s, border-color 0.2s;
    }
    .chip.sm { padding: 0.25rem 0.6rem; font-size: 0.72rem; }
    .chip:hover { color: #fff; border-color: rgba(255, 43, 31, 0.55); background: rgba(255, 43, 31, 0.1); }
    .chip:disabled { opacity: 0.5; cursor: progress; }

    .seg {
        display: inline-flex;
        padding: 0.2rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
    }
    .seg.wide { display: flex; }
    .seg.wide button { flex: 1; min-width: 0; padding-inline: 0.3rem; }
    .seg button {
        padding: 0.32rem 0.7rem;
        border: 1px solid transparent;
        border-radius: 999px;
        background: none;
        color: rgba(255, 255, 255, 0.6);
        font-family: var(--font-body);
        font-size: 0.76rem;
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.2s, background 0.2s, border-color 0.2s;
    }
    .seg button:hover { color: #fff; }
    .seg button.active { color: #fff; background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }

    /* Switch */
    .switch {
        position: relative;
        width: 2.4rem;
        height: 1.35rem;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
    }
    .switch span {
        position: absolute;
        top: 50%;
        left: 0.15rem;
        width: 0.95rem;
        height: 0.95rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.7);
        transform: translateY(-50%);
        transition: left 0.2s, background 0.2s;
    }
    .switch.on { background: rgba(255, 43, 31, 0.55); border-color: rgba(255, 43, 31, 0.8); }
    .switch.on span { left: calc(100% - 1.1rem); background: #fff; }

    .text {
        flex: 1;
        width: 100%;
        min-width: 0;
        padding: 0.6rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        outline: 0;
        background: rgba(255, 255, 255, 0.04);
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.88rem;
    }
    .text::placeholder { color: rgba(255, 255, 255, 0.35); }
    .text:focus { border-color: rgba(255, 255, 255, 0.45); }
    .swatch-input,
    .picker input {
        width: 1.8rem;
        height: 1.8rem;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: none;
        cursor: pointer;
    }
    .swatch-input::-webkit-color-swatch-wrapper,
    .picker input::-webkit-color-swatch-wrapper { padding: 0; }
    .swatch-input::-webkit-color-swatch,
    .picker input::-webkit-color-swatch { border: 0; border-radius: 5px; }

    /* Style: themes */
    .themes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.45rem; }
    .theme {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 0.35rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        background: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: border-color 0.2s, color 0.2s, background 0.2s;
    }
    .theme:hover { border-color: rgba(255, 255, 255, 0.25); color: #fff; }
    .theme.active { border-color: rgba(255, 43, 31, 0.6); background: rgba(255, 43, 31, 0.1); color: #fff; }
    .theme-img {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 3px;
        height: 2.6rem;
        padding: 5px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 5px;
    }
    .theme-img span { display: block; height: 3px; border-radius: 2px; }
    .theme-img span:first-child { height: 13px; border-radius: 3px; }
    .theme-img span:nth-child(2) { width: 80%; }
    .theme-img span:nth-child(3) { width: 50%; opacity: 0.8; }
    .theme-img i { position: absolute; right: 7px; top: 7px; width: 6px; height: 4px; border-radius: 1px; }
    .theme-name { font-family: var(--font-body); font-size: 0.72rem; }
    .pickers { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; }
    .picker {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.4rem 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        cursor: pointer;
    }
    .picker span { display: flex; flex-direction: column; font-family: var(--font-body); font-size: 0.78rem; color: rgba(255, 255, 255, 0.85); }
    .picker em { font-style: normal; font-size: 0.68rem; color: rgba(255, 255, 255, 0.4); font-family: 'JetBrains Mono', ui-monospace, monospace; }

    /* Style: fonts shown in their own face */
    .fonts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
    .font {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.1rem;
        min-width: 0;
        padding: 0.45rem 0.55rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
        color: rgba(255, 255, 255, 0.75);
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s, color 0.2s;
    }
    .font:hover { border-color: rgba(255, 255, 255, 0.25); color: #fff; }
    .font.active { border-color: rgba(255, 43, 31, 0.6); background: rgba(255, 43, 31, 0.1); color: #fff; }
    .font-aa { font-size: 1.15rem; line-height: 1.2; }
    .font-name { max-width: 100%; font-family: var(--font-body); font-size: 0.66rem; color: rgba(255, 255, 255, 0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* More options */
    .more-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        align-self: flex-start;
        padding: 0;
        border: 0;
        background: none;
        color: rgba(255, 255, 255, 0.55);
        font-family: var(--font-body);
        font-size: 0.8rem;
        cursor: pointer;
    }
    .more-btn i { font-size: 0.65rem; transition: transform 0.2s; }
    .more-btn:hover { color: #fff; }
    .more-btn.open i { transform: rotate(180deg); }
    .more {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
        margin-top: -0.3rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* API tab */
    .hint { margin: 0; font-family: var(--font-body); font-size: 0.75rem; line-height: 1.5; color: rgba(255, 255, 255, 0.45); }
    .hint.lead { font-size: 0.82rem; color: rgba(255, 255, 255, 0.65); }
    .code {
        width: 100%;
        min-height: 7rem;
        resize: vertical;
        padding: 0.65rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        outline: 0;
        background: rgba(0, 0, 0, 0.35);
        color: rgba(255, 255, 255, 0.85);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.72rem;
        line-height: 1.55;
        overflow-wrap: anywhere;
    }
    .code:focus { border-color: rgba(255, 255, 255, 0.4); }
    .api-actions { display: flex; gap: 0.5rem; margin-top: -0.4rem; }
    .api-actions .btn { flex: 1; justify-content: center; }
    .facts { display: flex; flex-direction: column; gap: 0.45rem; margin: 0; padding: 0; list-style: none; }
    .facts li { display: flex; align-items: center; gap: 0.6rem; font-family: var(--font-body); font-size: 0.78rem; color: rgba(255, 255, 255, 0.65); }
    .facts i { width: 1rem; text-align: center; color: #ff2b1f; font-size: 0.75rem; }
    .wide-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.6rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.82rem;
        text-decoration: none;
        transition: border-color 0.2s;
    }
    .wide-btn i { color: #ff2b1f; }
    .wide-btn:hover { border-color: rgba(255, 43, 31, 0.6); }

    /* Export footer */
    .export {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        padding: 1rem 1.1rem 1.05rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(10, 10, 10, 0.6);
    }
    .export-top { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
    .export-hint { font-family: var(--font-body); font-size: 0.78rem; color: rgba(255, 255, 255, 0.5); font-variant-numeric: tabular-nums; }
    .export-actions { display: flex; gap: 0.5rem; }
    .btn-download { flex: 1; justify-content: center; }
    .btn-copy { width: 3.1rem; padding-inline: 0; justify-content: center; }
    .export-actions .btn:disabled { opacity: 0.6; cursor: progress; }
    .export-meta { margin: 0; font-family: var(--font-body); font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); }
    .export-error { margin: 0; font-family: var(--font-body); font-size: 0.78rem; color: #ff6b5f; }

    /* ── Narrow screens: card on top, panel below, page scrolls normally ── */
    @media (max-width: 1100px) {
        .video-box { grid-template-columns: minmax(0, 1fr); }
        .video-box > .current { margin-top: 0.7rem; }
    }
    @media (max-width: 960px) {
        .editor { grid-template-columns: minmax(0, 1fr); }
        .stage { position: relative; top: 0; height: calc(min(56vw, 400px) + 140px); }
        .panel { position: relative; top: 0; height: auto; overflow: visible; }
        .panel-scroll { overflow: visible; }
        .export {
            position: sticky;
            bottom: 0;
            border-radius: 0 0 12px 12px;
            background: #0b0b0b;
        }
        .tabs { position: sticky; top: 4.4rem; background: #0e0e0e; border-radius: 12px 12px 0 0; }
        .panel { overflow: clip; }
    }
    @media (max-width: 640px) {
        /* Still one row: it scrolls sideways */
        .layouts { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 8.5rem; overflow-x: auto; padding-bottom: 0.35rem; scrollbar-width: thin; }
        .res { display: none; }
        .tag-detail { display: none; }
        .api-banner { flex-wrap: wrap; border-radius: 14px; padding: 0.75rem; gap: 0.6rem; }
        .api-text { flex-basis: calc(100% - 5rem); }
        .api-cta { width: 100%; justify-content: center; }
    }
</style>
