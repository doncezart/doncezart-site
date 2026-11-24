<script>
	import Seo from '$lib/components/Seo.svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import SnapSlider from '$lib/components/ui/SnapSlider.svelte';
    import ProfileCard from '$lib/components/tools/ProfileCard.svelte';
    import ExportBar from '$lib/components/tools/controls/ExportBar.svelte';
    import {
        DEFAULT_CONFIG, TEMPLATES, FONTS, PALETTES, PALETTE_NAMES, ASPECTS
    } from '$lib/components/tools/profile-config.js';
    import { PLATFORMS, PLATFORM_KEYS, profileUrl } from '$lib/data/social-platforms.js';

    $effect(() => { window.umami?.track('page-view', { page: 'tools-profile-card' }); });

    let input = $state('');
    let loading = $state(false);
    let error = $state('');
    let profile = $state(null);
    let config = $state(structuredClone(DEFAULT_CONFIG));
    let cardEl = $state(null);

    // Per-template defaults apply on switch until the user tunes a value.
    const touched = $state({
        padding: false, containerRadius: false, font: false,
        titleScale: false, textScale: false, background: false, palette: false
    });
    const touchedModules = $state(new Set());

    // ── Preview: the card renders at one fixed on-screen size; containerSize is
    // an export-only setting, so the display scale counter-acts the export zoom. ──
    const PREVIEW_SCALE = 0.4;
    const PANE_HEIGHT = 480;
    let paneEl = $state(null);
    let cardHeight = $state(0);
    let cardWidth = $state(0);

    const previewScale = $derived((() => {
        const C = config.containerSize ?? 1280;
        const designH = cardHeight * 1280 / C;
        const fit = Math.min(PREVIEW_SCALE, (PANE_HEIGHT - 56) / Math.max(designH, 1));
        return fit * 1280 / C;
    })());

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
        { label: 'YouTube · Fireship', value: 'youtube:@Fireship' },
        { label: 'GitHub · torvalds', value: 'github:torvalds' },
        { label: 'Instagram · nasa', value: 'instagram:nasa' },
        { label: 'X · vercel', value: 'x:vercel' }
    ];

    const templateKeys = Object.keys(TEMPLATES);
    const modulesList = [
        { key: 'avatar', label: 'Avatar' },
        { key: 'name', label: 'Name' },
        { key: 'handle', label: 'Handle' },
        { key: 'verified', label: 'Verified' },
        { key: 'platform', label: 'Platform' },
        { key: 'bio', label: 'Bio' },
        { key: 'stats', label: 'Stats' },
        { key: 'location', label: 'Location' },
        { key: 'link', label: 'Link' }
    ];

    async function fetchProfile(target = input) {
        const t = target.trim();
        if (!t) {
            error = 'Paste a handle or profile link first.';
            return;
        }
        loading = true;
        error = '';
        try {
            const r = await fetch(`/api/profile/info?handle=${encodeURIComponent(t)}`);
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Something went wrong.');
            j.fields = j.fields ?? {};
            j.stats = j.stats ?? [];
            profile = j;
            window.umami?.track('tool-generate', { tool: 'profile-card', platform: j.platform ?? 'unknown' });
        } catch (e) {
            error = e.message || 'Could not load that profile. Try again in a moment.';
        } finally {
            loading = false;
        }
    }

    function useSample(s) {
        input = s.value;
        fetchProfile(s.value);
    }

    function setTemplate(key) {
        config.template = key;
        const t = TEMPLATES[key];
        if (!touched.padding) config.padding = t.defaultPadding ?? 0;
        if (!touched.containerRadius) config.containerRadius = t.defaultRadius ?? 0;
        if (!touched.font) config.font = t.font ?? 'Inter';
        if (!touched.background) config.background = { ...config.background, type: t.background ?? 'solid' };
        if (!touched.palette && t.defaultPalette) config.palette = t.defaultPalette;
    }

    function setPlatform(p) {
        if (!profile) return;
        profile.platform = p;
        profile.url = profileUrl(p, profile.handle);
    }

    function onAvatar(e) {
        const f = e.currentTarget.files?.[0];
        if (!f || !profile) return;
        if (profile.avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(profile.avatarUrl);
        profile.avatarUrl = URL.createObjectURL(f);
    }
    function clearAvatar() {
        if (!profile) return;
        if (profile.avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(profile.avatarUrl);
        profile.avatarUrl = null;
    }

    function addStat() {
        if (!profile) return;
        profile.stats = [...profile.stats, { key: 'custom', label: 'Label', value: '0' }];
    }
    function removeStat(i) {
        if (!profile) return;
        profile.stats = profile.stats.filter((_, idx) => idx !== i);
    }
    function toggleModule(key) {
        config.modules[key] = !config.modules[key];
        touchedModules.add(key);
    }

    const showNote = $derived(!!profile && (profile.source !== 'api' || !!profile.error));
    const platformMeta = $derived(profile?.platform ? PLATFORMS[profile.platform] : null);

    let bodyEl = $state(null);
    $effect(() => {
        if (!profile) return;
        const t = setTimeout(() => {
            const el = bodyEl;
            if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY - 88;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }, 120);
        return () => clearTimeout(t);
    });

    const previewBoxWidth = $derived(
        (config.containerSize ?? 1280) + 2 * Math.round((config.padding ?? 0) * (config.containerSize ?? 1280) / 1280)
    );
    const previewShadowRadius = $derived(Math.round((config.containerRadius ?? 0) * (config.containerSize ?? 1280) / 1280));
</script>

<Seo
    title="Social Profile Card Generator"
    description="Turn any social handle into a designer profile card. Auto-fetch from YouTube and GitHub, or build it by hand. Export as PNG, JPEG or WebP."
    image="/og/tools.png"
/>
<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600&family=Archivo:wght@400;500;700&family=Anton&family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,900&family=JetBrains+Mono:wght@400;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<PageHeader
    eyebrow="Free tool"
    title="Social Profile"
    hot="Card"
    subtitle="Paste a handle or profile link and get a designer profile card. Auto-fetch what platforms allow, fill the rest by hand, export in full resolution."
/>

<div class="launch reveal" style="--d: 3">
<form class="input-row" onsubmit={(e) => { e.preventDefault(); fetchProfile(); }}>
    <input
        type="text"
        bind:value={input}
        placeholder="instagram.com/yourhandle, youtube:@yourchannel, github:you…"
        class="url-input"
        aria-label="Social handle or profile URL"
        autocomplete="off"
        spellcheck="false"
    />
    <button class="btn gen-btn" type="submit" disabled={loading}>
        {loading ? 'Fetching…' : 'Generate card'}
        {#if !loading}<i class="fa-solid fa-arrow-right" aria-hidden="true"></i>{/if}
    </button>
</form>

<div class="samples">
    <span class="samples-label">Try:</span>
    {#each SAMPLES as s}
        <button class="sample-chip" onclick={() => useSample(s)}>{s.label}</button>
    {/each}
</div>

{#if error}
    <p class="error-msg"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>{error}</p>
{/if}
</div>

{#if profile}
    <div class="page-body" id="tools-body" bind:this={bodyEl}>

        {#if showNote}
            <div class="api-note" role="status">
                <i class="fa-solid fa-circle-info"></i>
                <div class="api-note-body">
                    <strong>{profile.error ? 'Some fields need your input' : 'Built from limited data'}</strong>
                    <p>
                        {#if profile.platform}
                            {PLATFORMS[profile.platform].label} does not expose all profile data through official endpoints.
                        {:else}
                            No platform selected yet.
                        {/if}
                        The card generator works fully: pick a template, edit the fields below, and export. Everything you type is saved into the card.
                    </p>
                    {#if profile.error}
                        <p class="api-note-err">
                            Fetch · {profile.error.status || 'note'}: {profile.error.message}
                        </p>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- ── Row 0: Profile data (manual fill / corrections) ── -->
        <section class="data-panel">
            <h2 class="band-title">Profile data</h2>
            <div class="data-grid">
                <label class="field">
                    <span>Platform</span>
                    <select value={profile.platform ?? ''} onchange={(e) => setPlatform(e.currentTarget.value || null)}>
                        <option value="">None</option>
                        {#each PLATFORM_KEYS as p}
                            <option value={p}>{PLATFORMS[p].label}</option>
                        {/each}
                    </select>
                </label>
                <label class="field">
                    <span>Display name</span>
                    <input type="text" bind:value={profile.displayName} />
                </label>
                <label class="field">
                    <span>Handle</span>
                    <input type="text" bind:value={profile.handle} oninput={() => (profile.url = profileUrl(profile.platform, profile.handle))} />
                </label>
                <label class="field">
                    <span>Location</span>
                    <input type="text" bind:value={profile.fields.location} />
                </label>
                <label class="field">
                    <span>Link</span>
                    <input type="text" bind:value={profile.fields.link} placeholder="https://…" />
                </label>
                <div class="field">
                    <span>Avatar</span>
                    <div class="avatar-controls">
                        <label class="file-btn">
                            <i class="fa-solid fa-upload"></i> Upload
                            <input type="file" accept="image/*" onchange={onAvatar} />
                        </label>
                        {#if profile.avatarUrl}
                            <button type="button" class="mini-btn" onclick={clearAvatar}>Clear</button>
                        {/if}
                        <label class="verified-toggle">
                            <input type="checkbox" bind:checked={profile.verified} />
                            Verified
                        </label>
                    </div>
                </div>
                <label class="field field-wide">
                    <span>Bio</span>
                    <textarea bind:value={profile.bio} rows="2" placeholder="One or two lines about this profile…"></textarea>
                </label>
            </div>

            <div class="stats-editor">
                <div class="stats-head">
                    <span>Stats</span>
                    <button type="button" class="mini-btn" onclick={addStat}><i class="fa-solid fa-plus"></i> Add</button>
                </div>
                {#if profile.stats.length}
                    {#each profile.stats as stat, i}
                        <div class="stat-row">
                            <input type="text" bind:value={stat.label} aria-label="Stat label" placeholder="Label" />
                            <input type="text" bind:value={stat.value} aria-label="Stat value" placeholder="Value" />
                            <button type="button" class="mini-btn icon" aria-label="Remove stat" onclick={() => removeStat(i)}>
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    {/each}
                {:else}
                    <p class="stats-empty">No stats yet. Add followers, posts, subscribers, or any metric you like.</p>
                {/if}
            </div>
        </section>

        <!-- ── Row 1: Template | Style ── -->
        <div class="top-band">
            <section class="top-col">
                <h2 class="band-title">Template</h2>
                <div class="template-grid">
                    {#each templateKeys as key}
                        <button
                            class="template-btn"
                            class:active={config.template === key}
                            onclick={() => setTemplate(key)}
                        >
                            <span class="template-name">{TEMPLATES[key].label}</span>
                            <span class="template-hint">{TEMPLATES[key].hint}</span>
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
                                onclick={() => { config.palette = key; touched.palette = true; }}
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
                            onclick={() => { config.palette = 'custom'; touched.palette = true; }}
                        >
                            <span class="plt plt-custom"><i class="fa-solid fa-palette"></i></span>
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
                    </div>

                    <div class="style-row">
                        <label class="inline-field">
                            <span class="font-wrap">
                                <span class="font-tag">Font</span>
                                <select bind:value={config.font} class="font-select" onchange={() => (touched.font = true)}>
                                    {#each FONTS as f}
                                        <option value={f} style="font-family:'{f}'">{f}</option>
                                    {/each}
                                </select>
                            </span>
                        </label>

                        <span class="bg-toggle">
                            <span class="ver-label">Background</span>
                            <button
                                type="button"
                                class="seg-btn"
                                class:active={config.background.type === 'solid'}
                                onclick={() => { config.background = { ...config.background, type: 'solid' }; touched.background = true; }}
                            >Solid</button>
                            <button
                                type="button"
                                class="seg-btn"
                                class:active={config.background.type === 'gradient'}
                                onclick={() => { config.background = { ...config.background, type: 'gradient' }; touched.background = true; }}
                            >Gradient</button>
                        </span>
                    </div>
                </div>
            </section>
        </div>

        <!-- ── Row 2: Preview | controls ── -->
        <div class="workspace">
            <div class="preview-col">
                <div class="preview-pane" bind:this={paneEl} style="height:{PANE_HEIGHT}px">
                    <div class="preview-stage" style="width:{cardWidth * previewScale}px;height:{cardHeight * previewScale}px">
                        <div class="preview-scaled" style="transform:scale({previewScale});width:{previewBoxWidth}px;border-radius:{previewShadowRadius}px">
                            <ProfileCard bind:cardEl {profile} {config} />
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
                            <option value="auto">Auto (per template)</option>
                            {#each Object.keys(ASPECTS) as a}
                                <option value={a}>{a}</option>
                            {/each}
                        </select>
                    </label>

                    <div class="field">
                        <SnapSlider
                            label="Card padding"
                            unit="px"
                            bind:value={config.padding}
                            min={0} max={120} step={1}
                            notches={[0, 24, 48, 72, 96, 120]}
                            snapDistance={2}
                            baseline={TEMPLATES[config.template].defaultPadding ?? 0}
                            reset={() => { touched.padding = false; config.padding = TEMPLATES[config.template].defaultPadding ?? 0; }}
                            tune={() => (touched.padding = true)}
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
                            baseline={TEMPLATES[config.template].defaultRadius ?? 0}
                            reset={() => { touched.containerRadius = false; config.containerRadius = TEMPLATES[config.template].defaultRadius ?? 0; }}
                            tune={() => (touched.containerRadius = true)}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Avatar radius"
                            unit="%"
                            bind:value={config.avatarRadius}
                            min={0} max={50} step={1}
                            notches={[0, 12, 25, 50]}
                            snapDistance={2}
                            baseline={50}
                            reset={() => (config.avatarRadius = 50)}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Title size"
                            unit="×"
                            bind:value={config.titleScale}
                            min={0.6} max={1.6} step={0.05}
                            notches={[1]}
                            snapDistance={0.05}
                            baseline={1}
                            reset={() => { touched.titleScale = false; config.titleScale = 1; }}
                            tune={() => (touched.titleScale = true)}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Text size"
                            unit="×"
                            bind:value={config.textScale}
                            min={0.6} max={1.5} step={0.05}
                            notches={[0.8, 1, 1.25]}
                            snapDistance={0.05}
                            baseline={1}
                            reset={() => { touched.textScale = false; config.textScale = 1; }}
                            tune={() => (touched.textScale = true)}
                        />
                    </div>

                    <div class="field">
                        <SnapSlider
                            label="Stats shown"
                            unit=""
                            bind:value={config.statCount}
                            min={1} max={5} step={1}
                            notches={[1, 2, 3, 4, 5]}
                            snapDistance={0.4}
                            baseline={3}
                            reset={() => (config.statCount = 3)}
                        />
                    </div>

                    <div class="field" class:disabled={config.background.type !== 'gradient'}>
                        <SnapSlider
                            label="Gradient angle"
                            unit="°"
                            bind:value={config.background.angle}
                            min={0} max={360} step={5}
                            notches={[0, 45, 90, 135, 180, 225, 270, 315, 360]}
                            snapDistance={4}
                            baseline={135}
                            reset={() => (config.background = { ...config.background, angle: 135 })}
                            disabled={config.background.type !== 'gradient'}
                        />
                    </div>
                </div>
            </aside>
        </div>

        <!-- ── Row 3: Content | Export ── -->
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
                            <span class="module-label">{mod.label}</span>
                        </button>
                    {/each}
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
                        baseline={1280}
                        reset={() => (config.containerSize = 1280)}
                    />
                </div>
                <ExportBar {cardEl} filename={`${profile.handle || 'profile'}-${config.template}`} tool="profile-card" />
                <p class="card-note">
                    Export size is a pure scaling setting: the whole composition grows or shrinks proportionally and the preview stays fixed. The card file is named after the handle and template.
                </p>
            </aside>
        </div>
    </div>
{/if}

<style>
    /* Only this page's own elements (scoped), never the card component's */
    .launch,
    .launch *,
    .page-body,
    .page-body * { box-sizing: border-box; }

    /* ── Landing: the input sits in a frosted launcher over the embers ── */
    .launch {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: calc(100% - 2 * clamp(1.25rem, 4vw, 3rem));
        max-width: 760px;
        margin: 0 auto clamp(2.5rem, 6vh, 4rem);
        padding: clamp(1rem, 2.5vw, 1.4rem);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        box-shadow: 0 40px 120px -30px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }
    .input-row {
        display: flex;
        gap: 0.6rem;
        margin: 0;
    }
    .url-input {
        flex: 1;
        min-width: 0;
        padding: 0.8rem 0.9rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        outline: 0;
        background: rgba(255, 255, 255, 0.04);
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.95rem;
        transition: border-color 0.2s, background 0.2s;
    }
    .url-input::placeholder { color: rgba(255, 255, 255, 0.35); }
    .url-input:hover { border-color: rgba(255, 255, 255, 0.2); }
    .url-input:focus { border-color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.06); }
    .launch .gen-btn {
        font-family: var(--font-body);
        padding-block: 0.8rem;
        white-space: nowrap;
        cursor: pointer;
    }
    .launch .gen-btn:disabled { opacity: 0.6; cursor: progress; }

    .samples {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        flex-wrap: wrap;
    }
    .samples-label {
        margin-right: 0.3rem;
        font-family: var(--font-display);
        font-size: 0.72rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
    }
    .sample-chip {
        padding: 0.4rem 0.8rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        font-family: var(--font-body);
        font-size: 0.8rem;
        cursor: pointer;
        transition: color 0.2s, border-color 0.2s, background 0.2s;
    }
    .sample-chip:hover { color: #fff; border-color: rgba(255, 43, 31, 0.55); background: rgba(255, 43, 31, 0.1); }

    .error-msg {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin: 0;
        padding: 0.75rem 0.9rem;
        border: 1px solid rgba(255, 43, 31, 0.4);
        border-radius: 6px;
        background: rgba(255, 43, 31, 0.12);
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.88rem;
    }
    .error-msg i { color: var(--accent, #ff2b1f); }

    /* ── Editor body ── */
    .page-body {
        position: relative;
        z-index: 1;
        max-width: 1500px;
        margin: 0 auto;
        padding: 0 clamp(1.25rem, 4vw, 3rem) var(--space-4xl);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        scroll-margin-top: 2rem;
    }

    /* Frosted panel shared by every band of the editor */
    .top-col,
    .rail,
    .bottom-col,
    .data-panel {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .band-title,
    .rail h3 {
        margin: 0 0 1rem;
        font-family: var(--font-display);
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
    }
    .rail h3 { margin: 0; }

    .top-band {
        display: grid;
        grid-template-columns: 1.15fr 1fr;
        gap: 1.25rem;
    }
    .top-col {
        padding: var(--space-lg);
        min-width: 0;
    }

    /* Option tiles (layouts / templates) */
    .template-btn {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.65rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
        color: rgba(255, 255, 255, 0.75);
        text-align: left;
        cursor: pointer;
        transition: border-color 0.2s, color 0.2s, background 0.2s;
    }

    .style-rows {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .style-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-wrap: wrap;
        min-height: 2rem;
    }
    .palette-btn {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        min-width: 0;
        padding: 0.3rem 0.75rem 0.3rem 0.35rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: transparent;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
    }
    .palette-btn:hover { border-color: rgba(255, 255, 255, 0.3); }
    .palette-btn.active { background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }
    .palette-btn.active .palette-name { color: #fff; }
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
    .plt-dot { width: 0.35rem; height: 0.35rem; border-radius: 50%; }
    .plt-custom { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.7); font-size: 0.6rem; }
    .palette-name {
        font-family: var(--font-body);
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.7);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .color-inline { display: inline-flex; gap: 0.3rem; align-items: center; }
    .color-inline input[type='color'] {
        width: 1.6rem;
        height: 1.6rem;
        padding: 0.12rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.04);
        cursor: pointer;
    }

    .inline-field {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-family: var(--font-body);
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.75);
    }
    .font-wrap { position: relative; display: inline-block; max-width: 100%; }
    .font-wrap .font-select { padding-left: 3rem; display: block; min-width: 15rem; max-width: 100%; }
    .font-tag {
        position: absolute;
        left: 0.8rem;
        top: 50%;
        transform: translateY(-50%);
        font-family: var(--font-display);
        font-size: 0.6rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.5);
        pointer-events: none;
        z-index: 1;
    }
    .ver-label {
        margin-right: 0.3rem;
        font-family: var(--font-display);
        font-size: 0.62rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
    }

    /* Selects: same quiet filled field as the inputs, with a drawn chevron */
    .field select,
    .inline-field select {
        width: 100%;
        padding: 0.6rem 2.2rem 0.6rem 0.8rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        outline: 0;
        background: rgba(255, 255, 255, 0.04) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='white' stroke-opacity='.6' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 0.85rem center;
        -webkit-appearance: none;
        appearance: none;
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.88rem;
        cursor: pointer;
        transition: border-color 0.2s, background-color 0.2s;
    }
    .field select:hover,
    .inline-field select:hover { border-color: rgba(255, 255, 255, 0.2); }
    .field select:focus,
    .inline-field select:focus { border-color: rgba(255, 255, 255, 0.45); background-color: rgba(255, 255, 255, 0.06); }
    .field select option,
    .inline-field select option { background: #141414; color: #fff; }

    /* ── Preview | controls rail ── */
    .workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 1.25rem;
        align-items: stretch;
    }
    .preview-col {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    /* Stage: border (1px) and padding (16px) stay as they were, since the
       fit math (PANE_HEIGHT - 56) counts them. */
    .preview-pane {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        overflow: auto;
        display: flex;
        align-items: flex-start;
        padding: var(--space-md);
        max-height: 480px;
        box-sizing: border-box;
        background:
            radial-gradient(120% 90% at 50% 120%, rgba(255, 43, 31, 0.14), transparent 60%),
            repeating-conic-gradient(rgba(255, 255, 255, 0.025) 0% 25%, transparent 0% 50%) 0 0 / 24px 24px,
            #0a0a0a;
        box-shadow: 0 40px 120px -40px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        scrollbar-gutter: stable;
        position: relative;
    }

    /* The stage is centered in the pane (margin:auto) and the card is centered
       INSIDE the stage (flex centering), so while the stage's measured size
       lags one frame behind a padding change, the card still grows/shrinks
       around its own center instead of anchoring to the stage's top-left. */
    .preview-stage {
        position: relative;
        flex-shrink: 0;
        margin: auto;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .preview-scaled {
        /* origin center: the visual card shrinks/grows around its own center */
        transform-origin: center center;
        flex-shrink: 0;
        /* the preview drop shadow: the wrapper is never part of the export */
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
    }

    .rail {
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
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
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
        gap: 0.45rem;
        min-width: 0;
        font-family: var(--font-body);
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.75);
    }
    .field > span {
        display: block;
        font-weight: 500;
    }
    .field.disabled {
        pointer-events: none;
        /* opacity kept at 1: the SnapSlider dims its own track/input while
           the label stays readable on disabled fields */
    }

    /* ── Content | Export ── */
    .bottom-band {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 1.25rem;
        align-items: stretch;
    }
    .bottom-col {
        padding: var(--space-lg);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        min-width: 0;
    }
    .bottom-col .band-title { margin: 0; }

    /* Module toggles: pill chips, red when on */
    .module-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
    }
    .module-btn {
        display: inline-flex;
        align-items: center;
        padding: 0.45rem 0.9rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        font-family: var(--font-body);
        font-size: 0.85rem;
        cursor: pointer;
        transition: color 0.2s, background 0.2s, border-color 0.2s;
    }
    .module-btn:hover { color: #fff; border-color: rgba(255, 255, 255, 0.3); }
    .module-btn.active { color: #fff; background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }
    .module-btn:focus-visible { outline: 2px solid var(--accent, #ff2b1f); outline-offset: 2px; }

    .card-note {
        margin: 0;
        font-family: var(--font-body);
        font-size: 0.78rem;
        line-height: 1.55;
        color: rgba(255, 255, 255, 0.45);
    }

    /* Notice above the preview / editor */
    .api-note {
        display: flex;
        gap: var(--space-md);
        align-items: flex-start;
        padding: 0.9rem 1.1rem;
        border: 1px solid rgba(255, 43, 31, 0.4);
        border-radius: 10px;
        background: rgba(255, 43, 31, 0.1);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        font-family: var(--font-body);
    }
    .api-note > i { color: var(--accent, #ff2b1f); font-size: 1rem; margin-top: 0.15rem; }
    .api-note-body { flex: 1; min-width: 0; }
    .api-note-body strong { color: #fff; font-weight: 600; font-size: 0.9rem; }
    .api-note-body p { margin: 0.35rem 0 0; font-size: 0.8rem; line-height: 1.55; color: rgba(255, 255, 255, 0.68); }
    .api-note-err { color: #ff8a80 !important; word-break: break-word; }

    /* ── Profile data panel ── */
    .data-panel { padding: var(--space-lg); }
    .data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
    }
    .field-wide { grid-column: 1 / -1; }
    .data-panel .field input[type='text'],
    .data-panel .field textarea,
    .stat-row input {
        width: 100%;
        min-width: 0;
        padding: 0.6rem 0.8rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        outline: 0;
        background: rgba(255, 255, 255, 0.04);
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.88rem;
        transition: border-color 0.2s, background 0.2s;
    }
    .data-panel .field textarea { resize: vertical; line-height: 1.55; }
    .data-panel .field input[type='text']::placeholder,
    .data-panel .field textarea::placeholder,
    .stat-row input::placeholder { color: rgba(255, 255, 255, 0.35); }
    .data-panel .field input[type='text']:hover,
    .data-panel .field textarea:hover,
    .stat-row input:hover { border-color: rgba(255, 255, 255, 0.2); }
    .data-panel .field input[type='text']:focus,
    .data-panel .field textarea:focus,
    .stat-row input:focus { border-color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.06); }

    .avatar-controls {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        flex-wrap: wrap;
        min-height: 2.45rem;
    }
    .file-btn,
    .mini-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 0.85rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.85);
        font-family: var(--font-body);
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: color 0.2s, border-color 0.2s, background 0.2s;
    }
    .file-btn { color: #000; background: #fff; border-color: #fff; font-weight: 600; }
    .file-btn:hover { color: #fff; background: var(--accent, #ff2b1f); border-color: var(--accent, #ff2b1f); }
    .file-btn:focus-within { outline: 2px solid var(--accent, #ff2b1f); outline-offset: 2px; }
    .file-btn input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .mini-btn:hover { color: #fff; border-color: rgba(255, 255, 255, 0.45); }
    .mini-btn.icon { padding: 0.45rem 0.65rem; }
    .verified-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin-left: 0.3rem;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.75);
        cursor: pointer;
    }
    .verified-toggle input { accent-color: var(--accent, #ff2b1f); width: 0.95rem; height: 0.95rem; }

    .stats-editor {
        margin-top: 1.25rem;
        padding-top: 1.1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .stats-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.6rem;
        font-family: var(--font-display);
        font-size: 0.72rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
    }
    .stats-head .mini-btn { letter-spacing: 0; text-transform: none; }
    .stat-row {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }
    .stats-empty {
        margin: 0;
        font-family: var(--font-body);
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.45);
    }

    .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 0.4rem;
        align-items: stretch;
    }
    .template-btn:hover { color: #fff; border-color: rgba(255, 255, 255, 0.24); }
    .template-btn.active { color: #fff; background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }
    .template-name { font-family: var(--font-body); font-size: 0.85rem; font-weight: 600; }
    .template-hint { font-family: var(--font-body); font-size: 0.66rem; line-height: 1.35; color: rgba(255, 255, 255, 0.5); }
    .template-btn.active .template-hint { color: rgba(255, 255, 255, 0.7); }

    .palette-btn.active .plt-custom { color: #fff; }

    /* Solid / Gradient: a pill segmented control */
    .bg-toggle { display: inline-flex; align-items: center; gap: 0.35rem; }
    .seg-btn {
        padding: 0.4rem 0.85rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        font-family: var(--font-body);
        font-size: 0.8rem;
        cursor: pointer;
        transition: color 0.2s, background 0.2s, border-color 0.2s;
    }
    .seg-btn:hover { color: #fff; border-color: rgba(255, 255, 255, 0.3); }
    .seg-btn.active { color: #fff; background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }

    /* This tool keeps its own Content | Export proportions */
    .bottom-band { grid-template-columns: 1.15fr 1fr; align-items: start; }

    @media (max-width: 1100px) {
        .top-band,
        .workspace,
        .bottom-band { grid-template-columns: 1fr; }
        .rail { max-height: none; }
    }
    @media (max-width: 666px) {
        .input-row { flex-direction: column; }
        .font-wrap .font-select { min-width: 0; width: 100%; }
        .inline-field, .font-wrap { width: 100%; }
    }
</style>
