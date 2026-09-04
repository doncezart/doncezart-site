# YouTube Video Card Generator — Design Spec

**Date:** 2026-09-04
**Status:** Draft

---

## 1. Overview

A web tool at `/tools/youtube-card` that converts any YouTube video URL into a **customizable reference card** — a high-fidelity, printable/linkable image combining the video's thumbnail, title, creator, duration, and metadata in a user-chosen layout.

**Who needs this:** Video editors who reference YouTube videos in their editing timeline (Premiere, Resolve, CapCut) and need a clean, consistent, high-resolution "card" to drop into their project — instead of a low-quality screenshot. Also: content managers building moodboards in Notion/Miro, Discord reference channels, client briefs, blog embeds, and educators building course materials.

**The problem it solves:** Screenshots of YouTube videos are low-res, badly framed (chrome, comments, sidebar), inconsistent in size, and ugly. This tool produces a pixel-perfect card at export resolution (up to 3840px wide) that matches — or deliberately deviates from — YouTube's own visual design.

---

## 2. Research: YouTube's design language (as of 2026)

Reproduced from the live website UI (2023+ redesign) so the "YouTube-native" defaults are faithful. All values are the *reference* values at a 360px thumbnail width; the generator scales them proportionally to the design width (see §6.2).

### 2.1 Color tokens

| Token | Light mode | Dark mode | Usage |
|---|---|---|---|
| Canvas | `#FFFFFF` | `#0F0F0F` | Page / card background |
| Text primary | `#0F0F0F` | `#F1F1F1` | Title |
| Text secondary | `#606060` | `#AAAAAA` | Channel name, views, date |
| Hover text | `#030303` | `#FFFFFF` | — |
| Thumbnail radius | 8–12px | 8–12px | Desktop feed: 8px; watch page/search: 12px |
| Overlay scrim | — | — | Linear gradient `rgba(0,0,0,0) → rgba(0,0,0,0.8)` (end-screen overlays, hover) |
| Brand red | `#FF0000` | `#FF0000` | Logo, live badge, progress bar |
| Badge bg | `rgba(0,0,0,0.8)` | `rgba(0,0,0,0.8)` | Duration badge |

### 2.2 Typography

| Element | Font | Weight | Size (at 360px thumb) | Color | Notes |
|---|---|---|---|---|---|
| Title | Roboto | 500 (Medium) | 16px, lh 1.375 (22px) | Primary | 2-line clamp in feed; 3+ on watch page |
| Channel name | Roboto | 400 | 12px (13px on watch) | Secondary | — |
| Metadata (views · date) | Roboto | 400 | 12px | Secondary | Separated by "·" (middle dot) |
| Duration badge | Roboto | 500 (Medium) | 12px | `#FFFFFF` on `rgba(0,0,0,0.8)` | — |
| Display/branding | YouTube Sans | 500–700 | — | — | Proprietary; **Roboto is the legally-safe stand-in** |
| Verified check | Icon | — | 12px | `#A3A3A3` (light) / `#AAAAAA` (dark) | Placed after channel name |

YouTube's UI font is **Roboto** (interface + titles), with **YouTube Sans** reserved for branding/display. YouTube Sans is proprietary and cannot be redistributed — the generator uses **Roboto** for YouTube-native presets (visually near-identical for UI-sized text) and licensed fonts (Inter, Space Grotesk, Archivo, Anton, Bebas Neue, Playfair Display, JetBrains Mono, Satoshi) for everything else.

### 2.3 Proportions & spacing (reference: 360px-wide thumbnail in feed)

| Element | Value |
|---|---|
| Thumbnail aspect | 16:9 (`360 × 202`) |
| Thumb-to-text gap | 12px |
| Title-to-channel gap | 8px |
| Channel row height | 24px (24px avatar; 32–40px in rich grids) |
| Avatar | Circle, 24px |
| Title line count | 2 (feed), clamp toggle 1–3 |
| Duration badge | ~17 × 12px at 360w (≈ 60 × 20px at 1280w), radius 4px, bottom-right, 4px from edge |
| Live badge | Red pill (`#FF0000`), white 12px semibold "LIVE" text |
| Thumbnail radius | 8px (feed) / 12px (watch, search) |

### 2.4 Key layout rules (from safe-zone research)

- Duration badge always sits bottom-right of the thumbnail — never put card text there.
- Text over the thumbnail requires a scrim (bottom gradient) for legibility.
- Titles readable at 168px width (sidebar size) ⇒ heavy weights, clamped lines.

---

## 3. Data pipeline

### 3.1 Sources (free tiers only)

| Source | Key needed | Provides |
|---|---|---|
| **YouTube Data API v3** — `videos.list` (`part=snippet,contentDetails,statistics`) | `YOUTUBE_API_KEY` | Title, description, **maxres thumbnail** (1280×720), channel id/name, ISO-8601 duration, view count, publish date |
| **YouTube Data API v3** — `channels.list` (`part=snippet`) | same key | **Channel avatar** (240px medium / 800px high) |
| **YouTube oEmbed** (`/oembed?url=…&format=json`) | none | Title, author name, hq thumbnail (480×360) — **fallback when no API key configured** |
| **`i.ytimg.com` direct URLs** | none | `maxresdefault.jpg` (1280), `sddefault.jpg` (640), `hqdefault.jpg` (480) — constructed from video id, used as progressive quality fallback chain in both modes |

Quota cost per lookup: 2 units (1 videos + 1 channels) of the 10,000/day free quota. Mitigated by an in-memory cache (TTL 30 min, keyed by video id). The oEmbed + `i.ytimg.com` chain keeps the tool fully functional even with no API key, at slightly lower fidelity (maxres usually works via direct URL — it 404s only on very old videos).

### 3.2 Endpoint shape

`GET /api/youtube/info?url=<youtube-url>` → normalized JSON:

```json
{
  "id": "dQw4w9WgXcQ",
  "title": "…", "description": "…",
  "thumbnails": { "maxres": "https://i.ytimg.com/vi/…/maxresdefault.jpg", "sd": "…", "hq": "…" },
  "duration": { "iso": "PT3M32S", "seconds": 212, "formatted": "3:32", "formattedHours": "0:03:32" },
  "channel": { "id": "UC…", "name": "…", "avatarUrl": "…" } | null,
  "views": 1234567 | null,
  "publishedAt": "2025-01-01T00:00:00Z" | null,
  "source": "api" | "oembed"
}
```

Server-side fetch only (protects the API key). Rate-limited per IP (20 req / min) via the existing `rateLimit()` util. Invalid URL → 400; video not found → 404; both cascading to oEmbed where possible.

### 3.3 URL parsing

Accepts: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/live/`, `youtube.com/embed/`, plus URLs with extra params (`&t=`, `&list=`, `&ab_channel=`). Extract video id via regex, never trust the URL blindly (validate against `^[A-Za-z0-9_-]{11}$`).

---

## 4. Card layouts (6)

All layouts render at a design width of **1280px (720px for Vertical — native Shorts frame)** and auto height (except cover-fill layouts). Every layout is exportable at 1x/2x/3x (up to 3840px or 2160px for vertical).

| # | Layout | Orientation | DNA | Default font |
|---|---|---|---|---|
| 1 | **Classic — YouTube-native** | 16:9 thumb + text block | Exact feed card: 12px-radius thumb, duration badge, 2-line title, 24px avatar row, metadata | Roboto |
| 2 | **Wide Split** | Side-by-side (thumb left, text right) | "Video page hero" — thumb and text compete 50/50 | Roboto |
| 3 | **Stacked Editorial** | Full-bleed thumb over solid text block | Landing-page hero for articles/blog posts | Space Grotesk |
| 4 | **Hero Overlay** | Thumb = full card bg, text on bottom scrim | Poster/end-screen style | Archivo |
| 5 | **Vertical Reel** | 9:16 card (720×1280), thumb top, text bottom | Shorts/Reels/TikTok references (post this to a story) | Inter |
| 6 | **Minimal** | Thumb + title only, huge whitespace | Clean editorial; nothing but the hook | Inter |

(Removed 2026-09-05 per product direction: Terminal and Magazine layouts.)

### 4.1 Layout anatomy

Each layout defines: aspect (its own, or user-overridable), design width (`width`), padding default (`defaultPadding`), thumb text placement, scrim usage, which modules (see §5.2) are on by default, and its color/font defaults. Layout selection is **non-destructive**: switching layouts keeps the user's color/font/toggle choices; only the padding default re-applies (until the user tunes padding, then their value sticks).

---

## 5. Customization model

### 5.1 Global style controls

| Control | Options |
|---|---|
| Layout | 6 layouts (visual selector with mini-preview glyphs) |
| Card aspect | Auto (per layout), 16:9, 4:3, 1:1, 4:5, 9:16 |
| Thumb/text ratio | Slider 30–70% (affects split/vertical layouts; disabled when N/A) |
| Thumbnail radius | 0–24px |
| Card radius | 0–32px — rounds the whole card container (hero thumb inherits it) |
| Card padding | 0–80px — insets all card content; per-layout defaults (Classic/Split 40, Minimal 48, cover layouts 0) stick until the user tunes it |
| Element spacing | 0.5×–2× multiplier on every layout gap |
| Scrim darkness | 30–100% (hero) — bottom scrim alpha, default 85% |
| Background color | Palette + custom picker |
| Text primary color | Palette + custom picker |
| Text secondary color | Palette + custom picker |
| Accent color | Palette + custom picker (used for live badge, highlights) |
| Font family | Roboto, Inter, Space Grotesk, Archivo, Anton, Bebas Neue, Playfair Display, JetBrains Mono, Satoshi |
| Title scale | 0.8×–1.6× multiplier on the layout's default title size |

**Color palettes:** YouTube Light (`#fff` / `#0f0f0f` / `#606060` / `#ff0000`), YouTube Dark (`#0f0f0f` / `#f1f1f1` / `#aaa` / `#ff0000`), OLED Black (`#000` / `#fff` / `#8b989c` / `#ff0000`), and **Custom** (unlocks the four pickers).

### 5.2 Content modules (full modularity — every module can be toggled off)

| Module | Default | Notes |
|---|---|---|
| Thumbnail | on | Always on (it's the card's reason to exist) |
| Duration badge | on | Auto-hides for LIVE streams |
| Title | on | Clamp 1–3 lines (default 2) |
| Description | off (Classic) / on (Editorial) | Clamp 2 lines |
| Channel name | on | — |
| Channel avatar | on | Circles; hidden if API fallback has no avatar |
| Metadata (views · date) | on | Relative date ("2 weeks ago"), compact views ("1.2M") |
| Verified badge | off | Decorative toggle (API no longer exposes verification status publicly) |
| Live badge | off | Red pill; manual toggle for "live" cards |

---

## 6. Rendering & export

### 6.1 Preview

The card DOM renders at its true design size (1280px wide) inside a fixed viewport using CSS `transform: scale(s)` to fit the preview pane. This makes the preview WYSIWYG and html2canvas capture pixel-perfect.

### 6.2 Scaling the YouTube-native metrics

Reference width = 360px (feed thumbnail). At design width W (1280 for landscape layouts, 720 for Vertical), `scale = W/360` (3.556 or 2.0). All §2 metrics multiply by that layout's scale, so the Classic layout is *proportionally identical* to the real feed card at any export size, and Vertical matches a real Shorts frame.

### 6.3 Export

`html2canvas` (already a dependency) captures the card element while it is temporarily mounted outside the scaled preview tree (ancestor `transform: scale()` would otherwise shrink the capture box to the visual size):

| Format | Sizes | Output |
|---|---|---|
| PNG | 1x (1280w; vertical 720w), 2x, 3x | `.png` download |
| JPEG | same | `.jpg` download (white bg forced) |
| WebP | same | `.webp` download |
| Clipboard | 1280w PNG | `navigator.clipboard.write` — paste straight into Discord/Notion/timeline |

Export waits on `document.fonts.ready` so fonts are rasterized correctly. Transparent PNG is supported when the card background is transparent (Terminal/OLED variants).

---

## 7. UI flow (`/tools/youtube-card`)

1. **Input state** — centered URL field + "Generate card" button, sample URL chips for instant demo, error inline (invalid URL / not found / quota).
2. **Editor state** — two-pane workspace:
   - **Left:** live preview (scaled), export toolbar beneath (format, size, download, copy).
   - **Right:** control panel grouped in three sections — **Layout** (layout picker, aspect, ratio, radius), **Style** (palette, colors, font, title scale), **Content** (module toggles).
3. Full page is keyboard-reachable, controls are plain `<input type=color/range/checkbox>` + selects. No new UI framework.
4. State lives in one `$state` config object; components are pure renders of it (easy to later add URL-shareable configs).

---

## 8. File map

| File | Role |
|---|---|
| `src/lib/data/tools.js` | Tools registry (done — quick task) |
| `src/lib/server/youtube.js` | Video-id extraction, Data API + oEmbed fetchers, ISO-8601 duration parser, view/date formatters, in-memory cache |
| `src/routes/api/youtube/info/+server.js` | Rate-limited GET endpoint returning normalized video info |
| `src/routes/tools/youtube-card/+page.svelte` | Tool page: input state → editor state, control panel, export wiring |
| `src/lib/components/tools/YouTubeCard.svelte` | Renders the 8 layouts from (video, config); single html2canvas target |
| `src/lib/components/tools/controls/*.svelte` | LayoutPicker, PalettePicker, ModuleToggles, ExportBar (small, composable) |
| `src/routes/tools/+page.svelte` | Tools index (done — quick task) |
| `.env.example` / `.env` | `YOUTUBE_API_KEY` (optional) |
| Google Fonts `<link>` | Tool page only (Roboto, Inter, Space Grotesk, Archivo, Anton, Bebas Neue, Playfair Display, JetBrains Mono) |

No DB changes. No new npm dependencies (html2canvas already present).

---

## 9. Growth opportunities

### 9.1 Extensions of this tool (near-term)

1. **More platforms** — same generator for Twitch, Vimeo, TikTok, X/Twitter embeds (oEmbed covers all of them free — shared abstraction pays off immediately).
2. **Batch mode** — paste a whole playlist/channel URL → generate N cards → ZIP download (server-side export or client-side loop).
3. **Live stream countdown card** — scheduled-premiere data (Data API `liveStreamingDetails` gives scheduledStartTime; a "STARTS IN 02:14:33" countdown card for editors).
4. **Template gallery** — community-shared style configs, encoded as compressed JSON in the URL hash (`#c=…`) — share a style with one link, no accounts needed.
5. **Discord share** — one-click POST of the generated card to the site's Discord channel (existing webhook infra).
6. **Branding packs** — "your brand as a preset": custom fonts, watermark, locked palette for freelancers serving agency clients.
7. **Safe-zone checker** (spins out of the research in §2.4) — upload a 1280×720 image, overlay YouTube's duration badge / progress bar / scrim zones at every placement size.

### 9.2 Related tools for the /tools hub

- **Thumbnail Safe-Zone Checker** (above) — highest-need, zero-API-cost companion.
- **Channel art / banner generator** — 2560×1440 with the 1546×423 safe zone baked in.
- **Video title + tag generator** — prompt-based, no API needed.
- **Palette extractor** — pull a 5-color palette from any video thumbnail (client-side canvas analysis, no API).
- **Reference board builder** — collect N cards into a single moodboard image (composes the batch mode above).

### 9.3 Business angles

- **Pro tier** (when the site monetizes): 4K+ exports, custom font upload, watermark-free, saved presets, batch ZIP, API access for devs embedding cards in blogs/docs.
- **Ads/seo**: the tool answers a real search need ("youtube video card generator") — natural long-tail traffic to the domain.
- **Ecosystem hook**: every exported card can carry a subtle "made with doncez.art/tools" corner mark (opt-in) — free distribution loop.

### 9.4 Non-goals for v1

- No user accounts, no saved configs server-side, no paid tiers.
- No server-side image rendering (html2canvas is client-side; server-side Sharp rendering is a later pro-tier option).
- No editing of the thumbnail itself (annotations/arrows/crops) — that's a separate "thumbnail editor" tool.

---

## 10. Out of scope (v1)

- Login/accounts, persistence.
- Multi-card batch export.
- Non-YouTube platforms.
- Thumbnail content editing (text overlays on the image).
- PDF export (jspdf available, but cards are images; revisit with "reference board" tool).