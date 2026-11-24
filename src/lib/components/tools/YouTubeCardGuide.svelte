<script>
    // Everything below the YouTube Card Generator, kept short: steps, layouts,
    // sizing, editors, AI + API reference, FAQ. Steps and FAQ also feed the
    // page's structured data.
    import { LAYOUTS, FONTS, PALETTES, ASPECTS, FRAME_PRESETS } from './yt-config.js';
    import { MODULE_KEYS, FORMATS } from './yt-api.js';
    import { TUTORIAL_ID, STEPS, FAQ } from './yt-guide-data.js';

    let { origin } = $props();

    const endpoint = $derived(`${origin}/api/youtube/card`);

    const TOC = [
        { id: 'tutorial', label: 'Tutorial' },
        { id: 'how-to', label: 'How it works' },
        { id: 'layouts', label: 'Layouts' },
        { id: 'sizing', label: 'Sizing' },
        { id: 'editors', label: 'In your editor' },
        { id: 'api', label: 'AI & API' },
        { id: 'faq', label: 'FAQ' }
    ];

    const LAYOUT_INFO = {
        classic: 'Today’s home page card: thumbnail, avatar, title, channel, views.',
        compact: 'The pre-2020 grid: square corners, no avatar.',
        upnext: 'The sidebar next to a video. A small, wide strip.',
        split: 'A search result row with the description. Great as a lower third.',
        watch: 'The player, title, channel and Subscribe button, plus the description box.',
        embed: 'A video embedded on a site, with the red play button.',
        hero: 'Title over the thumbnail. Big and bold.',
        underlay: 'The poster, with the title underneath instead of on top.'
    };

    const EDITORS = [
        ['Premiere Pro', 'Drop the PNG on a track above your footage. Keep Scale at 100 (Preferences › Media › Default Media Scaling: None).'],
        ['DaVinci Resolve', 'Resolve scales images to fit by default. Set Inspector › Retime and Scaling › Scaling to “Center crop with no resizing”.'],
        ['Final Cut Pro', 'Connect it above the storyline and set Spatial Conform › Type to None.'],
        ['After Effects', 'Imports at its real size. Animate Position, Scale and Opacity.'],
        ['CapCut', 'Add it as an overlay; it gets fitted to the canvas, so scale it back using the guides as reference.']
    ];

    const list = (a) => a.map((v) => `<code>${v}</code>`).join(' ');
    /** [name, values (HTML), what it does] */
    const PARAMS = [
        ['url', 'YouTube link or id', '<strong>Required.</strong>'],
        ['layout', list(Object.keys(LAYOUTS)), 'Default <code>classic</code>.'],
        ['frame', list(Object.keys(FRAME_PRESETS)) + ' or <code>1920x1080</code>', 'The video the card goes on. Default <code>1080p</code>.'],
        ['size', '2 – 100', 'Card width as % of the frame width. Default <code>50</code>.'],
        ['width', '160 – 3840', 'Exact card width in px instead of <code>size</code>.'],
        ['format', list(FORMATS), 'Default <code>png</code>.'],
        ['palette', list(Object.keys(PALETTES)), 'Theme. Default <code>dark</code>. Override single colours with <code>bg</code>, <code>text</code>, <code>secondary</code>, <code>accent</code> (hex).'],
        ['font', FONTS.join(', '), 'Default <code>Roboto</code>.'],
        ['show, hide', list(MODULE_KEYS), 'Comma-separated parts, e.g. <code>show=verified,subscribers</code>.'],
        ['aspect', list(['auto', ...Object.keys(ASPECTS)]), 'Force a card shape.'],
        ['titleScale, textScale', '0.8 – 1.6, 0.5 – 1.5', 'Text size multipliers.'],
        ['titleLines, descriptionLines', '1 – 3', 'Line limits.'],
        ['padding, cardRadius, radius', '0 – 80, 0 – 128, 0 – 72', 'Frame, card corners, thumbnail corners.'],
        ['thumbGap, columnGap, textGap', '0 – 80', 'Spacing below the thumbnail, beside it, and between lines.'],
        ['ratio, scrim', '25 – 85, 30 – 100', 'Search result thumbnail share; poster fade strength.'],
        ['dateFormat, verified', list(['relative', 'absolute']) + ', ' + list(['gray', 'white', 'accent']) + ' or hex', 'Date style; verified tick colour.'],
        ['download', '<code>1</code>', 'Send as a file download.']
    ];

    const aiPrompt = $derived(`Make YouTube cards with this free image API (no key):
${endpoint}?url=<YouTube link>
When I send a YouTube link, put it in url and show me the image.`);

    const examples = $derived([
        { label: 'URL', code: `${endpoint}?url=https://youtu.be/dQw4w9WgXcQ&layout=watch&frame=4k&size=30` },
        {
            label: 'JavaScript',
            code: `const res = await fetch('${endpoint}', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: 'https://youtu.be/dQw4w9WgXcQ', layout: 'upnext', frame: '1080p', size: 35 })
});
if (!res.ok) throw new Error((await res.json()).error);
const image = await res.blob();`
        }
    ]);

    let copied = $state('');
    async function copy(key, text) {
        try {
            await navigator.clipboard.writeText(text);
            copied = key;
            setTimeout(() => (copied = ''), 2000);
        } catch { /* clipboard blocked: the text is still selectable */ }
    }
</script>

<div class="guide">
    <nav class="toc" aria-label="On this page">
        <span class="toc-title">On this page</span>
        {#each TOC as t}<a href="#{t.id}">{t.label}</a>{/each}
    </nav>

    <article class="article">
        <section id="tutorial">
            <h2>Video tutorial</h2>
            <div class="video">
                {#if TUTORIAL_ID}
                    <iframe src="https://www.youtube-nocookie.com/embed/{TUTORIAL_ID}" title="How to use the YouTube Card Generator" loading="lazy"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                {:else}
                    <div class="video-soon">
                        <i class="fa-brands fa-youtube"></i>
                        <b>Tutorial coming soon</b>
                    </div>
                {/if}
            </div>
            <p class="lead">
                Turn any YouTube link into a card that looks exactly like YouTube, sized for your video, ready to drop on your timeline.
                Free, no account, no watermark.
            </p>
        </section>

        <section id="how-to">
            <h2>How it works</h2>
            <ol class="steps">
                {#each STEPS as st, i}
                    <li><span class="step-n">{i + 1}</span><div><h3>{st.name}</h3><p>{st.text}</p></div></li>
                {/each}
            </ol>
        </section>

        <section id="layouts">
            <h2>Layouts</h2>
            <div class="table">
                {#each Object.entries(LAYOUTS) as [key, l]}
                    <div class="row"><b>{l.label}</b><span>{LAYOUT_INFO[key]}</span></div>
                {/each}
            </div>
            <p>Every layout uses YouTube’s real sizes and spacing, scaled together, in Light, Dark, OLED or your own colours and nine fonts.</p>
        </section>

        <section id="sizing">
            <h2>Sizing for your video</h2>
            <ul>
                <li><strong>Frame</strong>: pick 720p, 1080p, 1440p, 4K, Vertical or Square above the preview, type a resolution, or drag the frame’s corner.</li>
                <li><strong>Size</strong>: the card is a % of the frame width. <strong>50%</strong> is the default; it stays 50% when you change the frame.</li>
                <li><strong>Move and resize</strong>: drag the card, or any corner (handles appear when you get close). Arrow keys nudge it.</li>
                <li><strong>Snapping</strong>: edges and centre snap to the frame edges, centre lines and padding. Hold Alt to place freely. Set the padding with the magnet button (5% action-safe, 10% title-safe).</li>
            </ul>
            <p>The download is exactly the size shown under the preview, so at 100% scale it matches what you planned.</p>
        </section>

        <section id="editors">
            <h2>In your editor</h2>
            <div class="table">
                {#each EDITORS as [n, t]}<div class="row"><b>{n}</b><span>{t}</span></div>{/each}
            </div>
            <p>Tip: add a soft shadow and a quick scale-in or slide-up (under half a second), and keep it on screen about 3 seconds.</p>
        </section>

        <section id="api">
            <h2>Use with AI, or the API</h2>
            <p>
                Every card is a URL with no key, so ChatGPT, Claude, your own agent or an automation (n8n, Zapier, Make) can make them.
                The <strong>Use with AI</strong> tab gives you a prompt with your exact style. This general one works too:
            </p>
            {@render codeBlock('Prompt', aiPrompt)}

            <h3>Reference</h3>
            <div class="endpoint"><span class="method">GET</span><code>{endpoint}?url=…</code></div>
            <p>Or <strong>POST</strong> the same keys as JSON. CORS is open. Unknown or out-of-range values return a 400 that names the problem.</p>
            <div class="params">
                {#each PARAMS as [name, values, desc]}
                    <div class="param">
                        <div class="param-name"><code>{name}</code></div>
                        <div class="param-body"><div class="param-values">{@html values}</div><p>{@html desc}</p></div>
                    </div>
                {/each}
            </div>
            {#each examples as ex}{@render codeBlock(ex.label, ex.code)}{/each}
            <ul>
                <li><strong>Responses</strong>: 200 with the image (<code>x-card-width</code>, <code>x-card-height</code> headers), 400 bad input, 404 private or missing video, 429 rate limited (<code>retry-after</code>).</li>
                <li><strong>Limits</strong>: 10 cards a minute, 120 an hour per IP. Repeats come from a 15-minute cache. Need more? <a href="/contact">Get in touch</a>.</li>
            </ul>
        </section>

        <section id="faq">
            <h2>FAQ</h2>
            <div class="faq">
                {#each FAQ as [q, a]}
                    <details><summary>{q}<i class="fa-solid fa-plus"></i></summary><p>{a}</p></details>
                {/each}
            </div>
        </section>
    </article>
</div>

{#snippet codeBlock(label, code)}
    <div class="example">
        <div class="example-head">
            <span>{label}</span>
            <button class="copy" onclick={() => copy(label, code)}>
                <i class="fa-solid {copied === label ? 'fa-check' : 'fa-copy'}"></i>{copied === label ? 'Copied' : 'Copy'}
            </button>
        </div>
        <pre><code>{code}</code></pre>
    </div>
{/snippet}

<style>
    .guide,
    .guide * { box-sizing: border-box; }

    .guide {
        display: grid;
        grid-template-columns: 14rem minmax(0, 62rem);
        justify-content: center;
        gap: 1.5rem;
        max-width: 1500px;
        margin: 0 auto var(--space-4xl);
        padding: 0 clamp(1.25rem, 4vw, 3rem);
        align-items: start;
    }

    .toc {
        position: sticky;
        top: 5.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        padding: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        font-family: var(--font-body);
    }
    .toc-title {
        margin-bottom: 0.5rem;
        font-family: var(--font-display);
        font-size: 0.68rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.5);
    }
    .toc a {
        border-bottom: 0;
        padding: 0.32rem 0.55rem;
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.65);
        font-size: 0.84rem;
        text-decoration: none;
        transition: color 0.2s, background 0.2s;
    }
    .toc a:hover { color: #fff; background: rgba(255, 43, 31, 0.12); }

    .article {
        min-width: 0;
        padding: clamp(1.5rem, 4vw, 2.75rem);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 2.25rem 0;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        scroll-margin-top: 6rem;
    }
    section:first-child { padding-top: 0; border-top: 0; }
    section:last-child { padding-bottom: 0; }

    h2 {
        margin: 0 0 0.2rem;
        font-family: var(--font-display);
        font-size: clamp(1.3rem, 2.2vw, 1.6rem);
        font-weight: 600;
        color: #fff;
    }
    h3 {
        margin: 0.6rem 0 0;
        font-family: var(--font-body);
        font-size: 1.02rem;
        font-weight: 600;
        color: #fff;
    }
    p, li {
        margin: 0;
        font-family: var(--font-body);
        font-size: 0.96rem;
        line-height: 1.7;
        color: var(--muted, rgba(255, 255, 255, 0.68));
    }
    ul, ol { display: flex; flex-direction: column; gap: 0.5rem; margin: 0; padding-left: 1.2rem; }
    li::marker { color: var(--accent, #ff2b1f); }
    strong, b { color: #fff; font-weight: 600; }
    code {
        padding: 0.1em 0.4em;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.85em;
        color: #fff;
        overflow-wrap: anywhere;
    }
    a { color: #fff; text-decoration: none; border-bottom: 1px solid rgba(255, 255, 255, 0.3); transition: border-color 0.2s; }
    a:hover { border-color: var(--accent, #ff2b1f); }

    /* Video */
    .video {
        position: relative;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        background:
            radial-gradient(110% 80% at 50% 115%, rgba(255, 43, 31, 0.18), transparent 60%),
            radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1.2px) 0 0 / 22px 22px,
            #0a0a0a;
    }
    .video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .video-soon {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 1.5rem;
        text-align: center;
        font-family: var(--font-body);
    }
    .video-soon i { font-size: 3rem; color: #ff2b1f; }
    .video-soon b { font-size: 1.05rem; }
    .lead { font-size: 1.02rem; color: rgba(255, 255, 255, 0.8); }

    /* Steps */
    .steps { list-style: none; padding: 0; gap: 0.75rem; }
    .steps li {
        display: flex;
        gap: 1rem;
        padding: 1rem 1.1rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.02);
    }
    .steps h3 { margin: 0 0 0.25rem; }
    .step-n {
        flex-shrink: 0;
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border-radius: 999px;
        background: rgba(255, 43, 31, 0.16);
        border: 1px solid rgba(255, 43, 31, 0.55);
        font-family: var(--font-display);
        font-size: 0.85rem;
        color: #fff;
    }

    /* Tables */
    .table { display: flex; flex-direction: column; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; overflow: hidden; }
    .table .row {
        display: grid;
        grid-template-columns: 11rem minmax(0, 1fr);
        gap: 1rem;
        padding: 0.65rem 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-family: var(--font-body);
        font-size: 0.9rem;
        line-height: 1.55;
        color: var(--muted, rgba(255, 255, 255, 0.68));
    }
    .table .row:first-child { border-top: 0; }
    .table .row:nth-child(odd) { background: rgba(255, 255, 255, 0.02); }

    /* FAQ */
    .faq { display: flex; flex-direction: column; gap: 0.5rem; }
    details {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.02);
    }
    details[open] { border-color: rgba(255, 43, 31, 0.35); }
    summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 0.9rem 1.1rem;
        font-family: var(--font-body);
        font-size: 0.96rem;
        font-weight: 500;
        color: #fff;
        cursor: pointer;
        list-style: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary i { font-size: 0.75rem; color: #ff2b1f; transition: transform 0.2s; }
    details[open] summary i { transform: rotate(45deg); }
    details p { padding: 0 1.1rem 1rem; }

    /* API */
    .endpoint {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.8rem 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.35);
    }
    .endpoint code { padding: 0; background: none; font-size: 0.82rem; }
    .method {
        flex-shrink: 0;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        background: rgba(255, 43, 31, 0.16);
        border: 1px solid rgba(255, 43, 31, 0.55);
        font-family: var(--font-body);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: #fff;
    }
    .params { display: flex; flex-direction: column; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; overflow: hidden; }
    .param {
        display: grid;
        grid-template-columns: 13rem 1fr;
        gap: 1rem;
        padding: 0.8rem 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .param:first-child { border-top: 0; }
    .param:nth-child(odd) { background: rgba(255, 255, 255, 0.02); }
    .param-name code { background: none; padding: 0; color: #fff; font-weight: 700; }
    .param-body { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .param-values { font-family: var(--font-body); font-size: 0.8rem; line-height: 1.8; color: rgba(255, 255, 255, 0.85); }
    .param-values :global(code) { margin-right: 0.15rem; }
    .param-body p { font-size: 0.88rem; line-height: 1.6; }

    .example { border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; background: rgba(0, 0, 0, 0.4); overflow: hidden; }
    .example-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.6rem 0.5rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        font-family: var(--font-body);
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.6);
    }
    .copy {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.7rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        background: none;
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.75rem;
        cursor: pointer;
        transition: border-color 0.2s;
    }
    .copy:hover { border-color: rgba(255, 43, 31, 0.6); }
    pre { margin: 0; padding: 1rem; overflow-x: auto; }
    pre code { padding: 0; background: none; font-size: 0.8rem; line-height: 1.65; color: rgba(255, 255, 255, 0.88); overflow-wrap: normal; white-space: pre; }

    @media (max-width: 1100px) {
        .guide { grid-template-columns: minmax(0, 1fr); }
        .toc { position: static; flex-direction: row; flex-wrap: wrap; gap: 0.3rem; }
        .toc-title { width: 100%; margin-bottom: 0.2rem; }
        .toc a { border-bottom: 1px solid rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 999px; font-size: 0.78rem; }
    }
    @media (max-width: 700px) {
        .table .row, .param { grid-template-columns: minmax(0, 1fr); gap: 0.3rem; }
    }
</style>
