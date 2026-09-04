# TASKS

## In Progress
- [ ] TASK-010: Push DB schema and seed admin user (run `npx drizzle-kit push` + `node scripts/seed-admin.js`)
- [ ] TASK-011: Add R2 credentials to `.env` and test upload flow

## Up Next
- [ ] TASK-002: Fix Svelte 5 migration warnings (event attributes in +page.svelte and +error.svelte)
- [ ] TASK-012: Migrate existing hardcoded gallery items into the DB via admin CMS
- [ ] TASK-008: Replace adapter-auto with target deployment adapter

## Backlog
- [ ] TASK-019: Add Thumbnail Safe-Zone Checker tool (spec §9.2 — overlays YouTube UI zones on a user thumbnail)
- [ ] TASK-020: Shareable card style configs via URL hash (spec §9.1.3)
- [ ] TASK-021: Batch playlist → cards ZIP export (spec §9.1.2)
- [ ] TASK-022: Per-tool usage stats (umami events already fire: tool-generate / tool-export)
- [ ] TASK-006: Build socials page (linked in nav, route exists as placeholder)
- [ ] TASK-007: Build testimonials/stocks page
- [ ] TASK-009: Add SEO per-page meta tags
- [ ] TASK-013: Add markdown rendering for case study content (mdsvex or similar)

## Done
- [x] TASK-001: Review and finalize BRIEF.md sections marked for review
- [x] TASK-003: Wire up auth (User/Session schema → login, hooks, session cookies)
- [x] TASK-004: Build case study detail pages
- [x] TASK-014: Build admin CMS (artwork CRUD, tag management, R2 uploads)
- [x] TASK-015: Make public gallery DB-driven with lightbox + case study routing
- [x] TASK-016: Add tag-based filtering to gallery
- [x] TASK-017: Polish sprint — tokens.css, Button, Badge, PageHeader, NavDropdown, Footer, Navbar overhaul, error page, privacy/assets/discovery/socials pages, Turnstile, legacy CSS cleanup
- [x] TASK-018: Discovery feature — DB schema, admin CRUD (sections/tags/items), public grid+modal
- [x] TASK-023: Tools hub — replace Assets nav item with Tools dropdown, `/tools` index, footer link; remove `/assets` route
- [x] TASK-024: YouTube Card Generator — server lib (Data API + oEmbed fallback + cache), rate-limited `/api/youtube/info`, 8-layout renderer, export bar (PNG/JPEG/WebP 1–3x + clipboard), tool page UI, env + docs