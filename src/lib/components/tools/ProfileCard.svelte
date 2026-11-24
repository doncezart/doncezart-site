<script>
    import { TEMPLATES, ASPECTS, DESIGN_WIDTH, resolveColors, naturalAspect } from './profile-config.js';
    import { PLATFORMS } from '$lib/data/social-platforms.js';

    let { profile, config, cardEl = $bindable() } = $props();

    const template = $derived(TEMPLATES[config.template] ?? TEMPLATES.ring);
    const colors = $derived(resolveColors(config));
    const platformMeta = $derived(profile?.platform ? PLATFORMS[profile.platform] : null);
    const platAccent = $derived(platformMeta?.accent ?? colors.accent);
    const platFg = $derived(String(platAccent).toLowerCase() === '#ffffff' ? '#0f0f0f' : '#ffffff');
    const FOLLOW_LABEL = { youtube: 'Subscribe', tiktok: 'Follow', instagram: 'Follow', x: 'Follow', twitch: 'Follow', github: 'Follow', facebook: 'Follow' };
    const followLabel = $derived(FOLLOW_LABEL[profile?.platform] ?? 'Follow');

    // Container design width + uniform zoom (every px metric scales by S).
    const LW = $derived(config.containerSize ?? DESIGN_WIDTH);
    const S = $derived(LW / DESIGN_WIDTH);
    const T = $derived(config.textScale ?? 1);

    const aspect = $derived(config.aspect === 'auto' ? naturalAspect(config) : (ASPECTS[config.aspect] ?? 16 / 9));

    const bgValue = $derived(
        config.background?.type === 'gradient'
            ? `linear-gradient(${config.background.angle ?? 135}deg, ${colors.accent}, ${colors.bg} 72%)`
            : colors.bg
    );

    const cssVars = $derived(
        `--pc-s:${S};--pc-t:${T};` +
        `--pc-font:'${config.font}',sans-serif;` +
        `--pc-bg:${colors.bg};--pc-text:${colors.text};--pc-secondary:${colors.secondary};--pc-accent:${colors.accent};` +
        `--pc-pad:${Math.round((config.padding ?? 0) * S)}px;` +
        `--pc-radius:${Math.round((config.containerRadius ?? 0) * S)}px;` +
        `--pc-avatar-radius:${config.avatarRadius ?? 50}%;` +
        `--pc-plat-accent:${platAccent};--pc-plat-fg:${platFg};` +
        `--pc-title-weight:${template.titleWeight ?? 600};` +
        `width:${LW}px;min-height:${Math.round(LW / aspect)}px;` +
        `background:${bgValue};`
    );

    const statItems = $derived((profile?.stats ?? []).slice(0, config.statCount ?? 3));

    const initials = $derived((() => {
        const src = String(profile?.displayName || profile?.handle || '?').trim();
        const parts = src.split(/\s+/).filter(Boolean);
        const chars = parts.length >= 2 ? [parts[0][0], parts[1][0]] : [parts[0]?.[0] ?? '?'];
        return chars.join('').toUpperCase();
    })());

    const prettyLink = $derived(
        (profile?.fields?.link || profile?.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
    );
</script>

<div bind:this={cardEl} class="pcard t-{config.template}" style={cssVars}>
    <div class="pc-inner">
        {#if config.template === 'ring'}
            <div class="ring-frame">{@render avatarEl()}</div>
            {@render nameEl()}
            {@render handleEl()}
            {@render bioEl()}
            {@render statsRow()}
            {@render footerEl()}
        {:else if config.template === 'minimal'}
            {@render avatarEl()}
            {@render nameEl()}
            {@render handleEl()}
            <div class="minimal-rule"></div>
            {@render bioEl()}
            {@render statsRow()}
        {:else if config.template === 'bold'}
            <div class="bold-top">
                {@render avatarEl()}
                {@render handleEl()}
            </div>
            {@render nameEl()}
            <div class="bold-spacer"></div>
            {@render bioEl()}
            {@render statsRow()}
        {:else if config.template === 'grid'}
            <div class="grid-head">
                <div class="grid-avatar">{@render avatarEl()}</div>
                <div class="grid-copy">
                    {@render nameEl()}
                    {@render handleEl()}
                    {@render bioEl()}
                    {@render footerEl()}
                </div>
            </div>
            {@render statsRow()}
        {:else if config.template === 'terminal'}
            <div class="term-head">
                <span class="term-path">~/profiles/</span>{@render handleEl()}
            </div>
            {@render nameEl()}
            {@render bioEl()}
            {@render statsRow()}
        {:else if config.template === 'instagram'}
            <div class="nv nv-ig">
                <div class="nv-top">
                    <div class="nv-ring">{@render avatarEl()}</div>
                    <div class="nv-id">
                        <div class="nv-username">@{profile.handle}</div>
                        {@render statsRow()}
                    </div>
                </div>
                {@render nameEl()}
                {@render bioEl()}
                {@render footerEl()}
                {@render followEl()}
            </div>
        {:else if config.template === 'tiktok'}
            <div class="nv nv-tiktok">
                <div class="nv-avatar-big">{@render avatarEl()}</div>
                <div class="nv-username">@{profile.handle}</div>
                {@render statsRow()}
                {@render bioEl()}
                {@render followEl()}
            </div>
        {:else if config.template === 'youtube'}
            <div class="nv nv-yt">
                {@render coverEl()}
                <div class="nv-body">
                    <div class="nv-avatar-overlap">{@render avatarEl()}</div>
                    {@render nameEl()}
                    <div class="nv-inline">{@render handleEl()}{@render statsRow()}</div>
                    {@render bioEl()}
                    {@render followEl()}
                </div>
            </div>
        {:else if config.template === 'x'}
            <div class="nv nv-x">
                {@render coverEl()}
                <div class="nv-body">
                    <div class="nv-avatar-overlap">{@render avatarEl()}</div>
                    {@render nameEl()}
                    {@render handleEl()}
                    {@render bioEl()}
                    {@render footerEl()}
                    {@render statsRow()}
                    {@render followEl()}
                </div>
            </div>
        {:else if config.template === 'twitch'}
            <div class="nv nv-twitch">
                {@render coverEl()}
                <div class="nv-body">
                    <div class="nv-avatar-overlap">{@render avatarEl()}</div>
                    {@render nameEl()}
                    {@render handleEl()}
                    {@render statsRow()}
                    {@render bioEl()}
                    {@render followEl()}
                </div>
            </div>
        {:else if config.template === 'github'}
            <div class="nv nv-github">
                <div class="nv-top">
                    <div class="nv-avatar-lg">{@render avatarEl()}</div>
                    <div class="nv-id">
                        {@render nameEl()}
                        {@render handleEl()}
                    </div>
                </div>
                {@render bioEl()}
                {@render statsRow()}
                {@render footerEl()}
                {@render followEl()}
            </div>
        {/if}
    </div>
</div>

<!-- ── Shared snippets ─────────────────────────────────────────────────────── -->

{#snippet avatarEl()}
    {#if config.modules.avatar}
        <div class="pc-avatar">
            {#if profile?.avatarUrl}
                <img
                    src={profile.avatarUrl}
                    alt=""
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                    loading="eager"
                    onerror={(e) => (e.currentTarget.style.display = 'none')}
                />
            {:else}
                <span class="pc-monogram">{initials}</span>
            {/if}
        </div>
    {/if}
{/snippet}

{#snippet nameEl()}
    {#if config.modules.name && profile?.displayName}
        <div class="pc-name">
            <span>{profile.displayName}</span>
            {#if config.modules.verified && profile.verified}
                <span class="pc-verified"><i class="fa-solid fa-check"></i></span>
            {/if}
        </div>
    {/if}
{/snippet}

{#snippet handleEl()}
    {#if config.modules.handle && profile?.handle}
        <div class="pc-handle">
            {#if config.modules.platform && platformMeta}
                <i class="{platformMeta.icon} pc-plat"></i>
            {/if}
            <span>@{profile.handle}</span>
        </div>
    {/if}
{/snippet}

{#snippet bioEl()}
    {#if config.modules.bio && profile?.bio}
        <div class="pc-bio">{profile.bio}</div>
    {/if}
{/snippet}

{#snippet statsRow()}
    {#if config.modules.stats && statItems.length}
        <div class="pc-stats">
            {#each statItems as s}
                <div class="pc-stat">
                    <span class="pc-stat-value">{s.value}</span>
                    <span class="pc-stat-label">{s.label}</span>
                </div>
            {/each}
        </div>
    {/if}
{/snippet}

{#snippet footerEl()}
    {#if (config.modules.location && profile?.fields?.location) || (config.modules.link && prettyLink)}
        <div class="pc-footer">
            {#if config.modules.location && profile?.fields?.location}
                <span class="pc-foot-item"><i class="fa-solid fa-location-dot"></i> {profile.fields.location}</span>
            {/if}
            {#if config.modules.link && prettyLink}
                <span class="pc-foot-item"><i class="fa-solid fa-link"></i> {prettyLink}</span>
            {/if}
        </div>
    {/if}
{/snippet}

{#snippet coverEl()}
    <div class="nv-cover" style={profile?.bannerUrl ? `background-image:url('${profile.bannerUrl}')` : ''}></div>
{/snippet}

{#snippet followEl()}
    <div class="nv-follow-wrap"><span class="nv-follow">{followLabel}</span></div>
{/snippet}

<style>
    .pcard {
        font-family: var(--pc-font, sans-serif);
        color: var(--pc-text);
        overflow: hidden;
        position: relative;
        /* content-box: padding is an OUTER frame; the design width belongs to the content */
        padding: var(--pc-pad);
        border-radius: var(--pc-radius);
        line-height: 1.3;
        display: flex;
    }
    .pc-inner {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: calc(22px * var(--pc-s));
    }

    /* ── Shared leaf styles ── */
    .pc-avatar {
        width: calc(260px * var(--pc-s));
        height: calc(260px * var(--pc-s));
        border-radius: var(--pc-avatar-radius);
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(127, 127, 127, 0.18);
    }
    .pc-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
    .pc-monogram {
        font-weight: 700;
        font-size: calc(70px * var(--pc-s) * var(--pc-t));
        opacity: 0.85;
    }

    .pc-name {
        font-size: calc(68px * var(--pc-s) * var(--pc-t));
        font-weight: var(--pc-title-weight);
        line-height: 1.08;
        letter-spacing: -0.01em;
        display: inline-flex;
        align-items: center;
        gap: calc(10px * var(--pc-s));
        min-width: 0;
    }
    .pc-name > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .pc-verified {
        width: calc(34px * var(--pc-s) * var(--pc-t));
        height: calc(34px * var(--pc-s) * var(--pc-t));
        border-radius: 50%;
        background: var(--pc-accent);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .pc-verified i {
        font-size: calc(18px * var(--pc-s) * var(--pc-t));
    }

    .pc-handle {
        font-size: calc(32px * var(--pc-s) * var(--pc-t));
        color: var(--pc-secondary);
        display: inline-flex;
        align-items: center;
        gap: calc(8px * var(--pc-s));
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    .pc-plat {
        color: var(--pc-accent);
        font-size: calc(22px * var(--pc-s) * var(--pc-t));
    }

    .pc-bio {
        font-size: calc(28px * var(--pc-s) * var(--pc-t));
        color: var(--pc-secondary);
        line-height: 1.45;
        max-width: 44ch;
    }

    .pc-stats {
        display: flex;
        align-items: center;
        gap: calc(56px * var(--pc-s));
    }
    .pc-stat {
        display: flex;
        flex-direction: column;
        gap: calc(4px * var(--pc-s));
    }
    .pc-stat-value {
        font-size: calc(58px * var(--pc-s) * var(--pc-t));
        font-weight: 700;
        line-height: 1;
    }
    .pc-stat-label {
        font-size: calc(20px * var(--pc-s) * var(--pc-t));
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--pc-secondary);
    }

    .pc-footer {
        display: flex;
        flex-wrap: wrap;
        gap: calc(24px * var(--pc-s));
        font-size: calc(24px * var(--pc-s) * var(--pc-t));
        color: var(--pc-secondary);
    }
    .pc-foot-item {
        display: inline-flex;
        align-items: center;
        gap: calc(8px * var(--pc-s));
        min-width: 0;
    }
    .pc-foot-item i {
        color: var(--pc-accent);
    }

    /* ── Gradient Ring ── */
    .t-ring .pc-inner {
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    .t-ring .ring-frame {
        padding: calc(10px * var(--pc-s));
        border-radius: calc(var(--pc-avatar-radius) + 4%);
        background: linear-gradient(140deg, var(--pc-accent), transparent 82%);
        margin-bottom: calc(20px * var(--pc-s));
    }
    .t-ring .ring-frame .pc-avatar {
        width: calc(320px * var(--pc-s));
        height: calc(320px * var(--pc-s));
    }
    .t-ring .pc-stats {
        justify-content: center;
        gap: calc(88px * var(--pc-s));
        margin-top: calc(24px * var(--pc-s));
    }
    .t-ring .pc-bio {
        max-width: 30ch;
    }

    /* ── Minimal ── */
    .t-minimal .pc-inner {
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    .t-minimal .pc-avatar {
        width: calc(300px * var(--pc-s));
        height: calc(300px * var(--pc-s));
        margin-bottom: calc(30px * var(--pc-s));
    }
    .t-minimal .minimal-rule {
        width: calc(160px * var(--pc-s));
        height: 2px;
        background: var(--pc-secondary);
        opacity: 0.4;
        margin: calc(30px * var(--pc-s)) 0;
    }
    .t-minimal .pc-bio {
        max-width: 34ch;
    }
    .t-minimal .pc-stats {
        margin-top: calc(30px * var(--pc-s));
        gap: calc(104px * var(--pc-s));
    }

    /* ── Bold Poster ── */
    .t-bold .pc-inner {
        justify-content: space-between;
    }
    .t-bold .bold-top {
        display: flex;
        align-items: center;
        gap: calc(18px * var(--pc-s));
    }
    .t-bold .pc-avatar {
        width: calc(96px * var(--pc-s));
        height: calc(96px * var(--pc-s));
    }
    .t-bold .pc-name {
        font-size: calc(150px * var(--pc-s) * var(--pc-t));
        text-transform: uppercase;
        letter-spacing: 0;
        line-height: 0.92;
    }
    .t-bold .pc-handle {
        font-size: calc(30px * var(--pc-s) * var(--pc-t));
        color: var(--pc-text);
        opacity: 0.7;
    }
    .t-bold .bold-spacer {
        flex: 1;
    }
    .t-bold .pc-bio {
        max-width: 60ch;
        color: var(--pc-text);
        opacity: 0.75;
    }
    .t-bold .pc-stats {
        gap: calc(64px * var(--pc-s));
        margin-top: calc(24px * var(--pc-s));
        padding-top: calc(28px * var(--pc-s));
        border-top: 2px solid var(--pc-accent);
    }
    .t-bold .pc-stat-value {
        font-size: calc(56px * var(--pc-s) * var(--pc-t));
    }

    /* ── Card Grid ── */
    .t-grid .pc-inner {
        gap: calc(36px * var(--pc-s));
    }
    .t-grid .grid-head {
        display: flex;
        align-items: center;
        gap: calc(40px * var(--pc-s));
        flex: 1;
        min-width: 0;
    }
    .t-grid .grid-avatar {
        flex-shrink: 0;
    }
    .t-grid .pc-avatar {
        width: calc(230px * var(--pc-s));
        height: calc(230px * var(--pc-s));
    }
    .t-grid .grid-copy {
        display: flex;
        flex-direction: column;
        gap: calc(12px * var(--pc-s));
        min-width: 0;
    }
    .t-grid .pc-stats {
        gap: calc(16px * var(--pc-s));
    }
    .t-grid .pc-stat {
        flex: 1;
        padding: calc(22px * var(--pc-s));
        border: 1px solid rgba(127, 127, 127, 0.35);
        background: rgba(127, 127, 127, 0.1);
        gap: calc(6px * var(--pc-s));
    }

    /* ── Terminal ── */
    .t-terminal {
        color: var(--pc-text);
    }
    .t-terminal .pc-inner {
        justify-content: center;
        gap: calc(16px * var(--pc-s));
    }
    .t-terminal .term-head {
        display: flex;
        align-items: center;
        gap: calc(10px * var(--pc-s));
        font-size: calc(34px * var(--pc-s) * var(--pc-t));
    }
    .t-terminal .term-path {
        color: var(--pc-accent);
    }
    .t-terminal .pc-handle {
        font-size: calc(26px * var(--pc-s) * var(--pc-t));
        color: var(--pc-text);
    }
    .t-terminal .pc-name {
        font-size: calc(118px * var(--pc-s) * var(--pc-t));
    }
    .t-terminal .pc-name::after {
        content: '_';
        color: var(--pc-accent);
        margin-left: calc(4px * var(--pc-s));
    }
    .t-terminal .pc-bio {
        max-width: 64ch;
    }
    .t-terminal .pc-stats {
        flex-direction: column;
        align-items: stretch;
        gap: calc(6px * var(--pc-s));
        margin-top: calc(16px * var(--pc-s));
    }
    .t-terminal .pc-stat {
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        border-bottom: 1px dashed rgba(127, 127, 127, 0.35);
        padding: calc(16px * var(--pc-s)) 0;
        gap: calc(20px * var(--pc-s));
    }
    .t-terminal .pc-stat-value {
        order: 2;
        color: var(--pc-accent);
        font-size: calc(52px * var(--pc-s) * var(--pc-t));
    }
    .t-terminal .pc-stat-label {
        order: 1;
    }

    /* ── Platform-native ("vanilla") templates ── */
    /* Content-light native cards sit their header block in the middle of the
       card so a short profile never reads as a mostly-empty canvas. */
    .pcard.t-instagram .pc-inner,
    .pcard.t-github .pc-inner,
    .pcard.t-tiktok .pc-inner { justify-content: center; }

    .nv {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: calc(20px * var(--pc-s));
    }
    .nv .pc-name { font-size: calc(62px * var(--pc-s) * var(--pc-t)); font-weight: 700; }
    .nv .pc-handle { font-size: calc(32px * var(--pc-s) * var(--pc-t)); }
    .nv .pc-bio { font-size: calc(30px * var(--pc-s) * var(--pc-t)); max-width: none; }
    .nv .pc-stat-value { font-size: calc(54px * var(--pc-s) * var(--pc-t)); font-weight: 700; }
    .nv .pc-stat-label { font-size: calc(20px * var(--pc-s) * var(--pc-t)); text-transform: none; letter-spacing: 0; }
    .nv .pc-avatar { width: calc(220px * var(--pc-s)); height: calc(220px * var(--pc-s)); }

    .nv-top { display: flex; align-items: center; gap: calc(28px * var(--pc-s)); }
    .nv-id { display: flex; flex-direction: column; gap: calc(10px * var(--pc-s)); min-width: 0; }
    .nv-username { font-size: calc(44px * var(--pc-s) * var(--pc-t)); font-weight: 600; }

    .nv-follow-wrap { margin-top: calc(10px * var(--pc-s)); }
    .nv-follow {
        display: inline-flex; align-items: center; justify-content: center;
        padding: calc(18px * var(--pc-s)) calc(56px * var(--pc-s));
        border-radius: 999px;
        background: var(--pc-plat-accent); color: var(--pc-plat-fg);
        font-size: calc(30px * var(--pc-s) * var(--pc-t)); font-weight: 600;
    }

    /* Instagram */
    .nv-ig .nv-ring {
        padding: calc(6px * var(--pc-s));
        border-radius: 50%;
        background: linear-gradient(135deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5);
        flex-shrink: 0;
    }
    .nv-ig .nv-ring .pc-avatar {
        width: calc(300px * var(--pc-s)); height: calc(300px * var(--pc-s));
        border-radius: 50%; border: calc(4px * var(--pc-s)) solid var(--pc-bg);
    }
    .nv-ig .pc-stats { gap: calc(44px * var(--pc-s)); }
    .nv-ig .pc-name { font-size: calc(52px * var(--pc-s) * var(--pc-t)); font-weight: 600; }
    .nv-ig .pc-stat-value { font-size: calc(46px * var(--pc-s) * var(--pc-t)); }
    .nv-ig .nv-follow { background: #0095f6; color: #fff; }

    /* TikTok */
    .nv-tiktok { align-items: center; text-align: center; }
    .nv-tiktok .nv-avatar-big .pc-avatar { width: calc(320px * var(--pc-s)); height: calc(320px * var(--pc-s)); }
    .nv-tiktok .nv-username { font-size: calc(50px * var(--pc-s) * var(--pc-t)); font-weight: 700; }
    .nv-tiktok .pc-stats { gap: calc(90px * var(--pc-s)); justify-content: center; }
    .nv-tiktok .pc-bio { max-width: 34ch; }
    .nv-tiktok .nv-follow { background: #fe2c55; color: #fff; }

    /* Cover templates (YouTube / X / Twitch) */
    .nv-cover { width: 100%; height: calc(200px * var(--pc-s)); background-size: cover; background-position: center; }
    .nv-yt .nv-cover { height: calc(220px * var(--pc-s)); background-image: linear-gradient(110deg, #ff0000, #7a0000); }
    .nv-x .nv-cover { background-image: linear-gradient(110deg, #22303c, #0f1419); }
    .nv-twitch .nv-cover { background-image: linear-gradient(110deg, #9146ff, #4b2a8a); }

    .nv-body { display: flex; flex-direction: column; gap: calc(12px * var(--pc-s)); padding: calc(36px * var(--pc-s)); }
    .nv-avatar-overlap .pc-avatar {
        width: calc(210px * var(--pc-s)); height: calc(210px * var(--pc-s));
        border: calc(8px * var(--pc-s)) solid var(--pc-bg);
        margin-top: calc(-120px * var(--pc-s));
    }
    .nv-inline { display: flex; align-items: center; gap: calc(28px * var(--pc-s)); flex-wrap: wrap; }
    .nv-inline .pc-stats { gap: calc(28px * var(--pc-s)); }
    .nv-x .pc-stats, .nv-twitch .pc-stats { gap: calc(44px * var(--pc-s)); }

    /* GitHub */
    .nv-github .pc-avatar { width: calc(260px * var(--pc-s)); height: calc(260px * var(--pc-s)); }
    .nv-github .pc-stats { gap: calc(44px * var(--pc-s)); }
    .nv-github .nv-follow { background: transparent; color: var(--pc-text); border: calc(2px * var(--pc-s)) solid rgba(127, 127, 127, 0.5); }
</style>
