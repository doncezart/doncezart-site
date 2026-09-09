# FUNCTIONALITY

## Landing Page

### Hero Section
- **What it does:** Displays the DONCEZART logo (responsive: wide on desktop, square on mobile) with the tagline "The swiss army knife of the creative world."
- **Entry point:** `src/routes/+page.svelte`
- **Key functions / components:** `.landing` section, responsive `<img>` logo swap via CSS media queries

### Art Gallery
- **What it does:** Shows a grid of case study preview images (DONCEZART, PIM, Merotika, The Social Boost Hub) linking to portfolio work.
- **Entry point:** `src/routes/+page.svelte`
- **Key functions / components:** `.gallery` section, `.artworks` grid
- **Dependencies:** Images served from `cdn.doncez.art`

## Portfolio (My Work)

### Work Gallery
- **What it does:** Displays categorized grids of design work — Custom CPA Thumbnails, Gaming Thumbnails, Template Thumbnails, and Logo Designs.
- **Entry point:** `src/routes/my-work/+page.svelte`
- **Dependencies:** Images served from DigitalOcean Spaces CDN

## Contact

### Contact Form
- **What it does:** Collects email, name, and message from the user. Validates required fields server-side. On success, submits to Google Forms and sends a Discord webhook notification.
- **Entry point:** `src/routes/contact/+page.svelte`
- **Key functions / components:** `+page.server.js` → `send` action
- **API calls:** `POST https://docs.google.com/forms/d/e/{FORM_ID}/formResponse` (Google Form), `POST {WEBHOOK_URL}` (Discord)
- **Data flow:** Form submit → SvelteKit form action → validate → POST to Google Forms + POST to Discord webhook → return success/fail
- **Dependencies:** `FORM_ID` and `WEBHOOK_URL` env vars

## Navigation

### Navbar
- **What it does:** Sticky glass-effect navigation bar with desktop link layout (My work, Assets, Testimonials, Discord Server, Socials, Contact) and a mobile hamburger menu.
- **Entry point:** `src/lib/components/Navbar.svelte`
- **Key functions / components:** `dropMenu()` toggle, `.glasseffect` CSS, responsive show/hide

## Layout

### App Layout
- **What it does:** Wraps all pages with the Navbar, imports Font Awesome CSS, and applies a slide transition on route changes keyed by pathname.
- **Entry point:** `src/routes/+layout.svelte`
- **Key functions / components:** `Navbar` component, `slide` transition from `svelte/transition`
- **Dependencies:** `+layout.js` passes `pathname` from URL

## Error Handling

### Error Page
- **What it does:** Shows a "Work in progress" message with links to home, Discord, and contact page.
- **Entry point:** `src/routes/+error.svelte`

## Admin CMS

### Admin Login
- **What it does:** Username/password login form for admin access. Creates a session cookie valid for 30 days.
- **Entry point:** `src/routes/admin/login/+page.svelte`
- **Key functions / components:** `+page.server.js` → default action, `verifyPassword()`, `createSession()`
- **Data flow:** Form submit → validate credentials against `user` table → create session row → set `session_id` cookie → redirect to `/admin`
- **Dependencies:** `src/lib/server/auth.js`, `user` + `session` tables

### Admin Dashboard
- **What it does:** Shows artwork and tag counts with quick links to management pages and an upload shortcut.
- **Entry point:** `src/routes/admin/+page.svelte`

### Artwork Management
- **What it does:** List, create, edit, and delete artworks. Upload images to Cloudflare R2. Assign tags and case study content.
- **Entry point:** `src/routes/admin/artworks/+page.svelte`
- **Key functions / components:** `+page.server.js` (list + delete), `new/+page.server.js` (create + R2 upload), `[id]/edit/+page.server.js` (update)
- **API calls:** R2 PutObject via `@aws-sdk/client-s3`
- **Data flow:** Form submit → validate → upload image to R2 → insert/update `artwork` row + `artwork_tag` junction → redirect
- **Dependencies:** `src/lib/server/r2.js`, `artwork` + `artwork_tag` + `tag` tables

### Tag Management
- **What it does:** Create and delete tags used for categorizing artworks.
- **Entry point:** `src/routes/admin/tags/+page.svelte`
- **Key functions / components:** `+page.server.js` → `create` and `delete` actions

### Auth Guard
- **What it does:** Protects all `/admin/*` routes (except `/admin/login`). Redirects unauthenticated users to login.
- **Entry point:** `src/hooks.server.js`
- **Key functions / components:** `handle()` hook, `validateSession()`
- **Dependencies:** `src/lib/server/auth.js`

## Case Studies

### Case Study Page
- **What it does:** Displays a full case study for an artwork: hero image, title, tags, description, and markdown body content.
- **Entry point:** `src/routes/work/[slug]/+page.svelte`
- **Key functions / components:** `+page.server.js` loads artwork by slug where `hasCaseStudy = true`
- **Dependencies:** `artwork` + `artwork_tag` + `tag` tables

## Gallery Interactions

### Lightbox Popup
- **What it does:** Clicking a gallery item without a case study opens a full-screen lightbox overlay with the full image, title, and tags.
- **Entry point:** `src/routes/+page.svelte` (lightbox section)
- **Key functions / components:** `handleItemClick()`, `closeLightbox()`, Escape key handler

### Case Study Badge
- **What it does:** Shows a red "Case Study" badge on gallery items that have case study content, signaling to users they can click through for more detail.
- **Entry point:** `src/lib/components/GalleryGrid.svelte`

### Tag Filtering
- **What it does:** Tag pill buttons on the gallery allow filtering artworks by tag across all categories.
- **Entry point:** `src/routes/+page.svelte` (tag-filters section)

## Tools

### Tools Hub
- **What it does:** Public index of tools (`/tools`) listing every entry from the tools registry, plus the navbar Tools dropdown (desktop) and collapsible (mobile) driven by the same registry.
- **Entry point:** `src/routes/tools/+page.svelte`, `src/lib/data/tools.js` (registry), `src/lib/components/Navbar.svelte`
- **Data flow:** Registry array → navbar dropdown items + `/tools` card grid + footer link. Adding a tool = one registry entry.

### YouTube Card Generator
- **What it does:** Turns any YouTube URL into a customizable video reference card — 6 layouts, 4 palettes + custom colors, 9 fonts, full module toggles — exported as PNG/JPEG/WebP up to 3×, or copied to clipboard.
- **Entry point:** `src/routes/tools/youtube-card/+page.svelte`
- **Key functions / components:** `YouTubeCard.svelte` (6-layout renderer — **Modern** (the default: avatar top-left with nothing below it, beside a 3-line block of title / creator / views·date — creator and views·date sit in a tighter sub-group), Classic, Compact, Wide Split, Hero, Underlay; metrics scaled from YouTube's 360px feed reference; container size 720–1920 is a **pure uniform zoom** — gaps, radiuses, padding, hero offsets and type all scale together so the composition never reflows; **Wide Split** is 1:2 (thumbnail : text, default 34%, range 25–85) with the thumbnail at its natural aspect filling its column (the card height = that natural 16:9 height, so the 2/3 text column is exactly double the thumbnail's size; the thumbnail ALWAYS stays 16:9 — it never crops, and the card never grows past its natural height at default settings; split text defaults to half size via the per-layout **textScale** with the description module ON — with description off the title + creator pin to the top and views · date pin to the bottom, the split description renders darker, and an optional scrim overlays the split thumbnail; **Compact** shows title + views · date by default, with creator and a small avatar (same size as the text) joining that one line when toggled on; **Hero** hides duration by default and always carries the bottom scrim, as does Underlay; both align their corner badges with the views · date line); per-row gaps (thumb/column/text), verified-badge colors, separate views/date modules, subscriber count rendered beside the creator name when toggled on (off by default)), `yt-config.js` (config model, palettes, layout metadata), `ExportBar.svelte` (html2canvas capture with mount-out for true-size export, file type PNG/JPEG/WebP + Download/Copy to clipboard, full-width rows; clipboard copy renders at the true card size), `SnapSlider.svelte` (notch slider with snap + mechanical-keyboard clack, numeric readout with min/max clamp, the unit rendered inside the box on the left, a compact input box, a **reset icon** that lights up once the slider deviates from its layout default and restores it on click, and a hitbox that stays inside its own field — it never covers the textbox or reset icon), dismissible API-fallback notice showing the exact `dataError` from the server; YouTube API response includes channel subscriber count. Page layout: two short top columns (Layout buttons only | Style — colors row + font row with the "Font" tag inside the select), preview beside a 1-column Controls rail (same height as the preview — both 480px, `overscroll-behavior: contain`) hosting every slider (incl. **Title size ×** and the global **Text size ×** multiplier — 0.5–1.5, split defaults to 0.5, hero title to 0.8×), Content band (preview width) + Export container (with the "Export size" slider) below; the **preview renders at one fixed on-screen size, always centered from the card's own center** (flex-centering inside the stage + a center transform origin means the card grows and shrinks around its middle even mid-drag; the fit margin keeps card and shadow fully inside the pane — no scrollbars at any padding or export size) — the display scale counter-acts the export zoom, so export size never re-sizes or re-squishes the preview; preview pane has a top-right background picker (checkerboard, palette solids, custom color/image); the preview drop shadow follows the card's rounded corners (it lives on the preview wrapper with an exact config-bound radius, so the exported image is always clean — html2canvas paints box-shadows over the element's own frame band and corners, which used to tint them); after a link loads the tool containers smooth-scroll into view with the Layout/Style row fully visible below the navbar. Navbar dropdowns are clamped to stay inside the viewport.
- **API calls:** `GET /api/youtube/info?url=…` (server-side, rate-limited 20/min/IP, 30-min in-memory cache)
- **Data flow:** URL → server (`youtube.js`) → YouTube Data API v3 (`videos.list` + `channels.list`) when `YOUTUBE_API_KEY` set, else oEmbed + constructed `i.ytimg.com` thumbnails → normalized JSON → client state → card preview → export
- **Dependencies:** `YOUTUBE_API_KEY` (optional), Google Fonts (Roboto/Inter/Space Grotesk/Archivo/Anton/Bebas Neue/Playfair Display/JetBrains Mono), html2canvas (bundled)

## Discovery

### Discovery Section Index
- **What it does:** Public page listing all Discovery sections as clickable cards. Sections are loaded from DB ordered by position.
- **Entry point:** `src/routes/discovery/+page.svelte`
- **Key functions / components:** `+page.server.js` → `load()` queries `discoverySection`
- **Data flow:** DB query → `{ sections }` → rendered as card grid
- **Dependencies:** `discoverySection` table

### Discovery Section Media Grid
- **What it does:** Public section page showing all items in a masonry GalleryGrid with tag-pill filtering and newest/oldest sort toggle.
- **Entry point:** `src/routes/discovery/[section]/+page.svelte`
- **Key functions / components:** `+page.server.js` → `load()` queries section, items, carousel images, tags with `inArray`. `GalleryGrid` component.
- **Data flow:** DB query (section by slug → items → images + tags) → mapped to grid shape → rendered with filters + sort
- **Dependencies:** `discoverySection`, `discoveryItem`, `discoveryItemImage`, `discoveryItemTag`, `discoveryTag` tables; `GalleryGrid.svelte`

### Discovery Item Modal
- **What it does:** Instagram-style split modal (65% media / 35% info) opened on grid item click. Supports image, carousel (arrows + dots + keyboard nav), HTML5 video, and YouTube embed.
- **Entry point:** `src/routes/discovery/[section]/+page.svelte` (modal section)
- **Key functions / components:** `openModal()`, `closeModal()`, `carouselPrev/Next()`, `handleKeydown()` (Escape + arrow keys), `svelte:window` binding
- **Dependencies:** `youtube-nocookie.com` for YouTube embeds (no API key)

### Admin Discovery Tags
- **What it does:** Create and delete discovery tags (name + auto-slug). Duplicate name guard.
- **Entry point:** `src/routes/admin/discovery/tags/+page.svelte`
- **Key functions / components:** `+page.server.js` → `create` / `delete` actions
- **Dependencies:** `discoveryTag` table

### Admin Discovery Sections
- **What it does:** Create, edit, delete, and reorder discovery sections. Delete blocked if section has items. Item count shown per section.
- **Entry point:** `src/routes/admin/discovery/sections/+page.svelte`
- **Key functions / components:** `+page.server.js` → `create` / `update` / `delete` / `moveUp` / `moveDown` actions
- **Dependencies:** `discoverySection`, `discoveryItem` tables

### Admin Discovery Items List
- **What it does:** Lists all discovery items with section filter, thumbnail (or YouTube thumbnail fallback), media type icon, edit link, and delete with confirm.
- **Entry point:** `src/routes/admin/discovery/+page.svelte`
- **Key functions / components:** `+page.server.js` → `load()` maps sections onto items; `delete` action
- **Dependencies:** `discoveryItem`, `discoverySection` tables

### Admin Discovery Item Create
- **What it does:** Create a new discovery item. Dynamic media type switcher (image/carousel/video/YouTube). Uploads via R2 + processImage. Supports tag selection.
- **Entry point:** `src/routes/admin/discovery/new/+page.svelte`
- **Key functions / components:** `+page.server.js` → default action; `processAndUpload()`, `extractYoutubeId()`, `slugify()`; DataTransfer carousel sync trick
- **API calls:** R2 PutObject via `uploadToR2()`, `processImage()` for WebP variants
- **Data flow:** Form submit → validate → upload media → insert discoveryItem → insert discoveryItemImages (carousel) → insert discoveryItemTag → redirect
- **Dependencies:** `src/lib/server/r2.js`, `src/lib/server/image.js`, `discoveryItem` + related tables

### Admin Discovery Item Edit
- **What it does:** Edit an existing discovery item. Pre-populates all fields. Preserves existing media URL if no new file uploaded. Replaces carousel images only if new files submitted. Syncs tags (delete-all then re-insert).
- **Entry point:** `src/routes/admin/discovery/[id]/edit/+page.svelte`
- **Key functions / components:** `+page.server.js` → `load()` (item + images + tags + sections + allTags with `checked` boolean); default action
- **Dependencies:** `src/lib/server/r2.js`, `src/lib/server/image.js`, `discoveryItem` + related tables
