# CHANGELOG

## [Unreleased]

### Added
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

