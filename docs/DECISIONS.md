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
