# CHANGELOG

## [Unreleased]

### Added
- Thumbnail Safe-Zone Checker (`/tools/safe-zone`): upload a 1280×720 thumbnail and see exactly what YouTube's UI covers — duration/live badges, progress bar, hover icons, title scrim, dashed safe-zone grid — with the squint test at search (640), feed (336), and sidebar (168) sizes; exports an annotated PNG; all processing client-side, no upload
- Headless regression harness: `scripts/verify-youtube-card.mjs` (Playwright + chromium) — 21 checks covering both tools (rendering, palettes, toggles, real downloads with PNG dimension asserts, error paths, console/network hygiene)
- Tools hub: `tools` registry (`src/lib/data/tools.js`) drives the navbar Tools dropdown, `/tools` index, and footer link; the old standalone Assets entry is gone
- YouTube Card Generator (`/tools/youtube-card`): paste any YouTube URL → customizable video reference card
  - 8 layouts (Classic YouTube-native, Wide Split, Stacked, Hero overlay, Vertical, Terminal brutalist, Minimal, Magazine) with aspect, thumbnail/text ratio, and corner-radius controls
  - YouTube-faithful metrics (Roboto, 16px/500 titles, 12px secondary, 8–12px thumb radius, rgba(0,0,0,0.8) duration badge) scaled from the 360px feed reference to a 1280px design width
  - 4 color palettes (YouTube Light/Dark, OLED, custom pickers), 9 font families, title scaling, full content modularity (duration/title/description/channel/avatar/views+date/verified/live toggles)
  - Export: PNG/JPEG/WebP at 1x/2x/3x (up to 3840px) + copy-to-clipboard via html2canvas
  - Backend: `GET /api/youtube/info` (rate-limited 20/min/IP) — YouTube Data API v3 when `YOUTUBE_API_KEY` is set, oEmbed + `i.ytimg.com` fallback chain otherwise; 30-min in-memory cache
- Added `src/lib/server/http-error.js` shared HTTP error; `src/lib/data/yt-format.js` shared view/date formatters

### Changed
- Navbar: replaced the Assets button with a Tools dropdown (desktop + mobile collapsible); Footer "Assets" link now points to `/tools`
- **YouTube API key bug fixed**: `youtube.js` read `process.env` while the project convention is `$env/dynamic/private` — the key added to `.env` was never visible to the dev server, so the Data API path silently fell back to oEmbed (that's the "no extra data" symptom). Server now also: logs Data API failures, surfaces them as `dataError {status, message}` in the API response (shown in the fallback notice), and all fetches have a 10s abort timeout
- CSP: `img-src`/`connect-src` also allow `yt3.ggpht.com` — the legacy avatar hostname the Data API actually returns (avatars were blocked in preview and export)
- SVG-free content toggles are now a box grid: each module is a checkbox-styled button with active/off states (checked icon, border highlight), same pattern as the layout picker
- YouTube Card Generator overhaul: preview pane shrunk (fit-width + fit-height, capped ~42%, max 480px tall, margin-auto centering — fixes the vertical card's top being clipped out of the scroll area); control panel widened to 460px
- New card variables: Card radius (0–32, rounds the whole container incl. hero), Card padding (0–80, per-layout defaults that respect user tuning), Element spacing multiplier (0.5–2×), Scrim darkness (30–100%, hero default 85%); thumbnail radius slider renamed to match
- Card generator v3: padding is now an **outer frame** (content-box — the design width and all content stay static while the card grows around them); new **Container size** slider (720–1920) controls the design canvas; single spacing multiplier replaced by **per-row gaps** (Thumbnail / Column / Text spacing sliders — fixes Stacked's thumb↔title gap being unadjustable); removed Vertical and Minimal layouts (4 remain); dismissible **API fallback notice** shown in oEmbed mode (missing data explained + contact links); hero title box and JS truncation both aligned to the 82% cap (title no longer overflows its column); **SnapSlider** component — notch ticks, snap-with-escape (free values always reachable), WebAudio tick with "Snap sounds" toggle, keyboard support
- Card generator v4: every slider gets a **numeric readout** (label left, input right) that follows the slider and accepts typed values clamped to min/max on blur/Enter; slider **hitboxes expanded** invisibly (grab anywhere, `cursor: pointer` — no more fighting the knob); notch sound is now a **mechanical keyboard clack** (low triangle thock + bandpassed noise click, always on — toggle removed); module toggles are a box grid with active/off states
- Card generator v15: **export artifacts fixed** — the drop shadow moved off the card element onto the preview wrapper (exact config-bound width + radius, same render tick, so the preview shadow still follows the corners perfectly) because html2canvas paints box-shadows over the element's own area, tinting the frame band and corners of every export (measured: 5 distinct colors along the top padding band before, 1 uniform color after on dark and pure white on light); harness: +1 check (export pixel purity — uniform frame + exact palette color at all four corners) +1 check (shadow lives on the wrapper only)
- Card generator v14: **Stacked layout removed** (registry, renderer, CSS, harness — the layout row now has 6 buttons, verified 0 'Stacked' buttons); **bottom scrim auto-turns-on for Hero and Underlay** via their module defaults (so a visit to Split never leaves the poster layouts scrim-less); **Modern**: avatar top-aligned with the text block and creator ↔ views·date moved into a tighter sub-group (gap = half the text gap, verified 5.2px vs 10.3px at preview scale); **slider hitboxes no longer overlap the textbox/reset icon** (negative top/bottom margins removed — the grab strip stays inside its own field, verified hitbox top ≥ input bottom); **preview card now grows/shrinks around its own center** (flex-centering inside the stage + `transform-origin: center`) so padding drags can't make it look anchored to the top-left — measured center is pixel-identical (586/506) at padding 0/40/80 with zero scrollbars; harness: +5 checks (modern avatar top-align, modern tight sub-gap, stacked absence, underlay scrim default, hitbox non-overlap), 84 green
- Card generator v13: **every slider gets a reset icon** left of the readout that lights up once the value deviates from its layout default and restores it (plus the touched flag) at a click; readout box narrowed; titles of deactivated sliders stay fully readable (only the track/input dim); **preview is now truly centered and smaller** — the fit keeps card+shadow inside the pane (margin 56px), zero scrollbars at any padding/export size and the card stays pixel-centered while dragging padding (verified 586=586 at padding 0 and 80); **new default layout Modern**: copy of Classic with the avatar on the left and the 3-line block (title / creator / views·date) beside it; **Compact rebuilt**: title + views · date by default, creator and a small text-sized avatar join that ONE line when toggled on; **Wide Split**: description off now pins title+creator to the top and views · date to the bottom, the split description is darker, and an optional bottom scrim over the thumbnail joins the module grid; **Hero hides duration by default**, and Hero + Underlay corner badges align with the views · date line; per-layout module defaults (Modern/Classic/Underlay avatar+channel+duration on, Compact off, Hero duration off, Split scrim off) apply until the user tunes a module; **generate scrolls smoothly** to the tool containers with an 88px offset so the Layout/Style row stays visible below the navbar; **Safe-Zone Checker removed entirely** (registry, route, harness); em dashes removed from the tool descriptions, page descriptions and navbar dropdown headers (kept extremely concise); harness: +13 checks around modern/compact/split/hero/scrim/scroll, 3× consecutive green
- Card generator v10: **preview pane is a fixed 400px box with zero scrollbars** — the scale fits the tallest cards using their design-1280 height, and the export zoom is counter-scaled (×1280/C) so the preview is exactly container-invariant (dragging export size can't twitch it; only ±1px rounding); **Compact now honors the toggles** — channel row, avatar, verified check and subscribers render when switched on (previously hard-disabled); **every module toggle works in every layout** — the Description block now also renders in Classic, Compact, Hero (faded on scrim) and Underlay (in the title bar); **Wide Split restored as a proper 1/3–2/3 split** — the thumbnail fills the whole column height (cover, border radius intact) with 2/3 of the width for content (min-height from the wideness slider only)
- Card generator v9: **subscriber count moved beside the creator name** (`· 4.5M subscribers` in the channel row, inherits hero/underlay overlay colors) and is **off by default** (separate toggle); **Wide Split rebuilt** — text column ≈ 2× the thumbnail (default ratio 34%, range 25–85), thumbnail keeps its **corner radius** and renders at its natural aspect (top-anchored, never cropped or forced square); **preview is now one fixed size** — the display scale counter-acts the export zoom (×1280/containerSize) so changing export size never re-sizes or re-squishes the preview, and the **container-size slider moved to the Export container** as "Export size" (purely a scaling setting); **Stacked layout gets its default padding back (40px)**; the verified swatches label reads **"Verified badge"**
- Card generator v8: **container size is now a pure uniform zoom** — every metric (gaps, radiuses, padding, hero offsets, type) scales by `containerSize/1280`, so the composition never reflows or squishes (old "content stays static" semantics gone); **radius defaults** bumped and reworked — thumbnail 24px (max 72), card 32px (max 128), notches recalibrated; the **preview shadow follows the card's rounded corners** (shadow radius bound to the scaled container radius — no more square-corner triangles); the **Controls rail scrolls independently** (`overscroll-behavior: contain` — wheel over it never scrolls the page); **Font selector** shows a "Font" tag inside the box; verified swatches gained an explicit "Verified" label; **Content** now has separate **Views / Date / Subscribers** toggles with compressed labels (Duration, Channel, Avatar, Live), subscriber count fetched from channel statistics server-side; layout order now **Classic, Compact**, Wide Split, Stacked, Hero, Underlay; **Wide Split** gets a wider thumb share (default 60%, range 40–85) and a crop-free min-height (natural thumbnail aspect vs. flattening wideness, default wideness 3.2); **Copy to clipboard** now uses the same mount-out capture as Download — copied PNG is the true card size (previously the preview-scaled shrink); Tools navbar dropdown is **clamped inside the viewport** on both edges (plus max-width cap)
- Card generator v7: polish pass — top columns get their own bordered containers with a real **gap** between Layout and Style; every active control switches to **white background + black text** (layout, palette, module, export format, bg options); Style splits into **2 rows** (colors: palettes/custom/verified swatches · font: wide select); Controls rail is now **1 column** and the slider unit ('px', '%', '×') moved **inside the numeric box on the left**; Export container **matches the Content container's height** and its rows are full-width (formats 3-up, Download/Copy 2-up); new **preview background picker** button (top-right of the pane) — checkerboard, the three palette solids, custom color, custom image; extra breathing room before the tool containers (margin-top) plus a **smooth scroll** animation to the containers when a video loads
- Card generator v6: page structure per spec — row 1 has two short columns (**Layout buttons only** | **Style**: palette, font, verified color in one line each); row 2 is preview beside a **Controls rail hosting ALL sliders** in a 2-column grid that matches the preview's height; row 3 splits into **Content options** (preview width) and the **Export container** — file type (PNG/JPEG/WebP) + Download / Copy to clipboard only, size options dropped (resize via the container slider); **Underlay** rewritten as hero-with-title-moved-below (channel + meta + scrim + badge stay overlaid on the image; only the title sits under it); **Compact** never renders channel row/avatar; scrim toggle applies to Underlay too
- Card generator v5: page reorganized — Layout + Style are full-width top bands, Spacing sliders sit in a right rail with Export in its own container beneath them, Content is a bottom band (no more scrollable side menu); **Underlay** layout (hero poster with the title below the thumbnail) and **Compact** layout (thumb → title → "x views · date" one-liner); **Split wideness** slider (1.2–4×) controlling the split card's flatness; **verified check colors** (YouTube gray / white / accent / custom picker); **date format** option — absolute US ("October 25, 2009", default) or relative ("16 years ago"); avatar gets an on-error hide fallback
- Fixed YouTube API key not being read (`youtube.js` now uses `$env/dynamic/private` — the key added after a server start was never visible, which is why "no extra data" appeared despite a valid key)
- Layouts: removed Terminal and Magazine; Vertical redesigned at 720×1280 (real Shorts frame proportions — was 1280×2276); Minimal rebalanced (breathing padding, constrained title width); Hero tightened (28px text gaps, 56px bottom anchor, scrim darkens to rgba(0,0,0,0.85) and honors palette-inherit so light palettes stay legible); Split got a proportional min-height floor; all internal paddings now flow from the card padding variable
- CSP (`svelte.config.js`): `img-src`/`connect-src` now allow `i.ytimg.com` and `yt3.googleusercontent.com` (YouTube thumbnails + channel avatars were fully blocked, breaking the card preview, hero layout, and canvas export)
- `YouTubeCard` root now consumes `--yt-bg`/`--yt-text` custom properties (card was rendering transparent)
- Card export mounts the element out of the scaled preview tree during html2canvas capture (ancestor `transform: scale()` was shrinking the capture box to the visual size instead of the true 1280px layout)
- Dev dependency: `playwright` for the browser regression harness

### Removed
- Removed the `/assets` placeholder route and page

---

## [Unreleased]

### Added
- Balance sub-services: `balance_item.parent_id` self-reference lets a service have multiple sub-services rendered directly under it (admin + client receipt), added via a "+ Sub" button on each main service
- Migrated `balance_item` reordering to pointer drag with live drop indicators + up/down move buttons; new services now append at the bottom (`sort_order` = max+1) instead of jumping to the top
- Fixed item edit flow: edit is tracked by id (not object reference), the inline form closes after a successful save, and deletes of a main service warn about its sub-services
- Sub-services now display on the receipt as a subtle one-liner (type + price only — no title/url/indent/rail); removed the per-row up/down reorder buttons in the admin panel (pointer-drag ordering is retained)
- Added previous-balance links: admins can link other balances to a balance (`balance_previous` table), and the client balance page shows them as links at the top so clients can jump to older balances; sub-service price on the receipt is now aligned with its title (stays on one line even on mobile)
- Added `static/css/tokens.css` design token system (40+ CSS custom properties for colors, typography, spacing, layout, motion)
- Added `Button.svelte` reusable button/link primitive (solid/outline/cta variants, Svelte 5)
- Added `Badge.svelte` for absolute-positioned gallery item overlays
- Added `PageHeader.svelte` reusable centered page title + subtitle component
- Added `NavDropdown.svelte` discovery dropdown for navbar with glass blur and click-outside/Escape/scroll dismissal
- Added `Footer.svelte` site-wide footer with logo, motto, social icons, and 3-column link nav
- Added Cloudflare Turnstile widget to contact form (bot protection)
- Added privacy policy page (`/privacy`)
- Added assets placeholder page (`/assets`)
- Added Discovery index + dynamic section pages (`/discovery`, `/discovery/[section]`)
- Added socials page (`/socials`)
- Added `.env.example` with all required environment variable keys documented

### Changed
- Migrated `global.css` to use CSS tokens; removed all hardcoded color/font values
- Overhauled `Navbar.svelte`: glass blur + `backdrop-filter`, `z-index: 100` fix, NavDropdown for Discovery sections, Discord link, Svelte 5 syntax (`$state`, `onclick`)
- Updated `+layout.svelte` to render `<Footer />` on all non-admin routes
- Rewrote `+error.svelte` with Svelte 5 syntax, styled 404 (outlined text) and generic error states
- Updated `GalleryGrid.svelte` to use `Badge` component and `Button` for show-more link; removed hardcoded `border-radius`
- Migrated contact form submit button to `Button` component
- Added Turnstile token verification to `contact/+page.server.js` using `getClientAddress()`
- Imported `tokens.css` before `global.css` in `src/app.html`

### Removed
- Removed `.btn` and `.main-border` legacy utility classes from `global.css` (no public call sites remain)

---

## [Unreleased] — 2026-05-12

### Added
- Added 5 Discovery DB tables: `discoverySection`, `discoveryTag`, `discoveryItem`, `discoveryItemImage`, `discoveryItemTag` with FK constraints and cascade deletes
- Added admin sidebar collapsible nav groups (Artworks and Discovery) with chevron toggle and active-state detection
- Added admin Discovery tags CRUD (`/admin/discovery/tags`) — create/delete with slug generation, duplicate guard
- Added admin Discovery sections CRUD (`/admin/discovery/sections`) — create/update/delete/reorder with item count display and delete guard
- Added admin Discovery items list (`/admin/discovery`) — section filter, media type icons, YouTube thumbnail fallback, edit/delete per item
- Added admin Discovery new item form (`/admin/discovery/new`) — dynamic media type switcher (image/carousel/video/YouTube), creator/source fields, tag checkboxes, R2 upload via processImage/uploadToR2
- Added admin Discovery item edit form (`/admin/discovery/[id]/edit`) — pre-populated, preserves existing media if no new file uploaded, replaces carousel only if new files submitted
- Added public Discovery index server loader (`/discovery/+page.server.js`) — sections ordered by position from DB
- Replaced hardcoded section array in public Discovery index with DB-driven data; removed "Coming soon" badges
- Rewrote public Discovery section page (`/discovery/[section]`) — GalleryGrid + tag-pill filters + newest/oldest sort + Instagram-style split modal (65/35) supporting image, carousel (arrows+dots+keyboard), video, YouTube

