<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import YouTubeCard from '$lib/components/tools/YouTubeCard.svelte';
    import ExportBar from '$lib/components/tools/controls/ExportBar.svelte';
    import {
        DEFAULT_CONFIG, LAYOUTS, FONTS, PALETTES, PALETTE_NAMES, ASPECTS, DESIGN_WIDTH, layoutWidth
    } from '$lib/components/tools/yt-config.js';

    $effect(() => { window.umami?.track('page-view', { page: 'tools-youtube-card' }); });

    let url = $state('');
    let loading = $state(false);
    let error = $state('');
    let video = $state(null);
    let config = $state(structuredClone(DEFAULT_CONFIG));
    let cardEl = $state(null);

    // ── Preview scaling ──
    let paneEl = $state(null);
    let cardHeight = $state(0);
    let scale = $state(0.3);
    let paddingTouched = $state(false);

    $effect(() => {
        const pane = paneEl;
        if (!pane) return;
        const update = () => {
            const cardWidth = layoutWidth(config.layout);
            const paneW = pane.clientWidth - 48;
            const paneH = pane.clientHeight - 48;
            scale = Math.min(
                0.42,
                Math.max(0.08, paneW / cardWidth),
                cardHeight > 0 ? paneH / cardHeight : 1
            );
            if (cardEl) cardHeight = cardEl.offsetHeight;
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
        // Each layout has a padding default; respect it until the user dials their own.
        if (!paddingTouched) config.padding = LAYOUTS[key].defaultPadding ?? 0;
    }

    const modulesList = [
        { key: 'duration', label: 'Duration badge' },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
        { key: 'channel', label: 'Channel name' },
        { key: 'avatar', label: 'Channel avatar' },
        { key: 'meta', label: 'Views & date' },
        { key: 'verified', label: 'Verified check' },
        { key: 'live', label: 'LIVE badge' }
    ];

    const ratioActive = $derived(config.layout === 'split' || config.layout === 'vertical');
    const scrimActive = $derived(config.layout === 'hero');
    const designWidth = $derived(layoutWidth(config.layout));
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
    <div class="workspace">
        <div class="preview-col">
            <div class="preview-pane" bind:this={paneEl} style="height:{Math.min(480, Math.max(320, cardHeight * scale + 56))}px">
                <div class="preview-stage" style="width:{designWidth * scale}px;height:{cardHeight * scale}px">
                    <div class="preview-scaled" style="transform:scale({scale});width:{designWidth}px">
                        <YouTubeCard bind:cardEl {video} {config} />
                    </div>
                </div>
            </div>
            <ExportBar {cardEl} filename={video.id} />
            <p class="card-note">
                Card renders at {designWidth}px wide · exports up to {designWidth * 3}px · transparent PNG supported
            </p>
        </div>

        <aside class="controls">
            <!-- ── Layout ── -->
            <section class="ctrl-group">
                <h3>Layout</h3>
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

                <label class="field">
                    <span>Card aspect</span>
                    <select bind:value={config.aspect}>
                        <option value="auto">Auto (per layout)</option>
                        {#each Object.keys(ASPECTS) as a}
                            <option value={a}>{a}</option>
                        {/each}
                    </select>
                </label>

                <label class="field" class:disabled={!ratioActive}>
                    <span>Thumbnail / text ratio — {config.ratio}%</span>
                    <input
                        type="range" min="30" max="70" step="1"
                        bind:value={config.ratio}
                        disabled={!ratioActive}
                    />
                </label>

                <label class="field">
                    <span>Thumbnail radius — {config.radius}px</span>
                    <input type="range" min="0" max="24" step="1" bind:value={config.radius} />
                </label>

                <label class="field">
                    <span>Card radius — {config.containerRadius}px</span>
                    <input type="range" min="0" max="32" step="1" bind:value={config.containerRadius} />
                </label>

                <label class="field">
                    <span>Card padding — {config.padding}px</span>
                    <input
                        type="range" min="0" max="80" step="1"
                        bind:value={config.padding}
                        oninput={() => (paddingTouched = true)}
                    />
                </label>

                <label class="field">
                    <span>Element spacing — {Math.round((config.spacing ?? 1) * 100)}%</span>
                    <input type="range" min="0.5" max="2" step="0.05" bind:value={config.spacing} />
                </label>
            </section>

            <!-- ── Style ── -->
            <section class="ctrl-group">
                <h3>Style</h3>
                <div class="palette-row">
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
                </div>

                {#if config.palette === 'custom'}
                    <div class="color-grid">
                        <label class="color-field">
                            <span>Background</span>
                            <input type="color" bind:value={config.colors.bg} />
                        </label>
                        <label class="color-field">
                            <span>Text</span>
                            <input type="color" bind:value={config.colors.text} />
                        </label>
                        <label class="color-field">
                            <span>Secondary</span>
                            <input type="color" bind:value={config.colors.secondary} />
                        </label>
                        <label class="color-field">
                            <span>Accent</span>
                            <input type="color" bind:value={config.colors.accent} />
                        </label>
                    </div>
                {/if}

                <label class="field">
                    <span>Font family</span>
                    <select bind:value={config.font}>
                        {#each FONTS as f}
                            <option value={f} style="font-family:'{f}'">{f}</option>
                        {/each}
                    </select>
                </label>

                <label class="field">
                    <span>Title size — {Math.round(config.titleScale * 100)}%</span>
                    <input type="range" min="0.8" max="1.6" step="0.05" bind:value={config.titleScale} />
                </label>

                <label class="field" class:disabled={!scrimActive}>
                    <span>Scrim darkness — {config.scrimOpacity}%</span>
                    <input
                        type="range" min="30" max="100" step="1"
                        bind:value={config.scrimOpacity}
                        disabled={!scrimActive}
                    />
                </label>
            </section>

            <!-- ── Content ── -->
            <section class="ctrl-group">
                <h3>Content</h3>
                <div class="toggle-list">
                    {#each modulesList as mod}
                        <label class="toggle">
                            <input type="checkbox" bind:checked={config.modules[mod.key]} />
                            <span>{mod.label}</span>
                        </label>
                    {/each}
                    {#if config.layout === 'hero'}
                        <label class="toggle">
                            <input type="checkbox" bind:checked={config.modules.scrim} />
                            <span>Bottom scrim (hero overlay)</span>
                        </label>
                    {/if}
                </div>

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
            </section>
        </aside>
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

    /* ── Workspace ── */
    .workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 460px;
        gap: var(--space-xl);
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--container-pad) var(--space-4xl);
        align-items: start;
    }

    .preview-col {
        min-width: 0;
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

    .card-note {
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        opacity: 0.7;
        margin-top: var(--space-sm);
    }

    /* ── Controls ── */
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

    .layout-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-xs);
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
        border-color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.05);
        color: var(--color-text-primary);
    }
    .layout-name {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 600;
    }
    .layout-hint {
        font-size: 0.68rem;
        font-family: var(--font-body);
        line-height: 1.35;
        color: var(--color-text-secondary);
        opacity: 0.75;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
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
    .field input[type='range'] {
        accent-color: var(--color-text-primary);
        width: 100%;
    }

    .palette-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-xs);
    }
    .palette-btn {
        background: transparent;
        border: var(--border);
        padding: var(--space-xs);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        cursor: pointer;
        transition: border-color var(--transition-fast);
    }
    .palette-btn:hover {
        border-color: var(--color-text-secondary);
    }
    .palette-btn.active {
        border-color: var(--color-text-primary);
    }
    .plt {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.25);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .plt-dot {
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 50%;
    }
    .plt-custom {
        background: rgba(255, 255, 255, 0.06);
        color: var(--color-text-secondary);
        font-size: 0.7rem;
    }
    .palette-name {
        font-family: var(--font-body);
        font-size: 0.72rem;
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .color-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-sm);
    }
    .color-field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.7rem;
        color: var(--color-text-secondary);
        font-family: var(--font-body);
    }
    .color-field input[type='color'] {
        width: 100%;
        height: 1.8rem;
        background: transparent;
        border: var(--border);
        padding: 0.15rem;
        cursor: pointer;
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

    /* ── Responsive ── */
    @media (max-width: 1200px) {
        .workspace {
            grid-template-columns: 1fr;
        }
        .controls {
            position: static;
            max-height: none;
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