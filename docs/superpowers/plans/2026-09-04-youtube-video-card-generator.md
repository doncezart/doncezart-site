# YouTube Video Card Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/tools/youtube-card` — paste a YouTube URL, get a customizable, exportable video reference card (8 layouts, 4 palettes, 9 font families, full module toggles, PNG/JPEG/WebP/clipboard export), backed by YouTube Data API v3 with an oEmbed + `i.ytimg.com` no-key fallback.

**Architecture:** Server endpoint `/api/youtube/info` (rate-limited, cached, key-protected) returns normalized video data. The client renders the card DOM at a 1280px design width inside a scaled preview; html2canvas captures it for export. All customization state lives in a single Svelte 5 `$state` config object.

**Spec:** `docs/superpowers/specs/2026-09-04-youtube-video-card-generator-design.md`

---

## File Map

| File | Change |
|---|---|
| `src/lib/server/youtube.js` | **New** — id extraction, Data API + oEmbed fetchers, duration parse, formatters, TTL cache |
| `src/routes/api/youtube/info/+server.js` | **New** — rate-limited GET endpoint |
| `src/lib/components/tools/YouTubeCard.svelte` | **New** — 8-layout card renderer |
| `src/lib/components/tools/controls/ExportBar.svelte` | **New** — format/size/actions |
| `src/routes/tools/youtube-card/+page.svelte` | **New** — tool page, state, control panel |
| `.env.example`, `.env` | Add optional `YOUTUBE_API_KEY` |
| `src/routes/+layout.svelte` (or tool page) | Google Fonts links for the tool page only |
| `src/routes/tools/+page.svelte` | unchanged (registry-driven) |

No DB changes. No new npm deps.

---

## Task 1: Server — `src/lib/server/youtube.js`

**Files:**
- New: `src/lib/server/youtube.js`

- [ ] **Step 1: Video id extraction + URL validation**

  ```js
  // src/lib/server/youtube.js
  const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

  export function extractVideoId(input) {
      if (YT_ID_RE.test(input)) return input;
      const patterns = [
          /(?:youtube\.com\/watch\?(?:.*&)?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
          /youtube\.com\/watch\?([^#]*&)?v=([A-Za-z0-9_-]{11})/
      ];
      for (const re of patterns) {
          const m = input.match(re);
          if (m) return m[1] ?? m[2];
      }
      return null;
  }
  ```

- [ ] **Step 2: ISO-8601 duration parser**

  ```js
  // "PT1H2M3S" / "PT3M32S" / "PT45S" → seconds + formatted strings
  export function parseIsoDuration(iso) {
      const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
      if (!m) return null;
      const h = +m[1] || 0, min = +m[2] || 0, s = +m[3] || 0;
      const total = h * 3600 + min * 60 + s;
      const pad = (n) => String(n).padStart(2, '0');
      return {
          seconds: total,
          formatted: h ? `${h}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`
      };
  }
  ```

- [ ] **Step 3: Formatters (views, relative date)**

  ```js
  export function formatViews(n) {
      if (n == null) return null;
      return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  }

  export function relativeDate(iso) {
      const then = new Date(iso).getTime();
      if (Number.isNaN(then)) return null;
      const days = Math.floor((Date.now() - then) / 86400000);
      if (days <= 0) return 'today';
      if (days === 1) return 'yesterday';
      if (days < 7) return `${days} days ago`;
      if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
      if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
      return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
  }
  ```

- [ ] **Step 4: Thumbnail chain from video id (no-key path)**

  ```js
  export function ytThumbnails(id) {
      return {
          maxres: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          sd: `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
          hq: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      };
  }
  ```

- [ ] **Step 5: oEmbed fetch (no-key fallback)**

  ```js
  async function fetchOembed(url) {
      const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (!r.ok) return null;
      const j = await r.json();
      const id = extractVideoId(url);
      return {
          id, source: 'oembed', title: j.title, description: null,
          thumbnails: ytThumbnails(id), duration: null,
          channel: j.author_name ? { id: null, name: j.author_name, avatarUrl: null } : null,
          views: null, publishedAt: null
      };
  }
  ```

  Note: oEmbed never returns description/duration/avatar — the editor must gracefully hide those modules (they're already toggleable; when missing they auto-hide).

- [ ] **Step 6: Data API fetch + in-memory cache**

  ```js
  const cache = new Map(); // videoId → { data, expires }
  const CACHE_TTL = 30 * 60 * 1000;

  export async function fetchYouTubeVideoInfo(url) {
      const id = extractVideoId(url || '');
      if (!id) throw new HttpError(400, 'Could not find a YouTube video id in that URL.');
      const cached = cache.get(id);
      if (cached && cached.expires > Date.now()) return cached.data;

      const apiKey = process.env.YOUTUBE_API_KEY;
      let data = null;
      if (apiKey) {
          try { data = await fetchDataApi(id, apiKey); } catch (e) { if (e.status === 404) throw e; /* fall through to oEmbed */ }
      }
      if (!data) data = await fetchOembed(url);

      cache.set(id, { data, expires: Date.now() + CACHE_TTL });
      return data;
  }
  ```

  `fetchDataApi` calls `videos.list?part=snippet,contentDetails,statistics` then, if `snippet.channelId` exists, `channels.list?part=snippet&id=…` for the avatar. Thumbnail preference: API-provided `maxres` → `standard` → `high` → `medium`, falling back to the constructed chain. Duration also uses API `contentDetails.duration`. Empty API response → throw 404 "video not found". **Note:** uses global `fetch` (Node 22+).

- [ ] **Step 7: `HttpError` helper**

  ```js
  export class HttpError extends Error {
      constructor(status, message) { super(message); this.status = status; }
  }
  ```

- [ ] **Step 8: Verify**

  ```bash
  cd /home/cezar/doncezart && node -e "import('./src/lib/server/youtube.js').then(async m => { console.log(m.extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=1')); console.log(m.parseIsoDuration('PT1H2M3S')); console.log(m.ytThumbnails('dQw4w9WgXcQ').maxres); })"
  ```
  Expected: `dQw4w9WgXcQ`, `{seconds: 3723, formatted: '1:02:03'}`, valid URL.

- [ ] **Step 9: Commit**

  ```bash
  git add src/lib/server/youtube.js && git commit -m "feat(youtube): server lib for video info (id, duration, thumbnails, oEmbed + Data API)"
  ```

---

## Task 2: Server — API endpoint

**Files:**
- New: `src/routes/api/youtube/info/+server.js`

- [ ] **Step 1: Endpoint implementation**

  ```js
  import { json } from '@sveltejs/kit';
  import { fetchYouTubeVideoInfo, HttpError } from '$lib/server/youtube.js';
  import { rateLimit } from '$lib/server/rate-limit.js';

  export async function GET({ url, getClientAddress }) {
      const ip = getClientAddress();
      const rl = rateLimit(`${ip}:youtube-info`, { max: 20, windowMs: 60_000 });
      if (rl.limited) return json({ error: 'Too many requests.', retryAfter: rl.retryAfter }, { status: 429 });

      const target = url.searchParams.get('url')?.trim();
      if (!target) return json({ error: 'Missing ?url= parameter.' }, { status: 400 });

      try {
          return json(await fetchYouTubeVideoInfo(target));
      } catch (e) {
          if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
          return json({ error: 'YouTube request failed.' }, { status: 502 });
      }
  }
  ```

- [ ] **Step 2: Env example**

  Add to `.env.example` (under a "YouTube" section):
  ```
  # YouTube Data API v3 (optional — oEmbed fallback works without it)
  YOUTUBE_API_KEY=
  ```
  Copy the same key into `.env` if the user has one (leave empty otherwise — fallback path handles it).

- [ ] **Step 3: Verify** (no key → oEmbed path; 400 on garbage)

  ```bash
  curl -s 'http://localhost:6969/api/youtube/info?url=notaurl' | head -c 200   # → 400 JSON
  curl -s 'http://localhost:6969/api/youtube/info?url=https://youtu.be/dQw4w9WgXcQ' | head -c 400  # → oEmbed JSON or API JSON
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/routes/api/youtube/info/+server.js .env.example && git commit -m "feat(youtube): /api/youtube/info endpoint with rate limiting"
  ```

---

## Task 3: Card renderer — `YouTubeCard.svelte`

**Files:**
- New: `src/lib/components/tools/YouTubeCard.svelte`

This is the heart. One component, `let { video, config } = $props()`, renders the card at **design width 1280px** (`class="ycard ycard--{layout}"`), all metrics in px derived from `config` via small helper functions. html2canvas target is the root element `bind:this`.

- [ ] **Step 1: Config default shape (exported for reuse)**

  ```js
  // src/lib/components/tools/yt-config.js
  export const DEFAULT_CONFIG = {
      layout: 'classic',          // classic | split | stacked | hero | vertical | terminal | minimal | magazine
      aspect: 'auto',
      ratio: 50,                  // thumb share % for split/vertical
      radius: 12,                 // 0-24 px
      palette: 'dark',            // light | dark | oled | custom
      colors: { bg:'#0f0f0f', text:'#f1f1f1', secondary:'#aaaaaa', accent:'#ff0000' },
      font: 'Roboto',
      titleScale: 1,
      modules: { duration:true, title:true, description:false, channel:true, avatar:true, meta:true, verified:false, live:false, scrim:true },
      titleLines: 2,
      descriptionLines: 2
  };
  ```

- [ ] **Step 2: Palette → colors resolver**

  `light` = `{bg:'#ffffff', text:'#0f0f0f', secondary:'#606060', accent:'#ff0000'}`, `dark` = `{bg:'#0f0f0f', text:'#f1f1f1', secondary:'#aaaaaa', accent:'#ff0000'}`, `oled` = `{bg:'#000000', text:'#ffffff', secondary:'#8b989c', accent:'#ff0000'}`, `custom` = config.colors.

- [ ] **Step 3: Layout branches**

  Render `{#if layout === 'classic'}` … `{:else if}` … through all 8. Each branch composes the same leaf elements: `<Thumb>`, `<Title>`, `<ChannelRow>`, `<MetaLine>`, `<Description>`. Implement those as local `{#snippet}` blocks inside the component (Svelte 5 snippets) rather than subcomponents — they share the config context via closure.

  - **classic** — column: thumb 16:9 (scaled 1280×720) + 12px gap + title (font weight 500) + channel row + meta. Radius: `config.radius || 12`. Title size: `16px × (1280/360) × titleScale ≈ 56.9px`.
  - **split** — grid `ratio% / (100-ratio)%`: thumb left 16:9 full height of text column, text right with bigger title (`scale 1.25×`), modules stacked; gap 48px; vertical center.
  - **stacked** — full-bleed thumb; below, a solid `colors.bg` block with display font title (600), channel row, description, meta on one line.
  - **hero** — card = one 16:9 box; thumb as `<img>` absolute full-cover; scrim gradient overlay (only when `modules.scrim`); text block bottom-left: title 700 white, channel row + meta; duration badge bottom-right.
  - **vertical** — 9:16 card: thumb 4:5-ish top (`ratio` controls its share), text bottom.
  - **terminal** — bg `colors.bg`, 2px solid `colors.text` borders, JetBrains Mono default, uppercase small labels ("TITLE", "CHANNEL", "DURATION"), thumb with `border: 2px solid colors.text`, radius forced 0.
  - **minimal** — thumb 16:9, huge vertical padding, centered title only (no channel row unless user enables), meta optional.
  - **magazine** — grid: left column serif title (item 1), hairline `1px solid colors.secondary` rules, right column thumb with radius 12; channel row under title; name font suggestion Playfair Display.

- [ ] **Step 4: Thumb + duration badge snippet**

  ```svelte
  {#snippet thumb()}
      <div class="yt-thumb" style="border-radius:{config.radius}px;overflow:hidden">
          <img src={video.thumbnails?.maxres ?? video.thumbnails?.sd ?? video.thumbnails?.hq} alt={video.title} />
          {#if video.duration?.formatted && modules.duration && !modules.live}
              <span class="yt-duration">{video.duration.formatted}</span>
          {/if}
          {#if modules.live}
              <span class="yt-live">LIVE</span>
          {/if}
      </div>
  {/snippet}
  ```
  Duration badge CSS at design width: `font: 500 42px Roboto` (12px × 3.556), `background: rgba(0,0,0,.8)`, `color:#fff`, `border-radius:14px` (4px × 3.556), padding `10px 14px`, bottom-right `14px` offset. Live badge: `#ff0000` pill, white 500 42px Roboto, padding `10px 20px`, radius 14px.

  **Important:** the `<img>` needs `loading="eager"`, `referrerpolicy="no-referrer"`, and `crossorigin="anonymous"` — html2canvas taints/captures incorrectly without `referrerpolicy` + CORS-friendly loading from `i.ytimg.com`. Add `onerror` chain: if maxres fails, swap to sd → hq (store current index in a `$state` per card instance or use a data-attribute fallback).

- [ ] **Step 5: Fonts CSS**

  Card root sets `font-family: config.font`. Import the 8 Google fonts via `<link>` in the tool page (Task 5) so they're available to html2canvas.

- [ ] **Step 6: Verify render correctness by eye in dev server** (defer full verification to Task 5 manual pass; here just ensure no svelte-check errors)

  ```bash
  cd /home/cezar/doncezart && pnpm svelte-check 2>&1 | tail -5   # 0 errors
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add src/lib/components/tools/ && git commit -m "feat(youtube-card): 8-layout card renderer + config model"
  ```

---

## Task 4: Export — `ExportBar.svelte`

**Files:**
- New: `src/lib/components/tools/controls/ExportBar.svelte`

- [ ] **Step 1: Component**

  ```svelte
  let { cardEl, filename } = $props();   // cardEl = bound root of YouTubeCard
  let format = $state('png');            // png | jpeg | webp
  let size = $state(2);                  // 1 | 2 | 3
  let exporting = $state(false);

  async function exportCard() {
      if (!cardEl) return;
      exporting = true;
      try {
          await document.fonts.ready;
          const canvas = await html2canvas(cardEl, { scale: size, backgroundColor: null, useCORS: true });
          const blob = await new Promise(r => canvas.toBlob(r, `image/${format}`, format === 'jpeg' ? 0.92 : undefined));
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${filename}.${format === 'jpeg' ? 'jpg' : format}`;
          a.click();
      } finally { exporting = false; }
  }

  async function copyCard() {
      if (!cardEl) return;
      await document.fonts.ready;
      const canvas = await html2canvas(cardEl, { scale: 1, backgroundColor: null, useCORS: true });
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }
  ```

  Import: `import html2canvas from 'html2canvas';`. UI: three format buttons (PNG/JPEG/WebP), size segmented control (1x/2x/3x), primary "Download" button, secondary "Copy to clipboard" button; `copyCard` error → fallback message ("Clipboard blocked — use Download").

- [ ] **Step 2: Verify**

  ```bash
  pnpm svelte-check 2>&1 | tail -5   # 0 errors
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/components/tools/controls/ExportBar.svelte && git commit -m "feat(youtube-card): export bar (PNG/JPEG/WebP, 1-3x, clipboard)"
  ```

---

## Task 5: Tool page — `/tools/youtube-card`

**Files:**
- New: `src/routes/tools/youtube-card/+page.svelte`

- [ ] **Step 1: Google Fonts `<link>`s in the page head** (tool page only, via `svelte:head`)

  Roboto (400;500;700), Inter (400;500;700), Space Grotesk (400;500;700), Archivo (400;500;700), Anton, Bebas Neue, Playfair Display (400;700;900-italic optional), JetBrains Mono (400;700). Satoshi is already self-hosted.

- [ ] **Step 2: State**

  ```js
  let url = $state('');
  let loading = $state(false);
  let error = $state('');
  let video = $state(null);
  let config = $state(structuredClone(DEFAULT_CONFIG));
  let cardEl = $state(null);
  ```

  `fetchVideo()`: validate non-empty → `fetch('/api/youtube/info?url=' + encodeURIComponent(url))` → 400 shows inline error → 200 sets `video` (reset config layout/palette defaults? No — keep user's config, only swap video data; but reset on first load).

  Sample chips: `dQw4w9WgXcQ` form or real short links with labels ("Demo: Rick Astley", "Demo: 4K nature") — use actual existing videos, e.g. `https://youtu.be/dQw4w9WgXcQ`.

- [ ] **Step 3: Editor layout**

  ```
  [PageHeader title="YouTube Card Generator" subtitle=…]
  [input row: url field + Generate button]
  {:else video}
    [workspace grid: 1fr 360px]
      [left: preview pane (overflow auto, centered, scaled card)  + <ExportBar {cardEl} filename={video.id} />]
      [right: control panel]
        [section: Layout]  → 8-button glyph grid, aspect select, ratio range (0-100), radius range (0-24)
        [section: Style]   → palette swatch row (light/dark/oled/custom), 4 color inputs (custom only), font select, title scale range (0.8-1.6 step .05)
        [section: Content] → checkbox list of the 8 modules + lines selects (title 1-3, description 1-3)
  ```

  Preview scaling: wrap `<YouTubeCard>` in a div that computes `scale = min(1, paneWidth / 1280)` via a `ResizeObserver` or simple `clientWidth` measurement with `$effect`; card wrapped in a fixed-height container with `transform: scale(…); transform-origin: top center; overflow:hidden`.

- [ ] **Step 4: Missing-data resilience** — `video.channel?.avatarUrl == null` → avatar module auto-disabled visually (don't render broken img); `video.duration == null` → badge hidden; `video.views == null` → meta shows date only.

- [ ] **Step 5: Full manual verification**

  ```bash
  pnpm run dev   # port 6969
  ```
  1. `/tools/youtube-card` loads; navbar Tools dropdown shows the tool; `/tools` lists it; footer links work.
  2. Paste `https://youtu.be/dQw4w9WgXcQ` → Generate → data loads, Classic card renders with duration badge, title, avatar row, meta.
  3. Cycle all 8 layouts — no broken layout, switching preserves palette/font/toggles.
  4. Toggle each module off — card updates instantly.
  5. Palette light/dark/oled/custom — colors apply.
  6. Fonts — each Google font renders in preview.
  7. Export 2x PNG → 2560px+ image opens, text crisp.
  8. Copy to clipboard → paste into Discord/Notion works.
  9. Invalid URL → inline error, no console errors.
  10. Mobile width (< 666px) → workspace stacks, controls usable.

- [ ] **Step 6: Commit**

  ```bash
  git add src/routes/tools/youtube-card/ && git commit -m "feat(youtube-card): tool page with live preview, controls, and export"
  ```

---

## Task 6: Docs & polish

- [ ] **Step 1: Update `docs/CHANGELOG.md`** — Added: tools registry + navbar Tools dropdown + `/tools`; removed `/assets`; added YouTube Card Generator (server lib, API endpoint, 8-layout renderer, export bar, tool page). Removed: assets placeholder page.

- [ ] **Step 2: Update `docs/TASKS.md`** — move TASK-005 (asset store page) to Backlog as "replaced by /tools hub"; add new task row for tools hub + youtube card generator (Done).

- [ ] **Step 3: Update `docs/FUNCTIONALITY.md`** — new "Tools" section (registry, /tools index, YouTube Card Generator flow: input → fetch → customize → export; API endpoint; dependencies).

- [ ] **Step 4: Update `docs/AI_LOG.md`** with dated entries.

- [ ] **Step 5: Update `.env.example`** (done in Task 2, verify).

- [ ] **Step 6: Final commit**

  ```bash
  git add -A && git commit -m "docs: changelog, tasks, functionality for tools section + youtube card generator"
  ```

---

## Task 7: Growth follow-ups (deferred, documented only)

- [ ] Add "Thumbnail Safe-Zone Checker" as the second tool in `src/lib/data/tools.js` registry (spec §9.2) — separate future plan.
- [ ] Shareable style configs via URL hash — future plan.
- [ ] Batch playlist export — future plan.

These are intentionally not scheduled today; the spec keeps them ready.