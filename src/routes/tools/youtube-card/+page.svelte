<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import SnapSlider from '$lib/components/ui/SnapSlider.svelte';
    import YouTubeCard from '$lib/components/tools/YouTubeCard.svelte';
    import ExportBar from '$lib/components/tools/controls/ExportBar.svelte';
    import {
        DEFAULT_CONFIG, LAYOUTS, FONTS, PALETTES, PALETTE_NAMES, ASPECTS
    } from '$lib/components/tools/yt-config.js';

    $effect(() => { window.umami?.track('page-view', { page: 'tools-youtube-card' }); });

    let url = $state('');
    let loading = $state(false);
    let error = $state('');
    let video = $state(null);
    let config = $state(structuredClone(DEFAULT_CONFIG));
    let cardEl = $state(null);

    // Per-layout defaults are applied on layout switch until the user tunes a value.
    const touched = $state({ padding: false, thumbGap: false, columnGap: false, textGap: false });

    // ── Preview: the card always renders at ONE fixed on-screen size. Container
// size is an export-only setting, so the display scale counter-acts the export
// zoom (×1280/C) — changing it never re-squishes or re-sizes the preview. ──
const PREVIEW_SCALE = 0.4;
    const previewScale = $derived(PREVIEW_SCALE * 1280 / (config.containerSize ?? 1280));
    let paneEl = $state(null);
    let cardHeight = $state(0);
    let cardWidth = $state(0);

    $effect(() => {
        const pane = paneEl;
        if (!pane) return;
        const update = () => {
            if (cardEl) {
                cardWidth = cardEl.offsetWidth;
                cardHeight = cardEl.offsetHeight;
            }
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(pane);
        if (cardEl) ro.observe(cardEl);
        return () => ro.disconnect();
    });

    const SAMPLES = [
        { label: 'Never Gonna Give You Up', url: 'https://youtu.be/dQw4w9WgXcQ' },
        { label: 'Lofi Girl — lofi hip hop radio', url: 'https://youtu.be/jfKfPfyJRdk' },
        { label: 'Big Buck Bunny', url: 'https://youtu.be/aqz-KE-bpKQ' }
    ];

    const layoutKeys = Object.keys(LAYOUTS);

    async function fetchVideo(targetUrl = url) {
        const target = targetUrl.trim();
        if (!target) {
            error = 'Paste a YouTube link first.';
            return;
        }
        loading = true;
        error = '';
        try {
            const r = await fetch(`/api/youtube/info?url=${encodeURIComponent(target)}`);
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Something went wrong.');
            video = j;
            window.umami?.track('tool-generate', { tool: 'youtube-card' });
        } catch (e) {
            error = e.message || 'Could not load that video. Try again in a moment.';
        } finally {
            loading = false;
        }
    }

    function useSample(sample) {
        url = sample.url;
        fetchVideo(sample.url);
    }

    function setLayout(key) {
        config.layout = key;
        const d = LAYOUTS[key].defaults;
        if (!touched.padding) config.padding = LAYOUTS[key].defaultPadding ?? 0;
        if (!touched.thumbGap) config.thumbGap = d.thumb;
        if (!touched.columnGap) config.columnGap = d.column;
        if (!touched.textGap) config.textGap = d.text;
    }

    const modulesList = [
        { key: 'duration', label: 'Duration' },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
        { key: 'channel', label: 'Channel' },
        { key: 'avatar', label: 'Avatar' },
        { key: 'views', label: 'Views' },
        { key: 'subscribers', label: 'Subscribers' },
        { key: 'date', label: 'Date' },
        { key: 'verified', label: 'Verified' },
        { key: 'live', label: 'Live' }
    ];

    function toggleModule(key) {
        config.modules[key] = !config.modules[key];
    }

    const ratioActive = $derived(config.layout === 'split');
    const thumbGapActive = $derived(['classic', 'stacked', 'compact'].includes(config.layout));
    const columnGapActive = $derived(config.layout === 'split');
    const scrimActive = $derived(config.layout === 'hero' || config.layout === 'underlay');

    const accentColor = $derived(
        config.palette === 'custom' ? config.colors.accent : PALETTES[config.palette].accent
    );

    const VERIFIED = [
        { key: 'gray', label: 'YouTube gray', bg: '#a3a3a3' },
        { key: 'white', label: 'White', bg: '#ffffff' },
        { key: 'accent', label: 'Accent', bg: null }, // resolved live
        { key: 'custom', label: 'Custom', bg: null }
    ];

    // ── Preview background picker (behind the card in the pane) ──
    let bgMenuOpen = $state(false);
    let previewBg = $state({ type: 'pattern', value: null });
    let previewBgColor = $state('#2a2a2a');
    const bgPaletteColors = $derived(
        Object.keys(PALETTES).map((k) => ({ key: k, name: PALETTE_NAMES[k], bg: PALETTES[k].bg }))
    );
    const paneBgStyle = $derived(
        previewBg.type === 'color'
            ? `background:${previewBg.value};`
            : previewBg.type === 'image'
                ? `background-image:url('${previewBg.value}');background-size:cover;background-position:center;`
                : ''
    );
    function setPreviewBg(type, value = null) {
        previewBg = { type, value };
        bgMenuOpen = false;
    }
    function onBgImage(e) {
        const f = e.currentTarget.files?.[0];
        if (!f) return;
        if (previewBg.type === 'image' && previewBg.value) URL.revokeObjectURL(previewBg.value);
        previewBg = { type: 'image', value: URL.createObjectURL(f) };
        bgMenuOpen = false;
    }

    // Smooth-scroll the tool containers into view once a video loads.
    let bodyEl = $state(null);
    $effect(() => {
        if (!video) return;
        const t = setTimeout(() => {
            bodyEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
        return () => clearTimeout(t);
    });

    // ── API fallback disclaimer ──
    const showApiNote = $derived(
        !!video && (video.source === 'oembed' || !video.duration || !video.channel?.avatarUrl || video.views == null)
    );
    let apiNoteDismissed = $state(false);
    $effect(() => {
        if (showApiNote && !apiNoteDismissed) {
            window.umami?.track('tool-api-fallback', { tool: 'youtube-card' });
        }
    });
    function dismissApiNote() {
        apiNoteDismissed = true;
        try { sessionStorage.setItem('ytc-api-note-dismissed', '1'); } catch { /* private mode */ }
    }
    $effect(() => {
        try {
            if (sessionStorage.getItem('ytc-api-note-dismissed')) apiNoteDismissed = true;
        } catch { /* private mode */ }
    });

    const exportWidth = $derived(
        (config.containerSize ?? 1280) + 2 * Math.round((config.padding ?? 0) * (config.containerSize ?? 1280) / 1280)
    );

    // Shadow behind the preview follows the card's rounded corners (scaled).
    const previewShadowRadius = $derived(
        Math.round((config.containerRadius ?? 0) * (config.containerSize ?? 1280) / 1280)
    );

    // Notch patterns for the sliders (snap points; free values still reachable).
    const GAP_NOTCHES = [0, 16, 32, 48, 64, 80];
</script>

<svelte:head>
    <title>YouTube Card Generator — DONCEZART Tools</title>
    <meta name="description" content="Turn any YouTube video into a clean, customizable reference card — layouts, palettes, fonts, full-res export. Free, no signup." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600&family=Archivo:wght@400;500;700&family=Anton&family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,900&family=JetBrains+Mono:wght@400;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<PageHeader
    title="YouTube Card Generator"
    subtitle="Paste a video link and get a pixel-perfect reference card — layouts inspired by YouTube's own UI, full-res export, zero signup."
/>

<form class="input-row" onsubmit={(e) => { e.preventDefault(); fetchVideo(); }}>
    <input
        type="text"
        bind:value={url}
        placeholder="https://www.youtube.com/watch?v=…"
        class="url-input"
        aria-label="YouTube video URL"
        autocomplete="off"
        spellcheck="false"
    />
    <button class="gen-btn" type="submit" disabled={loading}>
        {loading ? 'Fetching…' : 'Generate card'}
    </button>
</form>

<div class="samples">
    <span class="samples-label">Try:</span>
    {#each SAMPLES as s}
        <button class="sample-chip" onclick={() => useSample(s)}>{s.label}</button>
    {/each}
</div>

{#if error}
    <p class="error-msg">{error}</p>
{/if}

{#if video}
    <div class="page-body" id="tools-body" bind:this={bodyEl}>

        <!-- ── Row 1: Layout (buttons only) | Style ── -->
        <div class="top-band">
            <section class="top-col">
                <h2 class="band-title">Layout</h2>
                <div class="layout-grid">
                    {#each layoutKeys as key}
                        <button
                            class="layout-btn"
                            class:active={config.layout === key}
                            onclick={() => setLayout(key)}
                        >
                            <span class="layout-name">{LAYOUTS[key].label}</span>
                            <span class="layout-hint">{LAYOUTS[key].hint}</span>
                        </button>
                    {/each}
                </div>
            </section>

            <section class="top-col">
                <h2 class="band-title">Style</h2>
                <div class="style-rows">
                    <div class="style-row">
                        {#each Object.keys(PALETTES) as key}
                            <button
                                class="palette-btn"
                                class:active={config.palette === key}
                                onclick={() => (config.palette = key)}
                                title={PALETTE_NAMES[key]}
                            >
                                <span class="plt" style="background:{PALETTES[key].bg};color:{PALETTES[key].text};border-color:{PALETTES[key].text}">
                                    <span class="plt-dot" style="background:{PALETTES[key].accent}"></span>
                                </span>
                                <span class="palette-name">{PALETTE_NAMES[key]}</span>
                            </button>
                        {/each}
                        <button
                            class="palette-btn"
                            class:active={config.palette === 'custom'}
                            onclick={() => (config.palette = 'custom')}
                        >
                            <span class="plt plt-custom">
                                <i class="fa-solid fa-palette"></i>
                            </span>
                            <span class="palette-name">Custom</span>
                        </button>

                        {#if config.palette === 'custom'}
                            <span class="color-inline">
                                <input type="color" bind:value={config.colors.bg} title="Background" aria-label="Background color" />
                                <input type="color" bind:value={config.colors.text} title="Text" aria-label="Text color" />
                                <input type="color" bind:value={config.colors.secondary} title="Secondary" aria-label="Secondary color" />
                                <input type="color" bind:value={config.colors.accent} title="Accent" aria-label="Accent color" />
                            </span>
                        {/if}

                        <span class="ver-swatches">
                            <span class="ver-label">Verified badge</span>
                            {#each VERIFIED as v}
                                <button
                                    type="button"
                                    class="ver-swatch"
                                    class:active={config.verifiedColor === v.key}
                                    data-v={v.key}
                                    title={v.label}
                                    aria-label={v.label}
                                    style={v.bg ? `background:${v.bg}` : ''}
                                    onclick={() => (config.verifiedColor = v.key)}
                                >
                                    {#if v.key === 'accent'}
                                        <span class="ver-dot" style="background:{accentColor}"></span>
                                    {:else if v.key === 'custom'}
                                        <i class="fa-solid fa-palette"></i>
                                    {:else}
                                        <i class="fa-solid fa-check"></i>
                                    {/if}
                                </button>
                            {/each}
                            {#if config.verifiedColor === 'custom'}
                                <input type="color" bind:value={config.verifiedColorCustom} aria-label="Custom verified color" class="ver-custom-input" />
                            {/if}
                        </span>
                    </div>
                    <div class="style-row">
                        <label class="inline-field">
                            <span class="font-wrap">
                                <span class="font-tag">Font</span>
                                <select bind:value={config.font} class="font-select">
                                    {#each FONTS as f}
                                        <option value={f} style="font-family:'{f}'">{f}</option>
                                    {/each}
                                </select>
                            </span>
                        </label>
                    </div>
                </div>
            </section>
        </div>

        <!-- ── Row 2: Preview | all sliders (same height as preview) ── -->
        <div class="workspace">
            <div class="preview-col">
                {#if showApiNote && !apiNoteDismissed}
                    <div class="api-note" role="status">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div class="api-note-body">
                            <strong>Some video data couldn't be fetched</strong>
                            <p>Duration, views, subscribers, description and creator details come from the YouTube API — it appears to be down, throttled, or unreachable right now. The card generator still works fully: layouts, colors, fonts and export all function, and the thumbnail and title are loaded directly.</p>
                            {#if video.dataError}
                                <p class="api-note-err">
                                    API · {video.dataError.status || 'network'} — {video.dataError.message}
                                </p>
                            {/if}
                            <p class="api-note-links">
                                <a href="/contact">Report the issue</a>
                                <span class="api-sep">·</span>
                                <a href="https://discord.gg/aJUAyFVyqM" target="_blank" rel="noopener noreferrer">Ask on Discord</a>
                            </p>
                        </div>
                        <button class="api-dismiss" onclick={dismissApiNote} aria-label="Dismiss notice">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                {/if}

                <div class="preview-pane" bind:this={paneEl} style="height:{Math.min(480, Math.max(320, cardHeight * previewScale + 56))}px;{paneBgStyle}">
                    <button
                        type="button"
                        class="preview-bg-btn"
                        aria-label="Preview background"
                        aria-expanded={bgMenuOpen}
                        title="Preview background"
                        onclick={() => (bgMenuOpen = !bgMenuOpen)}
                    >
                        <i class="fa-solid fa-palette"></i>
                    </button>

                    {#if bgMenuOpen}
                        <div class="preview-bg-menu">
                            <div class="bg-sec">
                                <span class="bg-sec-label">Pattern</span>
                                <button
                                    type="button"
                                    class="bg-opt"
                                    class:active={previewBg.type === 'pattern'}
                                    onclick={() => setPreviewBg('pattern')}
                                >
                                    <span class="bg-chip bg-chip-checker"></span>
                                    Checkerboard
                                </button>
                            </div>
                            <div class="bg-sec">
                                <span class="bg-sec-label">Palette colors</span>
                                {#each bgPaletteColors as c}
                                    <button
                                        type="button"
                                        class="bg-opt"
                                        class:active={previewBg.type === 'color' && previewBg.value === c.bg}
                                        onclick={() => setPreviewBg('color', c.bg)}
                                    >
                                        <span class="bg-chip" style="background:{c.bg}"></span>
                                        {c.name}
                                    </button>
                                {/each}
                            </div>
                            <div class="bg-sec">
                                <span class="bg-sec-label">Custom</span>
                                <label class="bg-opt">
                                    <span class="bg-chip" style="background:{previewBgColor}"></span>
                                    Custom color
                                    <input
                                        type="color"
                                        class="bg-color-input"
                                        bind:value={previewBgColor}
                                        oninput={() => setPreviewBg('color', previewBgColor)}
                                    />
                                </label>
                                <label class="bg-opt">
                                    <span class="bg-chip bg-chip-img"><i class="fa-solid fa-image"></i></span>
                                    Custom image
                                    <input type="file" accept="image/*" class="bg-file-input" onchange={onBgImage} />
                                </label>
                            </div>
                        </div>
                    {/if}

                    <div class="preview-stage" style="width:{cardWidth * previewScale}px;height:{cardHeight * previewScale}px">
                        <div class="preview-scaled" style="transform:scale({previewScale});width:{cardWidth || 1280}px;border-radius:{previewShadowRadius}px">
                            <YouTubeCard bind:cardEl {video} {config} />
                        </div>
                    </div>
                </div>
            </div>

            <aside class="rail">
                <h3>Controls</h3>
                <div class="rail-grid">
                    <label class="field">
                        <span>Card aspect</span>
                        <select bind:value={config.aspect}>
                            <option value="auto">Auto (per layout)</option>
                            {#each Object.keys(ASPECTS) as a}
                                <option value={a}>{a}</option>
                            {/each}
                        </select>
                    </label>

                    <div class="field" class:disabled={!ratioActive}>
                        <SnapSlider
                            label="Thumb / text ratio"
                            unit="%"
                            bind:value={config.ratio}
                            min={25} max={85} step={1}
                            notches={[40, 50, 60, 70, 85]}
                            snapDistance={2}
                            disabled={!ratioActive}
                        />
                    </div>

                    <div class="field" class:disabled={!columnGapActive}>
                        <SnapSlider
                            label="Split wideness"
                            unit="×"
                            bind:value={config.splitWideness}
                            min={1.2} max={4} step={0.1}
                            notches={[1.6, 2, 2.4, 3.2, 4]}
                            snapDistance={0.2}
                            disabled={!columnGapActive}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Thumbnail radius"
                            unit="px"
                            bind:value={config.radius}
                            min={0} max={72} step={1}
                            notches={[0, 4, 8, 12, 16, 24, 36, 48, 72]}
                            snapDistance={1.5}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Card radius"
                            unit="px"
                            bind:value={config.containerRadius}
                            min={0} max={128} step={1}
                            notches={[0, 8, 16, 24, 32, 48, 64, 96, 128]}
                            snapDistance={3}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Card padding"
                            unit="px"
                            bind:value={config.padding}
                            min={0} max={80} step={1}
                            notches={[0, 16, 32, 40, 48, 64, 80]}
                            snapDistance={2}
                            tune={() => (touched.padding = true)}
                        />
                    </div>

                    <div class="field" class:disabled={!thumbGapActive}>
                        <SnapSlider
                            label="Thumbnail spacing"
                            unit="px"
                            bind:value={config.thumbGap}
                            min={0} max={80} step={1}
                            notches={GAP_NOTCHES}
                            snapDistance={3}
                            disabled={!thumbGapActive}
                            tune={() => (touched.thumbGap = true)}
                        />
                    </div>

                    <div class="field" class:disabled={!columnGapActive}>
                        <SnapSlider
                            label="Column spacing"
                            unit="px"
                            bind:value={config.columnGap}
                            min={0} max={80} step={1}
                            notches={GAP_NOTCHES}
                            snapDistance={3}
                            disabled={!columnGapActive}
                            tune={() => (touched.columnGap = true)}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Text spacing"
                            unit="px"
                            bind:value={config.textGap}
                            min={0} max={80} step={1}
                            notches={[0, 8, 16, 24, 32, 48]}
                            snapDistance={2}
                            tune={() => (touched.textGap = true)}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Title size"
                            unit="×"
                            bind:value={config.titleScale}
                            min={0.8} max={1.6} step={0.05}
                            notches={[1]}
                            snapDistance={0.05}
                        />
                    </div>

                    <div class="field" class:disabled={!scrimActive}>
                        <SnapSlider
                            label="Scrim darkness"
                            unit="%"
                            bind:value={config.scrimOpacity}
                            min={30} max={100} step={1}
                            notches={[50, 70, 85, 100]}
                            snapDistance={5}
                            disabled={!scrimActive}
                        />
                    </div>
                </div>
            </aside>
        </div>

        <!-- ── Row 3: Content (preview width) | Export ── -->
        <div class="bottom-band">
            <section class="bottom-col content-col">
                <h2 class="band-title">Content</h2>
                <div class="module-grid">
                    {#each modulesList as mod}
                        <button
                            type="button"
                            class="module-btn"
                            class:active={config.modules[mod.key]}
                            role="checkbox"
                            aria-checked={config.modules[mod.key]}
                            onclick={() => toggleModule(mod.key)}
                            onkeydown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleModule(mod.key))}
                        >
                            <i class="fa-solid fa-check module-check" aria-hidden="true"></i>
                            <span class="module-label">{mod.label}</span>
                        </button>
                    {/each}
                    {#if config.layout === 'hero' || config.layout === 'underlay'}
                        <button
                            type="button"
                            class="module-btn"
                            class:active={config.modules.scrim}
                            role="checkbox"
                            aria-checked={config.modules.scrim}
                            onclick={() => toggleModule('scrim')}
                            onkeydown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleModule('scrim'))}
                        >
                            <i class="fa-solid fa-check module-check" aria-hidden="true"></i>
                            <span class="module-label">Bottom scrim</span>
                        </button>
                    {/if}
                </div>

                <div class="content-fields">
                    <label class="field">
                        <span>Title lines</span>
                        <select bind:value={config.titleLines}>
                            {#each [1, 2, 3] as n}
                                <option value={n}>{n}</option>
                            {/each}
                        </select>
                    </label>
                    <label class="field">
                        <span>Description lines</span>
                        <select bind:value={config.descriptionLines}>
                            {#each [1, 2, 3] as n}
                                <option value={n}>{n}</option>
                            {/each}
                        </select>
                    </label>
                    <label class="field">
                        <span>Date format</span>
                        <select bind:value={config.dateFormat}>
                            <option value="absolute">July 5, 2025</option>
                            <option value="relative">5 months ago</option>
                        </select>
                    </label>
                </div>
            </section>

            <aside class="bottom-col export-col">
                <h2 class="band-title">Export</h2>
                <div class="field export-size-field">
                    <SnapSlider
                        label="Export size"
                        unit="px"
                        bind:value={config.containerSize}
                        min={720} max={1920} step={10}
                        notches={[720, 1080, 1280, 1440, 1920]}
                        snapDistance={60}
                    />
                </div>
                <ExportBar {cardEl} filename={video.id} />
                <p class="card-note">
                    Export size is a pure scaling setting — the whole composition (text, spacing, radiuses, frame) grows or shrinks proportionally, and the preview stays at a fixed size. Transparent PNG supported.
                </p>
            </aside>
        </div>

    </div>
{/if}

<style>
    .input-row {
        display: flex;
        gap: var(--space-md);
        max-width: 720px;
        margin: 0 auto var(--space-sm);
        padding: 0 var(--container-pad);
    }

    .url-input {
        flex: 1;
        background: transparent;
        border: var(--border-solid);
        color: var(--color-text-primary);
        font-family: var(--font-body);
        font-size: var(--text-base);
        padding: 0.625rem 1rem;
        outline: none;
        min-width: 0;
    }
    .url-input::placeholder {
        color: var(--color-text-secondary);
        opacity: 0.6;
    }

    .gen-btn {
        background: var(--color-text-primary);
        border: 0;
        color: #000;
        font-family: var(--font-body);
        font-weight: 600;
        font-size: var(--text-base);
        padding: 0.625rem 1.5rem;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity var(--transition-fast);
    }
    .gen-btn:hover {
        opacity: 0.85;
    }
    .gen-btn:disabled {
        opacity: 0.5;
        cursor: wait;
    }

    .samples {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-sm);
        flex-wrap: wrap;
        padding: 0 var(--container-pad) var(--space-lg);
        max-width: 720px;
        margin: 0 auto;
    }
    .samples-label {
        font-size: var(--text-xs);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        opacity: 0.7;
    }
    .sample-chip {
        background: transparent;
        border: var(--border);
        color: var(--color-text-secondary);
        font-family: var(--font-body);
        font-size: var(--text-xs);
        padding: 0.3rem 0.7rem;
        cursor: pointer;
        transition: color var(--transition-fast), border-color var(--transition-fast);
    }
    .sample-chip:hover {
        color: var(--color-text-primary);
        border-color: var(--color-text-primary);
    }

    .error-msg {
        text-align: center;
        color: var(--color-accent);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        padding: var(--space-sm) var(--container-pad) 0;
    }

    /* ── Page body ── */
    .page-body {
        max-width: var(--container-max);
        margin: 0 auto;
        margin-top: var(--space-3xl);
        padding: 0 var(--container-pad) var(--space-4xl);
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
        scroll-margin-top: 2rem;
    }

    .band-title {
        font-family: var(--font-display);
        font-size: var(--text-sm);
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-text-primary);
        margin: 0 0 var(--space-md);
    }

    /* ── Row 1: Layout | Style (short, single-row content) ── */
    .top-band {
        display: grid;
        grid-template-columns: 1.15fr 1fr;
        gap: var(--space-lg);
    }
    .top-col {
        border: var(--border);
        padding: var(--space-lg);
        min-width: 0;
    }

    .layout-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: var(--space-xs);
        align-items: stretch;
    }
    .layout-btn {
        background: transparent;
        border: var(--border);
        color: var(--color-text-secondary);
        padding: var(--space-sm);
        cursor: pointer;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
    }
    .layout-btn:hover {
        color: var(--color-text-primary);
    }
    .layout-btn.active {
        background: #fff;
        border-color: #fff;
        color: #000;
    }
    .layout-btn.active .layout-hint {
        color: #000;
        opacity: 0.6;
    }
    .layout-name {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 600;
    }
    .layout-hint {
        font-size: 0.62rem;
        font-family: var(--font-body);
        line-height: 1.3;
        color: var(--color-text-secondary);
        opacity: 0.75;
    }

    .style-rows {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
    }

    .style-row {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        flex-wrap: wrap;
        min-height: 2rem;
    }
    .palette-btn {
        background: transparent;
        border: var(--border);
        padding: 0.3rem 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
        transition: border-color var(--transition-fast);
        min-width: 0;
    }
    .palette-btn:hover {
        border-color: var(--color-text-secondary);
    }
    .palette-btn.active {
        background: #fff;
        border-color: #fff;
    }
    .palette-btn.active .palette-name {
        color: #000;
    }
    .palette-btn.active .plt-custom {
        color: #000;
    }
    .plt {
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.25);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .plt-dot {
        width: 0.35rem;
        height: 0.35rem;
        border-radius: 50%;
    }
    .plt-custom {
        background: rgba(255, 255, 255, 0.06);
        color: var(--color-text-secondary);
        font-size: 0.6rem;
    }
    .palette-name {
        font-family: var(--font-body);
        font-size: 0.66rem;
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .color-inline {
        display: inline-flex;
        gap: 0.25rem;
        align-items: center;
    }
    .color-inline input[type='color'] {
        width: 1.4rem;
        height: 1.4rem;
        background: transparent;
        border: var(--border);
        padding: 0.1rem;
        cursor: pointer;
    }

    .inline-field {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-family: var(--font-body);
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
    }
    .inline-field select {
        background: transparent;
        border: var(--border);
        color: var(--color-text-primary);
        font-family: var(--font-body);
        font-size: var(--text-xs);
        padding: 0.3rem 0.4rem;
        outline: none;
        max-width: 9rem;
    }
    .inline-field select option {
        background: #0f0f0f;
        color: var(--color-text-primary);
    }
    .font-select {
        min-width: 16rem;
    }
    .font-wrap {
        position: relative;
        display: inline-block;
    }
    .font-wrap .font-select {
        padding-left: 2.6rem;
        display: block;
    }
    .font-tag {
        position: absolute;
        left: 0.55rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.6rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        opacity: 0.7;
        pointer-events: none;
        z-index: 1;
    }

    .ver-swatches {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        flex-wrap: wrap;
    }
    .ver-label {
        font-size: 0.6rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        opacity: 0.7;
        margin-right: 0.25rem;
    }
    .ver-swatch {
        width: 1.4rem;
        height: 1.4rem;
        border: var(--border);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #0f0f0f;
        font-size: 0.55rem;
        cursor: pointer;
        padding: 0;
        transition: border-color var(--transition-fast);
    }
    .ver-swatch:hover {
        border-color: var(--color-text-secondary);
    }
    .ver-swatch.active {
        border-color: var(--color-text-primary);
        outline: 1px solid var(--color-text-primary);
        outline-offset: 2px;
    }
    .ver-dot {
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 50%;
    }
    .ver-custom-input {
        width: 2.4rem;
        height: 1.4rem;
        background: transparent;
        border: var(--border);
        padding: 0.1rem;
        cursor: pointer;
    }

    /* ── Row 2: Preview | Controls rail (same height) ── */
    .workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: var(--space-lg);
        align-items: stretch;
    }

    .preview-col {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
    }

    /* API fallback notice */
    .api-note {
        display: flex;
        gap: var(--space-md);
        align-items: flex-start;
        border: var(--border);
        border-left: 3px solid var(--color-accent);
        background: rgba(255, 0, 0, 0.04);
        padding: var(--space-md) var(--space-lg);
        font-family: var(--font-body);
    }
    .api-note > i {
        color: var(--color-accent);
        font-size: var(--text-lg);
        margin-top: 0.15rem;
    }
    .api-note-body {
        flex: 1;
        min-width: 0;
    }
    .api-note-body strong {
        color: var(--color-text-primary);
        font-weight: 600;
        font-size: var(--text-sm);
    }
    .api-note-body p {
        font-size: var(--text-xs);
        line-height: 1.55;
        color: var(--color-text-secondary);
        margin-top: 0.35rem;
    }
    .api-note-err {
        color: #ff6b6b !important;
        font-family: var(--font-body);
        word-break: break-word;
    }
    .api-note-links a {
        color: var(--color-text-primary);
        font-weight: 600;
        text-decoration: none;
        border-bottom: 1px solid var(--color-text-primary);
    }
    .api-sep {
        opacity: 0.5;
        margin: 0 0.4rem;
    }
    .api-dismiss {
        background: transparent;
        border: 0;
        color: var(--color-text-secondary);
        cursor: pointer;
        font-size: var(--text-base);
        padding: 0.15rem 0.25rem;
        transition: color var(--transition-fast);
    }
    .api-dismiss:hover {
        color: var(--color-text-primary);
    }

    .preview-pane {
        border: var(--border);
        overflow: auto;
        display: flex;
        align-items: flex-start;
        padding: var(--space-md);
        max-height: 480px;
        box-sizing: border-box;
        background:
            repeating-conic-gradient(rgba(255, 255, 255, 0.03) 0% 25%, transparent 0% 50%) 0 0 / 24px 24px,
            #0a0a0a;
        scrollbar-gutter: stable;
        flex: 1;
        position: relative;
    }

    /* Background picker — small button in the pane's top-right corner */
    .preview-bg-btn {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        z-index: 15;
        width: 2rem;
        height: 2rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 10, 10, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        cursor: pointer;
        padding: 0;
        transition: color var(--transition-fast), border-color var(--transition-fast);
    }
    .preview-bg-btn:hover {
        color: var(--color-text-primary);
        border-color: var(--color-text-primary);
    }

    .preview-bg-menu {
        position: absolute;
        top: 2.9rem;
        right: 0.75rem;
        z-index: 30;
        width: 234px;
        background: #0f0f0f;
        border: var(--border);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
        padding: var(--space-sm);
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        font-family: var(--font-body);
    }
    .bg-sec {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .bg-sec-label {
        font-size: 0.6rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        opacity: 0.7;
    }
    .bg-opt {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: transparent;
        border: 1px solid transparent;
        color: var(--color-text-secondary);
        font-family: var(--font-body);
        font-size: var(--text-xs);
        text-align: left;
        padding: 0.4rem 0.5rem;
        cursor: pointer;
        transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
    }
    .bg-opt:hover {
        color: var(--color-text-primary);
        border-color: rgba(255, 255, 255, 0.2);
    }
    .bg-opt.active {
        background: #fff;
        border-color: #fff;
        color: #000;
    }
    .bg-chip {
        width: 1rem;
        height: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.3);
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.5rem;
    }
    .bg-chip-checker {
        background: repeating-conic-gradient(rgba(255, 255, 255, 0.4) 0% 25%, rgba(0, 0, 0, 0.5) 0% 50%) 0 0 / 8px 8px;
        border: 0;
    }
    .bg-chip-img {
        border: 1px solid var(--color-text-secondary);
        color: var(--color-text-secondary);
    }
    .bg-opt.active .bg-chip-img {
        border-color: #000;
        color: #000;
    }
    .bg-color-input,
    .bg-file-input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
    }

    /* margin:auto centers the stage when it fits and never clips the top when it overflows */
    .preview-stage {
        position: relative;
        flex-shrink: 0;
        margin: auto;
    }

    .preview-scaled {
        transform-origin: top left;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
    }

    /* Controls rail — hosts every slider, mirrors the preview height */
    .rail {
        border: var(--border);
        padding: var(--space-lg);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        min-width: 0;
        max-height: 480px;
        box-sizing: border-box;
        overflow-y: auto;
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
    }
    .rail h3 {
        font-family: var(--font-display);
        font-size: var(--text-sm);
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-text-primary);
        margin: 0;
    }
    .rail-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-md);
        align-items: start;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        min-width: 0;
    }
    .field > span {
        display: block;
    }
    .field.disabled {
        opacity: 0.4;
        pointer-events: none;
    }
    .field select {
        background: transparent;
        border: var(--border);
        color: var(--color-text-primary);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        padding: 0.4rem 0.5rem;
        outline: none;
    }
    .field select option {
        background: #0f0f0f;
        color: var(--color-text-primary);
    }

    /* ── Row 3: Content | Export ── */
    .bottom-band {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: var(--space-lg);
        align-items: stretch;
    }
    .bottom-col {
        border: var(--border);
        padding: var(--space-lg);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        min-width: 0;
    }

    .module-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: var(--space-xs);
    }
    .module-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: transparent;
        border: var(--border);
        color: var(--color-text-secondary);
        font-family: var(--font-body);
        font-size: 0.72rem;
        padding: 0.5rem 0.6rem;
        cursor: pointer;
        text-align: left;
        transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
    }
    .module-btn:hover {
        color: var(--color-text-primary);
    }
    .module-btn.active {
        background: #fff;
        border-color: #fff;
        color: #000;
    }
    .module-check {
        font-size: 0.58rem;
        width: 0.8rem;
        color: #000;
        opacity: 0;
        transition: opacity var(--transition-fast);
        flex-shrink: 0;
    }
    .module-btn.active .module-check {
        opacity: 1;
    }
    .module-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .content-fields {
        display: flex;
        gap: var(--space-lg);
        flex-wrap: wrap;
    }
    .content-fields .field {
        min-width: 140px;
        flex: 0 1 auto;
    }

    .card-note {
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        opacity: 0.75;
        line-height: 1.5;
        margin: 0;
    }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
        .top-band {
            grid-template-columns: 1fr;
        }
        .workspace,
        .bottom-band {
            grid-template-columns: 1fr;
        }
        .input-row {
            flex-direction: column;
        }
    }

    @media (max-width: 666px) {
        .preview-pane {
            max-height: 60vh;
        }
    }
</style>