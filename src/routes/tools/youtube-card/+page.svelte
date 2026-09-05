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

    // ── Preview scaling ──
    let paneEl = $state(null);
    let cardHeight = $state(0);
    let cardWidth = $state(0);
    let scale = $state(0.3);

    $effect(() => {
        const pane = paneEl;
        if (!pane) return;
        const update = () => {
            const cw = cardEl?.offsetWidth ?? 0;
            if (cw) cardWidth = cw;
            const paneW = pane.clientWidth - 48;
            const paneH = pane.clientHeight - 48;
            scale = Math.min(
                0.42,
                Math.max(0.08, paneW / (cardWidth || 1280)),
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
        const d = LAYOUTS[key].defaults;
        if (!touched.padding) config.padding = LAYOUTS[key].defaultPadding ?? 0;
        if (!touched.thumbGap) config.thumbGap = d.thumb;
        if (!touched.columnGap) config.columnGap = d.column;
        if (!touched.textGap) config.textGap = d.text;
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

    function toggleModule(key) {
        config.modules[key] = !config.modules[key];
    }

    const ratioActive = $derived(config.layout === 'split');
    const thumbGapActive = $derived(config.layout === 'classic' || config.layout === 'stacked');
    const columnGapActive = $derived(config.layout === 'split');
    const scrimActive = $derived(config.layout === 'hero');

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

    const exportWidth = $derived((config.containerSize ?? 1280) + 2 * (config.padding ?? 0));

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
    <div class="workspace">
        <div class="preview-col">
            {#if showApiNote && !apiNoteDismissed}
                <div class="api-note" role="status">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div class="api-note-body">
                        <strong>Some video data couldn't be fetched</strong>
                        <p>Duration, views, description and creator details come from the YouTube API — it appears to be down, throttled, or unreachable right now. The card generator still works fully: layouts, colors, fonts and export all function, and the thumbnail and title are loaded directly.</p>
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

            <div class="preview-pane" bind:this={paneEl} style="height:{Math.min(480, Math.max(320, cardHeight * scale + 56))}px">
                <div class="preview-stage" style="width:{cardWidth * scale}px;height:{cardHeight * scale}px">
                    <div class="preview-scaled" style="transform:scale({scale});width:{cardWidth || 1280}px">
                        <YouTubeCard bind:cardEl {video} {config} />
                    </div>
                </div>
            </div>
            <ExportBar {cardEl} filename={video.id} />
            <p class="card-note">
                Content {config.containerSize}px · frame {config.padding}px · exports up to {exportWidth * 3}px wide · transparent PNG supported
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

                <div class="field">
                    <span>Card aspect</span>
                    <select bind:value={config.aspect}>
                        <option value="auto">Auto (per layout)</option>
                        {#each Object.keys(ASPECTS) as a}
                            <option value={a}>{a}</option>
                        {/each}
                    </select>
                </div>

                <div class="field" class:disabled={!ratioActive}>
                    <SnapSlider
                        label="Thumb / text ratio"
                        unit="%"
                        bind:value={config.ratio}
                        min={30} max={70} step={1}
                        notches={[30, 40, 50, 60, 70]}
                        snapDistance={3}
                        disabled={!ratioActive}
                    />
                </div>

                <div class="field">
                    <SnapSlider
                        label="Container size"
                        unit="px"
                        bind:value={config.containerSize}
                        min={720} max={1920} step={10}
                        notches={[720, 1080, 1280, 1440, 1920]}
                        snapDistance={60}
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
                        label="Thumbnail radius"
                        unit="px"
                        bind:value={config.radius}
                        min={0} max={24} step={1}
                        notches={[0, 4, 8, 12, 16, 20, 24]}
                        snapDistance={1.5}
                    />
                </div>

                <div class="field">
                    <SnapSlider
                        label="Card radius"
                        unit="px"
                        bind:value={config.containerRadius}
                        min={0} max={32} step={1}
                        notches={[0, 4, 8, 12, 16, 24, 32]}
                        snapDistance={1.5}
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

                <div class="field">
                    <span>Font family</span>
                    <select bind:value={config.font}>
                        {#each FONTS as f}
                            <option value={f} style="font-family:'{f}'">{f}</option>
                        {/each}
                    </select>
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
            </section>

            <!-- ── Content ── -->
            <section class="ctrl-group">
                <h3>Content</h3>
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
                    {#if config.layout === 'hero'}
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

                <div class="lines-row">
                    <label class="lines-field">
                        <span>Title lines</span>
                        <select bind:value={config.titleLines}>
                            {#each [1, 2, 3] as n}
                                <option value={n}>{n}</option>
                            {/each}
                        </select>
                    </label>
                    <label class="lines-field">
                        <span>Desc. lines</span>
                        <select bind:value={config.descriptionLines}>
                            {#each [1, 2, 3] as n}
                                <option value={n}>{n}</option>
                            {/each}
                        </select>
                    </label>
                </div>
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
        gap: 0.5rem;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
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

    /* Content modules: box grid with active/off styling, like the layout picker */
    .module-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
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
        border-color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.05);
        color: var(--color-text-primary);
    }
    .module-check {
        font-size: 0.58rem;
        width: 0.8rem;
        color: var(--color-text-primary);
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

    .lines-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-sm);
    }
    .lines-field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
    }
    .lines-field select {
        background: transparent;
        border: var(--border);
        color: var(--color-text-primary);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        padding: 0.4rem 0.5rem;
        outline: none;
    }
    .lines-field select option {
        background: #0f0f0f;
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