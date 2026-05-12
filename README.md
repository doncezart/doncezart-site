# DONCEZART

> The swiss army knife of the creative world.

Personal creative portfolio at **[doncez.art](https://doncez.art)** — showcasing graphic design work including custom CPA thumbnails, gaming thumbnails, template designs, and logo projects, along with in-depth case studies.

---

## Features

- **Gallery** — filterable grid of artworks by category and subcategory with blur-up image loading
- **Case Studies** — per-artwork deep-dives with markdown content
- **Discovery** — curated sections of design inspiration and resources
- **Assets** — free downloadable resources
- **Contact** — form with Cloudflare Turnstile captcha, forwarded to Google Forms and Discord
- **Admin panel** — protected dashboard for managing artworks, categories, tags, and case studies with image upload to Cloudflare R2

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2 (Svelte 5) |
| Language | JavaScript + TypeScript (schema only) |
| Database | PostgreSQL via Drizzle ORM |
| Image storage | Cloudflare R2 (S3-compatible) |
| Image processing | sharp — multi-variant WebP conversion |
| Auth | Session-cookie auth with scrypt password hashing |
| Captcha | Cloudflare Turnstile |
| Analytics | Umami (self-hosted) |
| Package manager | pnpm |
| Build tool | Vite 8 |

## Getting Started

```bash
pnpm install
cp .env.example .env   # fill in all values (see below)
pnpm dev               # http://localhost:6969
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `WEBHOOK_URL` | Discord webhook for contact form notifications |
| `FORM_ID` | Google Form ID for contact submissions |
| `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `R2_ENDPOINT` | Cloudflare R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET` | R2 bucket name |
| `R2_PUBLIC_URL` | Public base URL for R2 assets |

## Database

```bash
npx drizzle-kit push    # apply schema to DB
node --env-file=.env scripts/seed-admin.js   # create admin user
```

## Scripts

```bash
node --env-file=.env scripts/generate-previews.js --all   # regenerate image thumbnails
node --env-file=.env scripts/import-assets.js             # bulk-import assets
```

## Building

```bash
pnpm build
pnpm preview
```

## Admin

The admin panel is available at `/admin` and is protected by session-cookie authentication. Create an admin account with the seed script before first use.

---

> AI guidance framework: https://github.com/doncezart/prompting-and-instructions/tree/main/github-copilot-instructions
