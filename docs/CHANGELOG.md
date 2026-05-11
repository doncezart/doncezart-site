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

