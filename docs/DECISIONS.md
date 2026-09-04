# DECISIONS

| Decision | Why | Alternatives considered | Date |
|---|---|---|---|
| Use Drizzle ORM with PostgreSQL | — | — | — |
| Use DigitalOcean Spaces for image CDN | — | — | — |
| Contact form forwards to Google Forms + Discord webhook | — | — | — |
| Use Cloudflare R2 for new artwork uploads | S3-compatible, cheap egress, pairs well with existing @aws-sdk/client-s3 | Keep DigitalOcean Spaces only | 2026-04-01 |
| Session-cookie auth with Node crypto.scrypt | Admin-only, single user, no extra deps needed | lucia-auth, bcrypt, argon2 | 2026-04-01 |
| Artwork/Tag many-to-many via junction table | Flexible tagging, artworks can have multiple tags | JSON array column, comma-separated | 2026-04-01 |
| Case study content stored as text on artwork row | Simple, no extra table; markdown rendered on view | Separate case_study table, MDX files | 2026-04-01 |
| Lightbox for non-case-study artworks, page route for case studies | Different depth of content requires different UX | Always popup, always separate page | 2026-04-01 |
| YouTube Card Generator: Data API v3 primary, oEmbed + `i.ytimg.com` fallback, 30-min in-memory cache | Free quota (2 units/lookup of 10k daily), key optional; cache protects quota; fallback keeps tool working with no key | Data API only, oEmbed only, per-video DB caching | 2026-09-04 |
| Tools registry as static client data (`src/lib/data/tools.js`) instead of a DB table | Tools are code, not content — no admin editing needed yet; zero queries | `tool` DB table like `discoverySection` | 2026-09-04 |
| Client-side export via html2canvas at 1280px design width (scaled preview) | WYSIWYG fidelity, no server render pipeline, html2canvas already a dependency | Server-side Sharp rendering, SVG→PNG pipeline | 2026-09-04 |
