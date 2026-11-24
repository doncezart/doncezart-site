<script>
	import Seo from '$lib/components/Seo.svelte';
    // Cutting mat generator. The mat is the hero: a big live preview with one
    // compact panel beside it. Start from a look, adjust in four short tabs
    // (essentials up front, the fine controls behind "More options"), and
    // export from the footer that never scrolls away.
    import { slide } from 'svelte/transition';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import SnapSlider from '$lib/components/ui/SnapSlider.svelte';
    import {
        DEFAULT_CONFIG, MAT_COLORS, SIZE_PRESETS, UNIT_DEFAULTS, MM_PER,
        renderMat, exportSize, svgToPngBlob, toMat
    } from '$lib/components/tools/cutting-mat.js';
    import { makeTextures } from '$lib/components/tools/cutting-mat-tex.js';

    $effect(() => { window.umami?.track('page-view', { page: 'tools-cutting-mat' }); });

    let config = $state(structuredClone(DEFAULT_CONFIG));
    const D = DEFAULT_CONFIG;
    const ud = $derived(UNIT_DEFAULTS[config.unit]);
    const uLabel = $derived(config.unit === 'in' ? 'in' : 'cm');

    // One source for preview + both exports.
    // The preview draws grain and texture at its own pixel scale, so what you
    // see is what the export looks like at 100%.
    // Fit view: grain and texture drawn at the preview's pixel scale and toned
    // down like a downscale would. 100% view: the real pixels of the export,
    // a stage-sized window you can drag around.
    let actual = $state(false);
    let pan = $state({ x: 0, y: 0 }); // live: export px offset of the view centre from the mat centre
    let viewPan = $state({ x: 0, y: 0 }); // committed on drag end; what the rendered window is built around
    const exportPxPerMm = $derived(config.pxPerUnit / MM_PER[config.unit]);
    const win = $derived({ w: Math.min(stageW, config.pxWidth), h: Math.min(stageH, config.pxHeight) });
    function clampPan(p) {
        const mx = Math.max(0, (config.pxWidth - win.w) / 2);
        const my = Math.max(0, (config.pxHeight - win.h) / 2);
        return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
    }
    // Grain / texture / mottle tiles for the current seed and aspect.
    let tex = $state(null);
    const texKey = $derived(`${config.seed}:${(config.pxWidth / config.pxHeight).toFixed(3)}`);
    $effect(() => {
        const [seed, aspect] = texKey.split(':').map(Number);
        let alive = true;
        let made = null;
        makeTextures(seed, aspect).then((t) => {
            made = t;
            if (alive) tex = t;
            else t.revoke();
        });
        return () => {
            alive = false;
            // keep the old set on screen until the new one is ready, then free it
            const old = made;
            if (old) setTimeout(() => old.revoke(), 2000);
        };
    });

    const svg = $derived((() => {
        const mat = toMat($state.snapshot(config));
        if (tex) {
            if (actual) {
                const k = exportPxPerMm;
                const r = renderWin;
                return renderMat(mat, { id: 'cmp', tex: tex.preview, view: { x: r.x / k, y: r.y / k, w: r.w / k, h: r.h / k } });
            }
            // Fit view: the same tiles, scaled down by the browser like the real image would be.
            return renderMat(mat, { id: 'cmp', tex: tex.preview });
        }
        // 100%: render a window ~2× the stage around the committed pan (filters
        // limited to it). Dragging slides that window; letting go re-renders.
        if (actual) {
            const k = exportPxPerMm;
            const r = renderWin;
            return renderMat(mat, { id: 'cmp', texPxPerMm: k, view: { x: r.x / k, y: r.y / k, w: r.w / k, h: r.h / k } });
        }
        const previewPxPerMm = (fit.w / Math.max(1, config.pxWidth)) * exportPxPerMm;
        return renderMat(mat, {
            id: 'cmp',
            texPxPerMm: Math.max(0.5, previewPxPerMm),
            texFade: Math.max(0.35, Math.min(1, Math.sqrt(previewPxPerMm / exportPxPerMm)))
        });
    })());
    const renderWin = $derived((() => {
        const w = Math.min(config.pxWidth, Math.round(stageW * 2));
        const h = Math.min(config.pxHeight, Math.round(stageH * 2));
        const c = clampPan(viewPan);
        const x = Math.max(0, Math.min(config.pxWidth - w, config.pxWidth / 2 + c.x - w / 2));
        const y = Math.max(0, Math.min(config.pxHeight - h, config.pxHeight / 2 + c.y - h / 2));
        return { x, y, w, h };
    })());
    // Where the rendered window sits in the stage so the live pan point is centred.
    const winPos = $derived((() => {
        const p = clampPan(pan);
        return {
            x: Math.round(stageW / 2 - (config.pxWidth / 2 + p.x - renderWin.x)),
            y: Math.round(stageH / 2 - (config.pxHeight / 2 + p.y - renderWin.y))
        };
    })());
    let drag = null;
    function dragStart(e) {
        if (!actual) return;
        drag = { x: e.clientX, y: e.clientY, pan: clampPan(pan) };
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    function dragMove(e) {
        if (!drag) return;
        pan = clampPan({ x: drag.pan.x - (e.clientX - drag.x), y: drag.pan.y - (e.clientY - drag.y) });
    }
    function dragEnd() {
        if (!drag) return;
        drag = null;
        viewPan = clampPan(pan);
    }
    function toggleActual() {
        actual = !actual;
        pan = { x: 0, y: 0 };
        viewPan = { x: 0, y: 0 };
    }
    const out = $derived(exportSize(config));

    // ── Preview fit: the mat is scaled to fit the stage, whatever its aspect ──
    let stageW = $state(0);
    let stageH = $state(0);
    const fit = $derived((() => {
        const pad = stageW < 600 ? 20 : 56;
        const aw = Math.max(1, stageW - pad * 2);
        const ah = Math.max(1, stageH - pad * 2);
        const ar = Math.max(1, Number(config.pxWidth) || 1) / Math.max(1, Number(config.pxHeight) || 1);
        let w = aw;
        let h = w / ar;
        if (h > ah) { h = ah; w = h * ar; }
        return { w: Math.round(w), h: Math.round(h) };
    })());

    // ── Looks: whole-mat starting points (keep size, zoom, units, watermark) ──
    const NO_ANGLES = { a30: false, a45: false, a60: false };
    const LOOKS = [
        { id: 'classic', label: 'Classic', patch: {} },
        { id: 'clean', label: 'Clean', patch: { colorPreset: 'black', wear: 0, grain: 0.12, texture: 0.15, vignette: 0, angles: NO_ANGLES, minorStyle: 'solid', minorOpacity: 0.25 } },
        { id: 'used', label: 'Well used', patch: { wear: 0.8, grain: 0.6, texture: 0.7, vignette: 0.5 } },
        { id: 'blueprint', label: 'Blueprint', patch: { colorPreset: 'blue', circles: true, crosshair: true, wear: 0.08, minorStyle: 'solid', minorOpacity: 0.3 } },
        { id: 'drafting', label: 'Drafting', patch: { colorPreset: 'cream', minorStyle: 'solid', minorOpacity: 0.3, wear: 0.15, angleFrom: 'bl' } },
        { id: 'craft', label: 'Craft', patch: { colorPreset: 'pink', wear: 0.1, vignette: 0.1, angleFrom: 'all' } }
    ];
    function lookConfig(look, base = D) {
        const c = { ...structuredClone(D), ...UNIT_DEFAULTS[base.unit], ...structuredClone(look.patch) };
        const col = MAT_COLORS[c.colorPreset];
        if (col) { c.matColor = col.mat; c.lineColor = col.line; }
        return c;
    }
    // Small previews of each look (A-series proportions, no label or numbers to stay legible).
    const lookThumbs = LOOKS.map((l, i) => renderMat(
        { ...lookConfig(l), width: 21, height: 14, margin: 1, brand: false, numberEdges: { top: false, right: false, bottom: false, left: false } },
        { id: `lk${i}` }
    ));
    let look = $state('classic');
    function applyLook(l) {
        const keep = Object.fromEntries(
            Object.entries(config).filter(([k]) => k.startsWith('brand') || ['pxWidth', 'pxHeight', 'pxPerUnit', 'unit', 'seed'].includes(k))
        );
        config = { ...lookConfig(l, config), ...keep };
        look = l.id;
    }

    // ── Tabs ──
    const TABS = [
        { id: 'size', label: 'Size', icon: 'fa-solid fa-ruler-combined' },
        { id: 'colour', label: 'Colour', icon: 'fa-solid fa-droplet' },
        { id: 'markings', label: 'Markings', icon: 'fa-solid fa-border-all' },
        { id: 'finish', label: 'Finish', icon: 'fa-solid fa-wand-magic-sparkles' },
        { id: 'watermark', label: 'Watermark', icon: 'fa-solid fa-signature' }
    ];
    let tab = $state('size');
    let more = $state({ size: false, colour: false, markings: false, finish: false, watermark: false });

    // ── Size (pixels) ──
    const DEVICES = [
        { id: 'desktop', label: 'Desktop', icon: 'fa-solid fa-desktop' },
        { id: 'phone', label: 'Phone', icon: 'fa-solid fa-mobile-screen' },
        { id: 'tablet', label: 'Tablet', icon: 'fa-solid fa-tablet-screen-button' }
    ];
    let device = $state('desktop');
    function setUnit(u) {
        if (u === config.unit) return;
        const k = MM_PER[u] / MM_PER[config.unit];
        const ppu = Math.round(config.pxPerUnit * k);
        config.unit = u;
        Object.assign(config, UNIT_DEFAULTS[u]);
        config.pxPerUnit = ppu; // same zoom, new unit
        config.numberSize = D.numberSize;
    }
    function applyPreset(p) {
        config.pxWidth = p.w;
        config.pxHeight = p.h;
    }
    function rotate() {
        [config.pxWidth, config.pxHeight] = [config.pxHeight, config.pxWidth];
    }
    const activePreset = $derived(
        SIZE_PRESETS[device].find((p) => p.w === config.pxWidth && p.h === config.pxHeight)?.id ?? null
    );
    function clampSize(key) {
        const v = Math.round(Number(config[key]));
        config[key] = Number.isFinite(v) ? Math.min(8192, Math.max(200, v)) : D[key];
    }
    // The visitor's own screen in real (device) pixels.
    let screenSize = $state(null);
    $effect(() => {
        const r = window.devicePixelRatio || 1;
        screenSize = { w: Math.round(screen.width * r), h: Math.round(screen.height * r) };
    });
    function useScreen() {
        if (!screenSize) return;
        config.pxWidth = Math.min(8192, screenSize.w);
        config.pxHeight = Math.min(8192, screenSize.h);
        device = screenSize.w >= screenSize.h ? 'desktop' : 'phone';
    }
    const squarePx = $derived(Math.round(config.pxPerUnit * config.gridSpacing));
    const matSize = $derived(toMat(config));
    const zoomRange = $derived(config.unit === 'in' ? { min: 40, max: 500, step: 5, notches: [100, 150, 250] } : { min: 15, max: 200, step: 1, notches: [40, 60, 100] });

    // ── Colour ──
    function applyColor(key) {
        config.colorPreset = key;
        config.matColor = MAT_COLORS[key].mat;
        config.lineColor = MAT_COLORS[key].line;
    }
    // One "line strength" for both line sets, keeping their ratio.
    function setStrength(v) {
        const ratio = config.majorOpacity > 0 ? config.minorOpacity / config.majorOpacity : 0.53;
        config.majorOpacity = v;
        config.minorOpacity = Math.round(Math.min(1, v * ratio) * 100) / 100;
    }

    // ── Markings ──
    const gridSizes = $derived(config.unit === 'in' ? [0.5, 1, 2] : [0.5, 1, 2]);
    const subdivisions = $derived(config.unit === 'in'
        ? [{ v: 0, l: 'None' }, { v: 2, l: 'Halves' }, { v: 4, l: 'Quarters' }, { v: 8, l: 'Eighths' }]
        : [{ v: 0, l: 'None' }, { v: 2, l: 'Halves' }, { v: 5, l: '2 mm' }, { v: 10, l: 'mm' }]);
    const rulerOptions = $derived(config.unit === 'in'
        ? [{ v: 4, l: '1/4 in' }, { v: 8, l: '1/8 in' }, { v: 16, l: '1/16 in' }]
        : [{ v: 2, l: '5 mm' }, { v: 5, l: '2 mm' }, { v: 10, l: '1 mm' }]);
    const EDGES = ['top', 'right', 'bottom', 'left'];

    function newScratches() {
        config.seed = Math.floor(Math.random() * 99999) + 1;
    }
    function resetAll() {
        const keep = { pxWidth: config.pxWidth, pxHeight: config.pxHeight };
        const unit = config.unit;
        config = { ...structuredClone(DEFAULT_CONFIG), ...keep };
        if (unit === 'in') setUnit('in');
        look = 'classic';
    }

    // ── Watermark ──
    const POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
    const POS_NAMES = { t: 'Top', m: 'Middle', b: 'Bottom', l: 'left', c: 'centre', r: 'right' };
    const posName = (p) => p === 'mc' ? 'Centre' : `${POS_NAMES[p[0]]} ${POS_NAMES[p[1]]}`;
    const WM_COLORS = [
        { id: 'lines', label: 'Line colour' },
        { id: 'white', label: 'White' },
        { id: 'black', label: 'Black' },
        { id: 'custom', label: 'Custom' }
    ];

    // ── Export ──
    let format = $state('png');
    let exporting = $state(false);
    let copied = $state(false);
    let error = $state('');
    const filename = $derived(`cutting-mat-${config.pxWidth}x${config.pxHeight}-${config.colorPreset}`);

    function save(blob, ext) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filename}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }

    async function pngBlob() {
        const snap = $state.snapshot(config);
        const { w, h } = exportSize(snap);
        return svgToPngBlob(renderMat(toMat(snap), { id: 'cmx', pxWidth: w, pxHeight: h, tex: tex?.embed }), w, h);
    }

    async function download() {
        if (exporting) return;
        exporting = true;
        error = '';
        try {
            if (format === 'svg') {
                const snap = $state.snapshot(config);
                const file = renderMat(toMat(snap), { id: 'cmx', pxWidth: snap.pxWidth, pxHeight: snap.pxHeight, tex: tex?.embed });
                save(new Blob([file], { type: 'image/svg+xml' }), 'svg');
            } else {
                save(await pngBlob(), 'png');
            }
            window.umami?.track('tool-export', { tool: 'cutting-mat', format, action: 'download' });
        } catch (e) {
            console.error(e);
            error = 'Export failed. Try a smaller size.';
        } finally {
            exporting = false;
        }
    }

    async function copy() {
        if (exporting) return;
        exporting = true;
        error = '';
        try {
            const blob = await pngBlob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            copied = true;
            setTimeout(() => (copied = false), 2000);
            window.umami?.track('tool-export', { tool: 'cutting-mat', format: 'png', action: 'copy' });
        } catch (e) {
            console.error(e);
            error = 'Clipboard blocked by the browser. Use Download instead.';
        } finally {
            exporting = false;
        }
    }

    const px = (n) => n.toLocaleString('en-US');
</script>

<Seo
    title="Cutting Mat Texture Generator"
    description="Generate a flat self-healing cutting mat texture: grid, ruler edges, numbering, 30/45/60° guides, grain and wear. Export PNG or SVG for mockups and backgrounds."
    image="/og/cutting-mat.png"
/>

<PageHeader
    eyebrow="Free tool"
    title="Cutting Mat"
    hot="Generator"
    subtitle="A self-healing cutting mat wallpaper for your desktop, phone or tablet. Pick a look, pick your screen, download."
/>

<div class="editor reveal" style="--d: 3">
    <!-- ── Stage: the mat, as big as the screen allows ── -->
    <div class="stage" class:actual bind:clientWidth={stageW} bind:clientHeight={stageH} role="application" aria-label="Wallpaper preview"
        onpointerdown={dragStart} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={dragEnd}>
        <div class="mat" style={actual
            ? `width:${renderWin.w}px;height:${renderWin.h}px;transform:translate(${winPos.x}px, ${winPos.y}px)`
            : `width:${fit.w}px;height:${fit.h}px`}>
            {@html svg}
        </div>
        <span class="stage-tag">
            {#if actual}100% · drag to look around{:else}{px(config.pxWidth)} × {px(config.pxHeight)} px{/if}
        </span>
        <div class="stage-btns">
            <button type="button" class="stage-btn zoom" class:on={actual} onclick={toggleActual} onpointerdown={(e) => e.stopPropagation()}
                title={actual ? 'Fit to view' : 'View at 100%'} aria-pressed={actual}>
                {#if actual}<i class="fa-solid fa-compress"></i> Fit{:else}<i class="fa-solid fa-magnifying-glass-plus"></i> 100%{/if}
            </button>
            <button type="button" class="stage-btn" onclick={rotate} onpointerdown={(e) => e.stopPropagation()} title="Rotate" aria-label="Rotate the mat">
                <i class="fa-solid fa-rotate-right"></i>
            </button>
        </div>
    </div>

    <!-- ── Panel ── -->
    <aside class="panel">
        <div class="panel-scroll">
            <div class="block">
                <div class="block-head">
                    <h2>Start from a look</h2>
                    <button type="button" class="text-btn" onclick={resetAll}><i class="fa-solid fa-rotate-left"></i>Reset</button>
                </div>
                <div class="looks">
                    {#each LOOKS as l, i}
                        <button type="button" class="look" class:active={look === l.id} onclick={() => applyLook(l)} aria-pressed={look === l.id}>
                            <span class="look-img">{@html lookThumbs[i]}</span>
                            <span class="look-name">{l.label}</span>
                        </button>
                    {/each}
                </div>
            </div>

            <div class="tabs" role="tablist" aria-label="Settings">
                {#each TABS as t}
                    <button type="button" role="tab" class="tab" class:active={tab === t.id} aria-selected={tab === t.id} onclick={() => (tab = t.id)}>
                        <i class={t.icon}></i><span>{t.label}</span>
                    </button>
                {/each}
            </div>

            <div class="tab-body" role="tabpanel">
                {#if tab === 'size'}
                    <div class="seg wide devices" role="group" aria-label="Device">
                        {#each DEVICES as d}
                            <button type="button" class:active={device === d.id} onclick={() => (device = d.id)}>
                                <i class={d.icon}></i>{d.label}
                            </button>
                        {/each}
                    </div>
                    <div class="presets">
                        {#each SIZE_PRESETS[device] as p}
                            <button type="button" class="preset" class:active={activePreset === p.id} onclick={() => applyPreset(p)}>
                                <span class="preset-shape"><span style="aspect-ratio:{p.w} / {p.h};{p.w >= p.h ? 'width:100%' : 'height:100%'}"></span></span>
                                <span class="preset-text"><b>{p.label}</b><em>{p.w} × {p.h}</em></span>
                            </button>
                        {/each}
                    </div>
                    {#if screenSize}
                        <button type="button" class="wide-btn" onclick={useScreen}>
                            <i class="fa-solid fa-display"></i> Fit my screen <em>{screenSize.w} × {screenSize.h}</em>
                        </button>
                    {/if}
                    <div class="field">
                        <span class="lbl">Custom size</span>
                        <div class="size-row">
                            <label class="num">
                                <input type="number" step="1" bind:value={config.pxWidth} onblur={() => clampSize('pxWidth')} aria-label="Width in pixels" />
                                <em>px</em>
                            </label>
                            <button type="button" class="icon-btn" onclick={rotate} title="Swap width and height" aria-label="Swap width and height">
                                <i class="fa-solid fa-right-left"></i>
                            </button>
                            <label class="num">
                                <input type="number" step="1" bind:value={config.pxHeight} onblur={() => clampSize('pxHeight')} aria-label="Height in pixels" />
                                <em>px</em>
                            </label>
                        </div>
                    </div>
                    <div class="field">
                        <SnapSlider label="Zoom" unit="px/{uLabel}" bind:value={config.pxPerUnit}
                            min={zoomRange.min} max={zoomRange.max} step={zoomRange.step} notches={zoomRange.notches} snapDistance={zoomRange.step * 3}
                            baseline={ud.pxPerUnit} reset={() => (config.pxPerUnit = ud.pxPerUnit)} />
                        <p class="hint">Grid squares are {squarePx} px; the wallpaper shows {matSize.width.toFixed(1)} × {matSize.height.toFixed(1)} {uLabel} of mat.</p>
                    </div>
                    {@render moreToggle('size')}
                    {#if more.size}
                        <div class="more" transition:slide={{ duration: 180 }}>
                            <div class="row-between">
                                <span class="lbl">Ruler units</span>
                                <span class="seg">
                                    <button type="button" class:active={config.unit === 'cm'} onclick={() => setUnit('cm')}>cm</button>
                                    <button type="button" class:active={config.unit === 'in'} onclick={() => setUnit('in')}>inch</button>
                                </span>
                            </div>
                            <SnapSlider label="Border width" unit={uLabel} bind:value={config.margin}
                                min={0} max={config.unit === 'in' ? 2 : 5} step={config.unit === 'in' ? 0.125 : 0.25}
                                notches={config.unit === 'in' ? [0, 0.5, 1] : [0, 1, 1.5, 2, 3]} snapDistance={config.unit === 'in' ? 0.05 : 0.1}
                                baseline={ud.margin} reset={() => (config.margin = ud.margin)} />
                            <SnapSlider label="Corner radius" unit="mm" bind:value={config.cornerRadius}
                                min={0} max={30} step={0.5} notches={[0, 6, 12]} snapDistance={0.6}
                                baseline={D.cornerRadius} reset={() => (config.cornerRadius = D.cornerRadius)} />
                        </div>
                    {/if}

                {:else if tab === 'colour'}
                    <div class="swatches">
                        {#each Object.entries(MAT_COLORS) as [key, c]}
                            <button type="button" class="swatch" class:active={config.colorPreset === key} onclick={() => applyColor(key)}>
                                <span class="sw" style="background:{c.mat}">
                                    <span class="sw-grid" style="--ink:{c.line}"></span>
                                </span>
                                <span class="sw-name">{c.label}</span>
                            </button>
                        {/each}
                    </div>
                    <div class="pickers">
                        <label class="picker">
                            <input type="color" bind:value={config.matColor} oninput={() => (config.colorPreset = 'custom')} />
                            <span>Mat <em>{config.matColor}</em></span>
                        </label>
                        <label class="picker">
                            <input type="color" bind:value={config.lineColor} oninput={() => (config.colorPreset = 'custom')} />
                            <span>Lines <em>{config.lineColor}</em></span>
                        </label>
                    </div>
                    <SnapSlider label="Line strength" bind:value={() => config.majorOpacity, setStrength}
                        min={0.1} max={1} step={0.05} notches={[0.5, 0.85, 1]} snapDistance={0.03}
                        baseline={D.majorOpacity} reset={() => setStrength(D.majorOpacity)} />
                    {@render moreToggle('colour')}
                    {#if more.colour}
                        <div class="more" transition:slide={{ duration: 180 }}>
                            <SnapSlider label="Main lines" unit="α" bind:value={config.majorOpacity}
                                min={0} max={1} step={0.05} notches={[0.5, 0.85, 1]} snapDistance={0.03}
                                baseline={D.majorOpacity} reset={() => (config.majorOpacity = D.majorOpacity)} />
                            <SnapSlider label="Fine lines" unit="α" bind:value={config.minorOpacity}
                                min={0} max={1} step={0.05} notches={[0.45]} snapDistance={0.03}
                                baseline={D.minorOpacity} reset={() => (config.minorOpacity = D.minorOpacity)} />
                            <SnapSlider label="Main line weight" unit="mm" bind:value={config.majorWeight}
                                min={0.05} max={1.5} step={0.05} notches={[0.3]} snapDistance={0.03}
                                baseline={D.majorWeight} reset={() => (config.majorWeight = D.majorWeight)} />
                            <SnapSlider label="Fine line weight" unit="mm" bind:value={config.minorWeight}
                                min={0.05} max={1} step={0.05} notches={[0.2]} snapDistance={0.03}
                                baseline={D.minorWeight} reset={() => (config.minorWeight = D.minorWeight)} />
                            <SnapSlider label="Bold line weight" unit="mm" bind:value={config.accentWeight}
                                min={0.1} max={2} step={0.05} notches={[0.55]} snapDistance={0.03}
                                baseline={D.accentWeight} reset={() => (config.accentWeight = D.accentWeight)} />
                        </div>
                    {/if}

                {:else if tab === 'markings'}
                    <div class="field">
                        <span class="lbl">Grid squares</span>
                        <div class="seg wide">
                            {#each gridSizes as g}
                                <button type="button" class:active={config.gridSpacing === g} onclick={() => (config.gridSpacing = g)}>{g} {uLabel}</button>
                            {/each}
                        </div>
                    </div>
                    <div class="field">
                        <span class="lbl">Fine lines inside each square</span>
                        <div class="seg wide">
                            {#each subdivisions as s}
                                <button type="button" class:active={config.minorDivisions === s.v} onclick={() => (config.minorDivisions = s.v)}>{s.l}</button>
                            {/each}
                        </div>
                    </div>
                    <div class="field">
                        <span class="lbl">Numbers <small>click the edges</small></span>
                        <div class="edges">
                            <div class="edge-mat">
                                {#each EDGES as e}
                                    <button type="button" class="edge {e}" class:active={config.numberEdges[e]} aria-pressed={config.numberEdges[e]}
                                        aria-label="Numbers on the {e} edge" onclick={() => (config.numberEdges[e] = !config.numberEdges[e])}>
                                        <span>{e === 'top' || e === 'bottom' ? '1 2 3 4 5' : '1 2 3'}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    </div>
                    <div class="field">
                        <span class="lbl">Guides</span>
                        <div class="chips">
                            {#each [['a30', '30°'], ['a45', '45°'], ['a60', '60°']] as [k, l]}
                                <button type="button" class="chip" class:active={config.angles[k]} aria-pressed={config.angles[k]}
                                    onclick={() => (config.angles[k] = !config.angles[k])}>{l} lines</button>
                            {/each}
                            <button type="button" class="chip" class:active={config.circles} aria-pressed={config.circles} onclick={() => (config.circles = !config.circles)}>Circles</button>
                            <button type="button" class="chip" class:active={config.crosshair} aria-pressed={config.crosshair} onclick={() => (config.crosshair = !config.crosshair)}>Centre mark</button>
                        </div>
                    </div>
                    {@render moreToggle('markings')}
                    {#if more.markings}
                        <div class="more" transition:slide={{ duration: 180 }}>
                            <h3 class="sub">Grid</h3>
                            <SnapSlider label="Square size" unit={uLabel} bind:value={config.gridSpacing}
                                min={0.25} max={5} step={0.25} notches={[0.5, 1, 2, 5]} snapDistance={0.1}
                                baseline={ud.gridSpacing} reset={() => (config.gridSpacing = ud.gridSpacing)} />
                            <div class="row-between" class:off={config.minorDivisions < 2}>
                                <span class="lbl">Fine line style</span>
                                <span class="seg">
                                    {#each ['solid', 'dashed', 'dotted'] as s}
                                        <button type="button" class:active={config.minorStyle === s} onclick={() => (config.minorStyle = s)}>{s[0].toUpperCase() + s.slice(1)}</button>
                                    {/each}
                                </span>
                            </div>
                            <SnapSlider label="Bold line every" bind:value={config.accentEvery}
                                min={0} max={10} step={1} notches={[0, 5, 10]} snapDistance={0.4}
                                baseline={D.accentEvery} reset={() => (config.accentEvery = D.accentEvery)} />

                            <h3 class="sub">Rulers</h3>
                            <div class="row-between">
                                <span class="lbl">Ticks on</span>
                                <span class="chips tight">
                                    {#each EDGES as e}
                                        <button type="button" class="chip sm" class:active={config.tickEdges[e]} aria-pressed={config.tickEdges[e]}
                                            onclick={() => (config.tickEdges[e] = !config.tickEdges[e])}>{e[0].toUpperCase() + e.slice(1)}</button>
                                    {/each}
                                </span>
                            </div>
                            <div class="row-between">
                                <span class="lbl">Smallest tick</span>
                                <span class="seg">
                                    {#each rulerOptions as o}
                                        <button type="button" class:active={config.rulerDivisions === o.v} onclick={() => (config.rulerDivisions = o.v)}>{o.l}</button>
                                    {/each}
                                </span>
                            </div>
                            <div class="row-between">
                                <span class="lbl">Count from</span>
                                <span class="seg">
                                    <button type="button" class:active={config.origin === 'tl'} onclick={() => (config.origin = 'tl')}>Top</button>
                                    <button type="button" class:active={config.origin === 'bl'} onclick={() => (config.origin = 'bl')}>Bottom</button>
                                </span>
                            </div>
                            <SnapSlider label="Number size" unit="mm" bind:value={config.numberSize}
                                min={1} max={10} step={0.1} notches={[2, 3.2, 5]} snapDistance={0.15}
                                baseline={D.numberSize} reset={() => (config.numberSize = D.numberSize)} />
                            <SnapSlider label="Number every" unit={uLabel} bind:value={config.numberEvery}
                                min={1} max={10} step={1} notches={[1, 2, 5, 10]} snapDistance={0.4}
                                baseline={D.numberEvery} reset={() => (config.numberEvery = D.numberEvery)} />

                            <h3 class="sub">Guides</h3>
                            <div class="row-between">
                                <span class="lbl">Angle lines from</span>
                                <span class="seg">
                                    <button type="button" class:active={config.angleFrom === 'bl'} onclick={() => (config.angleFrom = 'bl')}>1 corner</button>
                                    <button type="button" class:active={config.angleFrom === 'bottom'} onclick={() => (config.angleFrom = 'bottom')}>2</button>
                                    <button type="button" class:active={config.angleFrom === 'all'} onclick={() => (config.angleFrom = 'all')}>4</button>
                                </span>
                            </div>
                            {@render toggle('Label the angles', config.angleLabels, () => (config.angleLabels = !config.angleLabels))}
                            {#if config.circles}
                                <SnapSlider label="Circles" bind:value={config.circleCount}
                                    min={1} max={12} step={1} notches={[1, 4, 8, 12]} snapDistance={0.4}
                                    baseline={D.circleCount} reset={() => (config.circleCount = D.circleCount)} />
                                <SnapSlider label="Circle spacing" unit={uLabel} bind:value={config.circleSpacing}
                                    min={0.5} max={10} step={0.5} notches={[1, 2, 5]} snapDistance={0.2}
                                    baseline={ud.circleSpacing} reset={() => (config.circleSpacing = ud.circleSpacing)} />
                            {/if}
                        </div>
                    {/if}

                {:else if tab === 'finish'}
                    <SnapSlider label="Wear" bind:value={config.wear}
                        min={0} max={1} step={0.05} notches={[0, 0.25, 1]} snapDistance={0.03}
                        baseline={D.wear} reset={() => (config.wear = D.wear)} />
                    <SnapSlider label="Grain" bind:value={config.grain}
                        min={0} max={1} step={0.05} notches={[0, 0.35, 1]} snapDistance={0.03}
                        baseline={D.grain} reset={() => (config.grain = D.grain)} />
                    <SnapSlider label="Surface texture" bind:value={config.texture}
                        min={0} max={1} step={0.05} notches={[0, 0.4, 1]} snapDistance={0.03}
                        baseline={D.texture} reset={() => (config.texture = D.texture)} />
                    <button type="button" class="wide-btn" onclick={newScratches} disabled={config.wear === 0 && config.grain === 0 && config.texture === 0}>
                        <i class="fa-solid fa-dice"></i> New scratches and grain
                    </button>
                    {@render toggle('Edge outline', config.edge, () => (config.edge = !config.edge))}
                    {@render moreToggle('finish')}
                    {#if more.finish}
                        <div class="more" transition:slide={{ duration: 180 }}>
                            <SnapSlider label="Vignette" bind:value={config.vignette}
                                min={0} max={1} step={0.05} notches={[0, 0.25, 1]} snapDistance={0.03}
                                baseline={D.vignette} reset={() => (config.vignette = D.vignette)} />
                            <div class="row-between">
                                <span class="lbl">Seed</span>
                                <input class="text seed" type="number" min="1" max="99999" step="1" bind:value={config.seed} aria-label="Seed" />
                            </div>
                        </div>
                    {/if}

                {:else if tab === 'watermark'}
                    <div class="row-between">
                        <span class="lbl">Show a watermark</span>
                        {@render switchBtn(config.brand, () => (config.brand = !config.brand), 'Show a watermark')}
                    </div>
                    {#if config.brand}
                        <div class="wm" transition:slide={{ duration: 180 }}>
                            <div class="seg wide">
                                <button type="button" class:active={config.brandMode === 'text'} onclick={() => (config.brandMode = 'text')}><i class="fa-solid fa-font"></i>Text</button>
                                <button type="button" class:active={config.brandMode === 'logo'} onclick={() => (config.brandMode = 'logo')}><i class="fa-solid fa-shapes"></i>DONCEZART logo</button>
                            </div>
                            {#if config.brandMode === 'text'}
                                <input class="text" type="text" bind:value={config.brandText} maxlength="40" placeholder="Your name or handle" aria-label="Watermark text" />
                            {/if}
                            <input class="text" type="text" bind:value={config.brandSub} maxlength="60" placeholder="Second line (optional)" aria-label="Watermark second line" />
                            <div class="field">
                                <span class="lbl">Position <small>{posName(config.brandPos)}</small></span>
                                <div class="pos-wrap">
                                    <div class="pos-grid" style="aspect-ratio:{config.pxWidth} / {config.pxHeight}">
                                        {#each POSITIONS as p}
                                            <button type="button" class="pos" class:active={config.brandPos === p} aria-label={posName(p)} title={posName(p)}
                                                onclick={() => (config.brandPos = p)}><span></span></button>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                            <SnapSlider label="Size" unit="%" bind:value={config.brandSize}
                                min={0.5} max={12} step={0.1} notches={[1.6, 4, 8]} snapDistance={0.15}
                                baseline={D.brandSize} reset={() => (config.brandSize = D.brandSize)} />
                            <SnapSlider label="Opacity" bind:value={config.brandOpacity}
                                min={0.05} max={1} step={0.05} notches={[0.3, 0.8, 1]} snapDistance={0.03}
                                baseline={D.brandOpacity} reset={() => (config.brandOpacity = D.brandOpacity)} />
                            {@render moreToggle('watermark')}
                            {#if more.watermark}
                                <div class="more" transition:slide={{ duration: 180 }}>
                                    <div class="field">
                                        <span class="lbl">Style</span>
                                        <div class="seg wide">
                                            {#each [['plain', 'Plain'], ['plate', 'On a plate'], ['outline', 'Outlined']] as [k, l]}
                                                <button type="button" class:active={config.brandStyle === k} onclick={() => (config.brandStyle = k)}>{l}</button>
                                            {/each}
                                        </div>
                                    </div>
                                    <div class="field">
                                        <span class="lbl">Colour</span>
                                        <div class="chips">
                                            {#each WM_COLORS as col}
                                                <button type="button" class="chip" class:active={config.brandColor === col.id} onclick={() => (config.brandColor = col.id)}>{col.label}</button>
                                            {/each}
                                            {#if config.brandColor === 'custom'}
                                                <input class="wm-color" type="color" bind:value={config.brandColorCustom} aria-label="Watermark colour" />
                                            {/if}
                                        </div>
                                    </div>
                                    {#if config.brandMode === 'text' || config.brandSub}
                                        <div class="field">
                                            <span class="lbl">Font</span>
                                            <div class="seg wide">
                                                <button type="button" class:active={config.brandFont === 'sans'} onclick={() => (config.brandFont = 'sans')} style="font-family:'Helvetica Neue',Arial,sans-serif;font-weight:700">Sans</button>
                                                <button type="button" class:active={config.brandFont === 'mono'} onclick={() => (config.brandFont = 'mono')} style="font-family:ui-monospace,Menlo,monospace">Mono</button>
                                                <button type="button" class:active={config.brandFont === 'serif'} onclick={() => (config.brandFont = 'serif')} style="font-family:Georgia,serif">Serif</button>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <p class="hint">Off: the wallpaper is just the mat.</p>
                    {/if}
                {/if}
            </div>
        </div>

        <!-- ── Export: always in reach ── -->
        <div class="export">
            <div class="export-top">
                <span class="seg">
                    <button type="button" class:active={format === 'png'} onclick={() => (format = 'png')}>PNG</button>
                    <button type="button" class:active={format === 'svg'} onclick={() => (format = 'svg')}>SVG</button>
                </span>
                <span class="export-hint">{px(out.w)} × {px(out.h)} px</span>
            </div>
            <div class="export-actions">
                <button class="btn btn-download" disabled={exporting} onclick={download}>
                    <i class="fa-solid fa-download"></i>
                    {exporting ? 'Rendering…' : `Download ${format.toUpperCase()}`}
                </button>
                <button class="btn btn-ghost btn-copy" disabled={exporting} onclick={copy} title="Copy PNG to clipboard" aria-label="Copy PNG to clipboard">
                    <i class="fa-solid {copied ? 'fa-check' : 'fa-clipboard'}"></i>
                </button>
            </div>
            {#if out.capped || format === 'svg'}
                <p class="export-meta">
                    {#if format === 'svg'}Vector: scales to any size without losing sharpness.{/if}
                    {#if format === 'png' && out.capped}<span class="warn">Reduced to {px(out.w)} × {px(out.h)} to fit the browser; use SVG for bigger.</span>{/if}
                </p>
            {/if}
            {#if error}<p class="export-error">{error}</p>{/if}
        </div>
    </aside>
</div>

{#snippet moreToggle(id)}
    <button type="button" class="more-btn" class:open={more[id]} aria-expanded={more[id]} onclick={() => (more[id] = !more[id])}>
        {more[id] ? 'Fewer options' : 'More options'}
        <i class="fa-solid fa-chevron-down"></i>
    </button>
{/snippet}

{#snippet switchBtn(on, fn, label)}
    <button type="button" class="switch" class:on role="switch" aria-checked={on} aria-label={label} onclick={fn}><span></span></button>
{/snippet}

{#snippet toggle(label, on, fn)}
    <div class="row-between">
        <span class="lbl">{label}</span>
        {@render switchBtn(on, fn, label)}
    </div>
{/snippet}

<style>
    .editor,
    .editor * { box-sizing: border-box; }

    /* ── One workspace: stage + panel, sized to the screen ── */
    .editor {
        --h: clamp(560px, calc(100vh - 7.5rem), 860px);
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
        display: grid;
        place-items: center;
        min-width: 0;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background:
            radial-gradient(110% 80% at 50% 115%, rgba(255, 43, 31, 0.16), transparent 60%),
            radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1.2px) 0 0 / 22px 22px,
            rgba(10, 10, 10, 0.6);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
    }
    .mat {
        filter: drop-shadow(0 24px 40px rgba(0, 0, 0, 0.65)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
        transition: width 0.25s ease, height 0.25s ease;
    }
    .mat :global(svg) { display: block; width: 100%; height: 100%; }
    .stage-tag {
        position: absolute;
        left: 1rem;
        bottom: 0.9rem;
        padding: 0.3rem 0.7rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.45);
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.75);
        font-variant-numeric: tabular-nums;
    }
    .stage.actual { cursor: grab; touch-action: none; }
    .stage.actual:active { cursor: grabbing; }
    .stage.actual .mat {
        position: absolute;
        left: 0;
        top: 0;
        filter: none;
        transition: none;
        will-change: transform;
    }
    .stage-btns {
        position: absolute;
        right: 0.9rem;
        bottom: 0.75rem;
        display: flex;
        gap: 0.4rem;
    }
    .stage-btn {
        min-width: 2.2rem;
        height: 2.2rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.45);
        color: #fff;
        cursor: pointer;
        transition: border-color 0.2s, color 0.2s;
    }
    .stage-btn:hover { border-color: rgba(255, 43, 31, 0.6); color: #ff2b1f; }
    .stage-btn.zoom {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0 0.8rem;
        font-family: var(--font-body);
        font-size: 0.75rem;
    }
    .stage-btn.zoom.on { border-color: rgba(255, 43, 31, 0.6); background: rgba(255, 43, 31, 0.18); }
    .stage-btn.zoom.on:hover { color: #fff; }

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
    .panel-scroll {
        flex: 1;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
    }

    .block { padding: 1.1rem 1.1rem 1rem; }
    .block-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
    }
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

    .looks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .look {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 0.35rem 0.35rem 0.45rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.02);
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s, color 0.2s;
    }
    .look:hover { border-color: rgba(255, 255, 255, 0.25); color: #fff; }
    .look.active { border-color: rgba(255, 43, 31, 0.6); background: rgba(255, 43, 31, 0.1); color: #fff; }
    .look-img { display: block; aspect-ratio: 3 / 2; }
    .look-img :global(svg) { display: block; width: 100%; height: 100%; }
    .look-name { font-family: var(--font-body); font-size: 0.75rem; text-align: center; }

    /* Tabs */
    .tabs {
        position: sticky;
        top: 0;
        z-index: 2;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(16, 16, 16, 0.92);
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
        font-size: 0.7rem;
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.2s;
    }
    .tab i { font-size: 0.9rem; }
    .tab:hover { color: #fff; }
    .tab.active { color: #fff; }
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

    .tab-body {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
        padding: 1.1rem;
    }
    .field { display: flex; flex-direction: column; gap: 0.5rem; }
    .lbl { font-family: var(--font-body); font-size: 0.85rem; color: rgba(255, 255, 255, 0.85); }
    .lbl small { margin-left: 0.4rem; font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); }
    .row-between { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
    .row-between.off { opacity: 0.4; pointer-events: none; }
    .sub {
        margin: 0.4rem 0 -0.2rem;
        font-family: var(--font-display);
        font-size: 0.68rem;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #ff2b1f;
    }

    /* Chips + segmented controls */
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chips.tight { gap: 0.3rem; justify-content: flex-end; }
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
    .chip.sm { padding: 0.3rem 0.55rem; font-size: 0.72rem; }
    .chip:hover { color: #fff; border-color: rgba(255, 255, 255, 0.3); }
    .chip.active { color: #fff; background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }

    .seg {
        display: inline-flex;
        padding: 0.2rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
    }
    .seg.wide { display: flex; }
    .seg.wide button { flex: 1; }
    .seg button {
        padding: 0.35rem 0.75rem;
        border: 1px solid transparent;
        border-radius: 999px;
        background: none;
        color: rgba(255, 255, 255, 0.6);
        font-family: var(--font-body);
        font-size: 0.78rem;
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.2s, background 0.2s, border-color 0.2s;
    }
    .seg button:hover { color: #fff; }
    .seg button.active { color: #fff; background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }

    /* Size */
    .size-row { display: flex; align-items: center; gap: 0.5rem; }
    .num {
        flex: 1;
        display: flex;
        align-items: center;
        min-width: 0;
        padding: 0 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
    }
    .num:focus-within { border-color: rgba(255, 255, 255, 0.45); }
    .num input {
        flex: 1;
        min-width: 0;
        padding: 0.6rem 0;
        border: 0;
        outline: 0;
        background: none;
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.95rem;
        font-variant-numeric: tabular-nums;
    }
    .num em { font-style: normal; font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); }
    .icon-btn {
        width: 2.2rem;
        height: 2.2rem;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
    }
    .icon-btn:hover { color: #fff; border-color: rgba(255, 43, 31, 0.6); }

    /* Colour */
    .swatches { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .swatch {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding: 0.4rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        background: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: border-color 0.2s, color 0.2s, background 0.2s;
    }
    .swatch:hover { border-color: rgba(255, 255, 255, 0.25); color: #fff; }
    .swatch.active { border-color: rgba(255, 43, 31, 0.6); background: rgba(255, 43, 31, 0.1); color: #fff; }
    .sw { position: relative; display: block; height: 2.6rem; border-radius: 6px; overflow: hidden; }
    .sw-grid {
        position: absolute;
        inset: 0;
        opacity: 0.55;
        background:
            linear-gradient(var(--ink) 1px, transparent 1px) 0 0 / 10px 10px,
            linear-gradient(90deg, var(--ink) 1px, transparent 1px) 0 0 / 10px 10px;
    }
    .sw-name { font-family: var(--font-body); font-size: 0.75rem; }
    .pickers { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .picker {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.4rem 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        cursor: pointer;
    }
    .picker input {
        width: 1.8rem;
        height: 1.8rem;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: none;
        cursor: pointer;
    }
    .picker input::-webkit-color-swatch-wrapper { padding: 0; }
    .picker input::-webkit-color-swatch { border: 0; border-radius: 5px; }
    .picker span { display: flex; flex-direction: column; font-size: 0.8rem; color: rgba(255, 255, 255, 0.85); }
    .picker em { font-style: normal; font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); font-family: 'JetBrains Mono', ui-monospace, monospace; }

    /* Numbers: a little mat whose edges you click */
    .edges { display: flex; justify-content: center; padding: 0.25rem 0; }
    .edge-mat {
        position: relative;
        width: 12rem;
        height: 7.5rem;
        border-radius: 6px;
        background:
            linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px) 0 0 / 12px 12px,
            linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px) 0 0 / 12px 12px,
            rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .edge {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px dashed rgba(255, 255, 255, 0.18);
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.35);
        color: rgba(255, 255, 255, 0.25);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.6rem;
        letter-spacing: 0.25em;
        cursor: pointer;
        transition: color 0.2s, background 0.2s, border-color 0.2s;
    }
    .edge.top { top: -0.7rem; left: 1.4rem; right: 1.4rem; height: 1.4rem; }
    .edge.bottom { bottom: -0.7rem; left: 1.4rem; right: 1.4rem; height: 1.4rem; }
    .edge.left { left: -0.7rem; top: 1.2rem; bottom: 1.2rem; width: 1.4rem; }
    .edge.right { right: -0.7rem; top: 1.2rem; bottom: 1.2rem; width: 1.4rem; }
    .edge.left span, .edge.right span { writing-mode: vertical-rl; }
    .edge:hover { color: rgba(255, 255, 255, 0.6); border-color: rgba(255, 255, 255, 0.4); }
    .edge.active { color: #fff; background: rgba(255, 43, 31, 0.22); border: 1px solid rgba(255, 43, 31, 0.65); }

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
        width: 100%;
        padding: 0.6rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        outline: 0;
        background: rgba(255, 255, 255, 0.04);
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.9rem;
    }
    .text:focus { border-color: rgba(255, 255, 255, 0.45); }
    .text.seed { width: 6.5rem; text-align: right; font-variant-numeric: tabular-nums; }

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
        cursor: pointer;
        transition: border-color 0.2s;
    }
    .wide-btn i { color: #ff2b1f; }
    .wide-btn:hover { border-color: rgba(255, 43, 31, 0.6); }
    .wide-btn:disabled { opacity: 0.4; cursor: default; }

    /* Size: devices + presets */
    .devices button { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; }
    .devices i { font-size: 0.75rem; }
    .presets { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
    .preset {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-width: 0;
        padding: 0.5rem 0.6rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
        color: rgba(255, 255, 255, 0.75);
        text-align: left;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s, color 0.2s;
    }
    .preset:hover { border-color: rgba(255, 255, 255, 0.25); color: #fff; }
    .preset.active { border-color: rgba(255, 43, 31, 0.6); background: rgba(255, 43, 31, 0.1); color: #fff; }
    .preset-shape { flex-shrink: 0; display: grid; place-items: center; width: 1.4rem; height: 1.4rem; }
    .preset-shape span { display: block; border: 1.5px solid currentColor; border-radius: 3px; opacity: 0.65; }
    .preset.active .preset-shape span { border-color: #ff2b1f; opacity: 1; }
    .preset-text { display: flex; flex-direction: column; min-width: 0; }
    .preset-text b { font-family: var(--font-body); font-size: 0.78rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .preset-text em { font-style: normal; font-size: 0.68rem; color: rgba(255, 255, 255, 0.45); font-variant-numeric: tabular-nums; }
    .wide-btn em { font-style: normal; color: rgba(255, 255, 255, 0.45); font-size: 0.75rem; }
    .hint { margin: 0; font-size: 0.75rem; line-height: 1.5; color: rgba(255, 255, 255, 0.45); }

    /* Watermark */
    .wm { display: flex; flex-direction: column; gap: 1.1rem; }
    .wm .seg button { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; }
    .wm .seg i { font-size: 0.72rem; }
    .pos-wrap { display: flex; justify-content: center; }
    .pos-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        width: 13rem;
        max-width: 100%;
        max-height: 13rem;
        padding: 0.35rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 6px;
        background:
            linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px) 0 0 / 10px 10px,
            linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px) 0 0 / 10px 10px,
            rgba(255, 255, 255, 0.03);
    }
    .pos { display: grid; place-items: center; min-height: 1.4rem; border: 0; background: none; cursor: pointer; }
    .pos-grid .pos:nth-child(3n + 1) { justify-items: start; }
    .pos-grid .pos:nth-child(3n) { justify-items: end; }
    .pos span {
        width: 1.1rem;
        height: 0.5rem;
        border-radius: 2px;
        border: 1px dashed rgba(255, 255, 255, 0.3);
        transition: background 0.15s, border-color 0.15s, width 0.15s;
    }
    .pos:hover span { border-color: rgba(255, 255, 255, 0.7); }
    .pos.active span { width: 1.6rem; border: 1px solid rgba(255, 43, 31, 0.9); background: rgba(255, 43, 31, 0.45); }
    .wm-color { width: 2rem; height: 2rem; padding: 0; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 999px; background: none; cursor: pointer; }
    .wm-color::-webkit-color-swatch-wrapper { padding: 0; }
    .wm-color::-webkit-color-swatch { border: 0; border-radius: 999px; }

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
    .export-hint { font-size: 0.78rem; color: rgba(255, 255, 255, 0.5); }
    .export-actions { display: flex; gap: 0.5rem; }
    .btn-download { flex: 1; }
    .btn-copy { width: 3.1rem; padding-inline: 0; }
    .export-actions .btn:disabled { opacity: 0.6; cursor: progress; }
    .export-meta {
        margin: 0;
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.45);
        font-variant-numeric: tabular-nums;
    }
    .warn { color: #ffb36b; }
    .export-error { margin: 0; font-size: 0.78rem; color: #ff6b5f; }

    /* ── Narrow screens: mat on top, panel below, page scrolls normally ── */
    @media (max-width: 960px) {
        .editor { grid-template-columns: minmax(0, 1fr); }
        .stage { position: relative; top: 0; height: min(68vw, 520px); }
        .panel { position: relative; top: 0; height: auto; overflow: visible; }
        .panel-scroll { overflow: visible; }
        .export {
            position: sticky;
            bottom: 0;
            border-radius: 0 0 12px 12px;
            background: #0b0b0b;
        }
        .tabs { top: 4.4rem; background: #0e0e0e; }
    }
</style>
