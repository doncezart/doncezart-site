# TASKS

## In Progress
- [ ] TASK-010: Push DB schema and seed admin user (run `npx drizzle-kit push` + `node scripts/seed-admin.js`)
- [ ] TASK-011: Add R2 credentials to `.env` and test upload flow

## Up Next
- [ ] TASK-002: Fix Svelte 5 migration warnings (event attributes in +page.svelte and +error.svelte)
- [ ] TASK-012: Migrate existing hardcoded gallery items into the DB via admin CMS
- [ ] TASK-008: Replace adapter-auto with target deployment adapter

## Backlog
- [ ] TASK-005: Build asset store page
- [ ] TASK-006: Build socials page
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
