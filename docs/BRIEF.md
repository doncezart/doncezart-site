# BRIEF

## What this project does

DONCEZART is a personal creative portfolio website at **doncez.art**. It showcases graphic design work — custom CPA thumbnails, gaming thumbnails, template thumbnails, and logo designs — along with case studies. It includes a contact form that submits to Google Forms and sends a Discord webhook notification. The tagline is "The swiss army knife of the creative world."

## Who it's for

Potential clients, collaborators, and anyone interested in DONCEZART's design services. The site serves as a public-facing portfolio and point of contact.

## Tech stack and architecture

- **Framework:** SvelteKit 2 (Svelte 5) with `adapter-auto`
- **Language:** JavaScript (no TypeScript in routes/components; TypeScript only in DB schema)
- **Build tool:** Vite 8
- **Database:** PostgreSQL via Drizzle ORM + `postgres` driver
- **Package manager:** pnpm
- **Styling:** Global CSS (`static/css/global.css`), component-scoped `<style>` blocks. Dark theme (black background, white text). Fonts: Satoshi, Yapari Trial (CDNfonts).
- **Icons:** Font Awesome 7 (free)
- **CDN:** DigitalOcean Spaces (`doncezart.nyc3.cdn.digitaloceanspaces.com`) and custom domain (`cdn.doncez.art`)
- **Markdown:** mdsvex available but not visibly in use yet

### Folder structure

```
src/
  app.html            — HTML shell with meta tags, font imports
  lib/
    index.js          — lib barrel export
    components/
      Navbar.svelte   — sticky glass-effect navbar with responsive hamburger menu
    server/
      db/
        index.js      — Drizzle client (postgres.js)
        schema.ts     — User + Session tables
  routes/
    +layout.js        — passes pathname to layout
    +layout.svelte    — imports Navbar, Font Awesome, slide transitions
    +page.svelte      — landing page with logo + art gallery (case studies)
    +error.svelte     — "work in progress" error page
    contact/
      +page.svelte    — contact form UI
      +page.server.js — form action: validates, forwards to Google Forms + Discord webhook
    my-work/
      +page.svelte    — portfolio gallery (thumbnails, logos)
static/
  css/global.css      — global styles, button classes, typography
```

## Key data models

- **User** — `id` (text PK), `age`, `username` (unique), `passwordHash`
- **Session** — `id` (text PK), `userId` (FK → user), `expiresAt` (timestamptz)
- **Artwork** — `id` (serial PK), `title`, `slug` (unique), `description`, `imageUrl`, `thumbnailUrl`, `category`, `subcategory`, `hasCaseStudy` (boolean), `caseStudyContent` (markdown text), `createdAt`, `updatedAt`
- **Tag** — `id` (serial PK), `name` (unique), `slug` (unique)
- **ArtworkTag** — junction table: `artworkId` (FK → artwork), `tagId` (FK → tag)

Auth is wired up: session-cookie auth protects `/admin/*` routes via `hooks.server.js`.

## External APIs and services

- **Google Forms** — Contact form submissions are forwarded via POST to a Google Form endpoint (env: `FORM_ID`)
- **Discord Webhooks** — Contact form submissions trigger a Discord webhook notification (env: `WEBHOOK_URL`)
- **Cloudflare R2** — S3-compatible object storage for artwork uploads (env: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`)
- **DigitalOcean Spaces / S3** — Legacy image hosting for existing portfolio assets

## Constraints and non-negotiables

- Dev server runs on port **6969**
- Images are served from DigitalOcean Spaces CDN — no local image storage
- Dark theme with Satoshi + Yapari Trial typography

<!-- could not infer — please review: Hosting/deployment target is unclear (adapter-auto). What platform does this deploy to? -->

## Out of scope

<!-- could not infer — please review: No explicit out-of-scope boundaries found. Please define what should not be included in this version. -->
