# AI_LOG

<!-- Format: YYYY-MM-DD | action description | file(s) -->
2026-04-01 | scaffolded docs/ framework from codebase analysis | docs/BRIEF.md, docs/TASKS.md, docs/DECISIONS.md, docs/CONVENTIONS.md, docs/CHANGELOG.md, docs/FUNCTIONALITY.md, docs/AI_LOG.md
2026-04-01 | added artwork, tag, artwork_tag tables | src/lib/server/db/schema.ts
2026-04-01 | added R2 upload utility | src/lib/server/r2.js
2026-04-01 | added session-cookie auth system | src/lib/server/auth.js, src/hooks.server.js
2026-04-01 | added admin login page | src/routes/admin/login/+page.server.js, +page.svelte
2026-04-01 | added admin layout + dashboard | src/routes/admin/+layout.server.js, +layout.svelte, +page.server.js, +page.svelte
2026-04-01 | added admin artwork CRUD pages | src/routes/admin/artworks/
2026-04-01 | added admin tag management | src/routes/admin/tags/
2026-04-01 | added case study route | src/routes/work/[slug]/
2026-04-01 | made gallery DB-driven with lightbox + tag filtering | src/routes/+page.svelte, +page.server.js
2026-04-01 | updated GalleryGrid with badges + click handler | src/lib/components/GalleryGrid.svelte
2026-04-01 | added admin seed script | scripts/seed-admin.js
2026-05-11 | created tokens.css design token system | static/css/tokens.css, src/app.html
2026-05-11 | migrated global.css to CSS tokens | static/css/global.css
2026-05-11 | created Button.svelte; migrated contact form button | src/lib/components/ui/Button.svelte, src/routes/contact/+page.svelte
2026-05-11 | created Badge.svelte; updated GalleryGrid to use Badge | src/lib/components/ui/Badge.svelte, src/lib/components/GalleryGrid.svelte
2026-05-11 | created PageHeader.svelte | src/lib/components/ui/PageHeader.svelte
2026-05-11 | created NavDropdown.svelte | src/lib/components/ui/NavDropdown.svelte
2026-05-11 | overhauled Navbar: glass blur, z-index fix, NavDropdown, Svelte 5 | src/lib/components/Navbar.svelte
2026-05-11 | created Footer.svelte; added to root layout | src/lib/components/Footer.svelte, src/routes/+layout.svelte
2026-05-11 | rewrote +error.svelte with Svelte 5 and styled 404 | src/routes/+error.svelte
2026-05-11 | added privacy, assets, discovery, socials pages | src/routes/privacy/+page.svelte, src/routes/assets/+page.svelte, src/routes/discovery/+page.svelte, src/routes/discovery/[section]/+page.svelte, src/routes/discovery/[section]/+page.server.js, src/routes/socials/+page.svelte
2026-05-11 | added Cloudflare Turnstile to contact form | src/routes/contact/+page.svelte, src/routes/contact/+page.server.js, .env.example
2026-05-11 | removed legacy .btn and .main-border from global.css | static/css/global.css, src/lib/components/GalleryGrid.svelte
