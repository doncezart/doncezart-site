<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';

    $effect(() => { window.umami?.track('page-view', { page: 'tools-safe-zone' }); });

    const REF_W = 1280;
    const REF_H = 720;

    // Placement sizes shown in the "squint test" row (width × height @ native ratio).
    const PREVIEWS = [
        { label: 'Search results', w: 640, h: 360 },
        { label: 'Homepage feed', w: 336, h: 189 },
        { label: 'Recommended sidebar', w: 168, h: 94 }
    ];

    // ── State ──
    let imgEl = $state(null); // decoded HTMLImageElement
    let fileName = $state('');
    let dragOver = $state(false);
    let fileInput = $state(null);
    let error = $state('');

    const overlays = $state({
        duration: true,
        live: false,
        progress: true,
        hoverIcons: true,
        scrim: true,
        safeZone: true
    });

    let mainCanvas = $state(null);
    let previewCanvases = $state(new Array(PREVIEWS.length).fill(null));

    function loadFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            error = 'Choose an image file (PNG, JPG, WebP).';
            return;
        }
        error = '';
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            imgEl = img;
            fileName = file.name;
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            error = 'Could not decode that image.';
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    function handleDrop(e) {
        dragOver = false;
        loadFile(e.dataTransfer?.files?.[0]);
    }

    // ── Drawing ──
    // All overlay metrics are defined in 1280×720 reference space (YouTube thumbnail
    // standard); every surface scales them by W/1280 so mini-previews stay faithful.
    const METRICS = {
        badge: { w: 88, h: 36, font: 26, radius: 8, right: 16, bottom: 16 },
        live: { w: 96, h: 36, font: 24, radius: 8, right: 16, bottom: 16 },
        progress: { h: 5 },
        hover: { size: 44, top: 14, right: 14, gap: 12 },
        scrimH: 230,
        safeInsetX: 128, // 10%
        safeInsetY: 72 // 10%
    };

    function drawImageCovered(ctx, W, H) {
        const img = imgEl;
        const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawOverlays(ctx, W, H) {
        const s = W / REF_W;
        ctx.save();
        ctx.scale(s, s);

        // Bottom scrim (title/channel overlay zone)
        if (overlays.scrim) {
            const g = ctx.createLinearGradient(0, REF_H - METRICS.scrimH, 0, REF_H);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, 'rgba(0,0,0,0.55)');
            ctx.fillStyle = g;
            ctx.fillRect(0, REF_H - METRICS.scrimH, REF_W, METRICS.scrimH);
        }

        // Progress bar (red, bottom edge)
        if (overlays.progress) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, REF_H - METRICS.progress.h, REF_W, METRICS.progress.h);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(0, REF_H - METRICS.progress.h - 3, REF_W, 3);
        }

        // Hover icons: watch later + check (top-right)
        if (overlays.hoverIcons) {
            const { size, top, right, gap } = METRICS.hover;
            const x2 = REF_W - right - size;
            const x1 = x2 - size - gap;
            const y = top;
            for (const x of [x1, x2]) {
                ctx.beginPath();
                ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            // watch-later hands
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            const c1x = x1 + size / 2, c1y = y + size / 2;
            ctx.beginPath();
            ctx.moveTo(c1x, c1y);
            ctx.lineTo(c1x, c1y - size * 0.22);
            ctx.moveTo(c1x, c1y);
            ctx.lineTo(c1x + size * 0.22, c1y);
            ctx.stroke();
            // check mark
            const c2x = x2 + size / 2, c2y = y + size / 2;
            ctx.beginPath();
            ctx.moveTo(c2x - size * 0.2, c2y);
            ctx.lineTo(c2x - size * 0.05, c2y + size * 0.2);
            ctx.lineTo(c2x + size * 0.22, c2y - size * 0.2);
            ctx.stroke();
        }

        // Duration badge (bottom-right)
        if (overlays.duration && !overlays.live) {
            const b = METRICS.badge;
            const x = REF_W - b.right - b.w;
            const y = REF_H - b.bottom - b.h;
            roundRect(ctx, x, y, b.w, b.h, b.radius);
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `600 ${b.font}px Roboto, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('12:34', x + b.w / 2, y + b.h / 2 + 1);
        }

        // LIVE badge (bottom-right, red pill)
        if (overlays.live) {
            const b = METRICS.live;
            const x = REF_W - b.right - b.w;
            const y = REF_H - b.bottom - b.h;
            roundRect(ctx, x, y, b.w, b.h, b.radius);
            ctx.fillStyle = '#ff0000';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `700 ${b.font}px Roboto, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LIVE', x + b.w / 2, y + b.h / 2 + 1);
        }

        // Safe zone (dashed, center 80%) + keep-clear label
        if (overlays.safeZone) {
            const { safeInsetX, safeInsetY } = METRICS;
            ctx.setLineDash([18, 14]);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#22c55e';
            ctx.strokeRect(safeInsetX, safeInsetY, REF_W - safeInsetX * 2, REF_H - safeInsetY * 2);
            ctx.setLineDash([]);
            // label
            ctx.font = `700 22px Roboto, Arial, sans-serif`;
            const label = 'SAFE ZONE';
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(safeInsetX, safeInsetY - 34, tw + 24, 34);
            ctx.fillStyle = '#22c55e';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, safeInsetX + 12, safeInsetY - 17 + 1);
            // keep-clear marker on the badge corner
            ctx.font = `600 18px Roboto, Arial, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.textAlign = 'right';
            ctx.fillText('duration badge lives here', REF_W - 16, REF_H - 52);
        }

        ctx.restore();
    }

    // Redraw main canvas + placement previews whenever input or toggles change
    $effect(() => {
        const canvas = mainCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, REF_W, REF_H);
        if (imgEl) {
            drawImageCovered(ctx, REF_W, REF_H);
            drawOverlays(ctx, REF_W, REF_H);
        }
        for (let i = 0; i < PREVIEWS.length; i++) {
            const c = previewCanvases[i];
            if (!c || !imgEl) continue;
            const { w, h } = PREVIEWS[i];
            const pctx = c.getContext('2d');
            pctx.clearRect(0, 0, w, h);
            drawImageCovered(pctx, w, h);
            drawOverlays(pctx, w, h);
        }
        return () => {};
    });

    function exportAnnotated() {
        const canvas = mainCanvas;
        if (!canvas || !imgEl) return;
        canvas.toBlob((blob) => {
            if (!blob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `yt-safe-zone-${fileName.replace(/\.[^.]+$/, '') || 'thumbnail'}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
            window.umami?.track('tool-export', { tool: 'safe-zone' });
        }, 'image/png');
    }

    const toggleList = [
        { key: 'duration', label: 'Duration badge (bottom-right)' },
        { key: 'live', label: 'LIVE badge' },
        { key: 'progress', label: 'Progress bar (bottom edge)' },
        { key: 'hoverIcons', label: 'Hover icons (top-right)' },
        { key: 'scrim', label: 'Title/channel scrim (bottom)' },
        { key: 'safeZone', label: 'Safe zone grid' }
    ];
</script>

<svelte:head>
    <title>Thumbnail Safe-Zone Checker — DONCEZART Tools</title>
    <meta name="description" content="Upload your 1280×720 YouTube thumbnail and see exactly which parts YouTube's UI covers — duration badge, progress bar, hover icons, scrim — at every placement size." />
</svelte:head>

<PageHeader
    title="Thumbnail Safe-Zone Checker"
    subtitle="Upload a 1280×720 thumbnail and see exactly what YouTube's UI will cover — duration badge, progress bar, hover icons, scrim — plus the squint test at every placement size."
/>

<div class="dropzone" class:active={dragOver}
    ondragover={(e) => { e.preventDefault(); dragOver = true; }}
    ondragleave={() => (dragOver = false)}
    ondrop={(e) => { e.preventDefault(); handleDrop(e); }}
    onclick={() => fileInput?.click()}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
>
    <input
        bind:this={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onchange={(e) => loadFile(e.currentTarget.files?.[0])}
    />
    {#if imgEl}
        <div class="drop-loaded">
            <i class="fa-solid fa-check"></i>
            <span><strong>{fileName}</strong> — click to replace</span>
            <span class="drop-dims">{imgEl.naturalWidth}×{imgEl.naturalHeight}px
                {#if imgEl.naturalWidth !== 1280 || imgEl.naturalHeight !== 720}
                    · will be cover-cropped to 1280×720
                {/if}
            </span>
        </div>
    {:else}
        <div class="drop-empty">
            <i class="fa-solid fa-upload"></i>
            <span>Drop a thumbnail here or click to browse</span>
            <span class="drop-hint">1280×720 recommended · processed locally, never uploaded</span>
        </div>
    {/if}
</div>

{#if error}
    <p class="error-msg">{error}</p>
{/if}

{#if imgEl}
    <div class="workspace">
        <div class="stage">
            <canvas
                bind:this={mainCanvas}
                width={REF_W}
                height={REF_H}
                class="main-canvas"
            ></canvas>
            <div class="stage-actions">
                <button class="btn-download" onclick={exportAnnotated}>
                    <i class="fa-solid fa-download"></i> Download annotated PNG
                </button>
            </div>
        </div>

        <aside class="controls">
            <section class="ctrl-group">
                <h3>Overlays</h3>
                <div class="toggle-list">
                    {#each toggleList as t}
                        <label class="toggle" title={t.label}>
                            <input type="checkbox" bind:checked={overlays[t.key]} />
                            <span>{t.label}</span>
                        </label>
                    {/each}
                </div>
                <p class="ctrl-note">Overlays are drawn at YouTube's real proportions (reference: 1280×720) and scale into every preview below.</p>
            </section>

            <section class="ctrl-group">
                <h3>Squint test — how it actually looks</h3>
                <p class="ctrl-note">YouTube renders thumbnails far below your export size. If your text or face can't be read here, it will fail in the feed.</p>
                <div class="preview-row">
                    {#each PREVIEWS as p, i}
                        <div class="preview-item">
                            <canvas
                                bind:this={previewCanvases[i]}
                                width={p.w}
                                height={p.h}
                                class="mini-canvas"
                            ></canvas>
                            <span class="preview-label">{p.label} · {p.w}px</span>
                        </div>
                    {/each}
                </div>
            </section>
        </aside>
    </div>
{/if}

<style>
    .dropzone {
        max-width: 900px;
        margin: 0 auto var(--space-xl);
        border: var(--border);
        border-style: dashed;
        padding: var(--space-2xl);
        text-align: center;
        cursor: pointer;
        transition: border-color var(--transition-base), background var(--transition-base);
        font-family: var(--font-body);
    }
    .dropzone:hover,
    .dropzone.active {
        border-color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.03);
    }

    .drop-empty,
    .drop-loaded {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        align-items: center;
        color: var(--color-text-secondary);
        font-size: var(--text-base);
    }
    .drop-empty i,
    .drop-loaded i {
        font-size: var(--text-2xl);
        color: var(--color-text-primary);
        margin-bottom: var(--space-xs);
    }
    .drop-loaded strong {
        color: var(--color-text-primary);
        font-weight: 500;
    }
    .drop-hint,
    .drop-dims {
        font-size: var(--text-xs);
        opacity: 0.7;
    }

    .error-msg {
        text-align: center;
        color: var(--color-accent);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        padding: var(--space-sm) var(--container-pad) 0;
    }

    .workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: var(--space-xl);
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--container-pad) var(--space-4xl);
        align-items: start;
    }

    .stage {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }
    .main-canvas {
        width: 100%;
        height: auto;
        border: var(--border);
        background: #0a0a0a;
        display: block;
    }

    .stage-actions {
        display: flex;
        gap: var(--space-md);
    }
    .btn-download {
        background: var(--color-text-primary);
        border: 0;
        color: #000;
        font-family: var(--font-body);
        font-weight: 600;
        font-size: var(--text-sm);
        padding: 0.6rem 1.2rem;
        cursor: pointer;
        transition: opacity var(--transition-fast);
    }
    .btn-download:hover {
        opacity: 0.85;
    }

    .controls {
        position: sticky;
        top: calc(var(--nav-height) + 1rem);
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        max-height: calc(100vh - var(--nav-height) - 2rem);
        overflow-y: auto;
        padding-right: var(--space-sm);
    }

    .ctrl-group {
        border: var(--border);
        padding: var(--space-lg);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }
    .ctrl-group h3 {
        font-family: var(--font-display);
        font-size: var(--text-sm);
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-text-primary);
    }

    .toggle-list {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
    .toggle {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
    }
    .toggle input {
        accent-color: var(--color-text-primary);
        width: 1rem;
        height: 1rem;
        cursor: pointer;
    }
    .toggle:hover {
        color: var(--color-text-primary);
    }

    .ctrl-note {
        font-size: var(--text-xs);
        line-height: 1.5;
        color: var(--color-text-secondary);
        opacity: 0.75;
    }

    .preview-row {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }
    .preview-item {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
    .mini-canvas {
        width: 100%;
        height: auto;
        border: var(--border);
        background: #0a0a0a;
        display: block;
    }
    .preview-label {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        opacity: 0.8;
    }

    @media (max-width: 1000px) {
        .workspace {
            grid-template-columns: 1fr;
        }
        .controls {
            position: static;
            max-height: none;
        }
    }
</style>