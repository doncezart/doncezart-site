# DONCEZART

> The swiss army knife of the creative world.

Site of DONCEZART, video editor, creative director and content strategist, at **[doncez.art](https://doncez.art)**.

---

## Features

- **Landing page**: results from real client work (pinned, step-by-step scroll), process, FAQ
- **Designer side** (`/designer`): free tools and the reference library
- **Free tools** (`/tools`): YouTube card generator (with a public image API), social profile card, cutting mat texture
- **My Work**: filterable gallery with blur-up image loading, plus per-artwork case studies
- **Discovery**: curated sections of references and resources
- **Contact**: form with Cloudflare Turnstile, forwarded to Google Forms and a Discord webhook, with a confirmation email
- **Client balances**: PIN-protected receipts with carry-over between balances
- **Admin panel** (`/admin`): artworks, categories, tags, case studies, Discovery, balances and card API usage
- **SEO**: per-page titles and share images (`$lib/components/Seo.svelte`), `/sitemap.xml`, `/robots.txt`

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2 (Svelte 5) |
| Animation | GSAP |
| Card API rendering | Playwright (headless Chromium) |
| Language | JavaScript + TypeScript (schema only) |
| Database | PostgreSQL via Drizzle ORM |
| Image storage | Cloudflare R2 (S3-compatible) |
| Image processing | sharp, multi-variant WebP conversion |
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
| `YOUTUBE_API_KEY` | YouTube Data API key (optional, oEmbed fallback without it) |
| `GITHUB_TOKEN` | GitHub token for the profile card (optional, raises the rate limit) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Contact confirmation emails (optional) |
| `CHROMIUM_PATH` | Use a system Chromium for the card API instead of Playwright's (optional) |
| `RENDER_ORIGIN` | Origin the card API's headless browser loads (optional, defaults to the request's) |
| `TRACKING_SECRET` | Keeps card API usage grouping stable across restarts (optional) |
| `DB_SSL` | Set to `false` to turn off SSL for a remote database (optional) |

## Database

Schema changes are **manual** (this Postgres instance is shared across multiple
projects, so `drizzle-kit push` is unsafe). Apply pre-written SQL from
`drizzle/manual/` in numbered order:

```bash
psql "$DATABASE_URL" -f drizzle/manual/001_audit_slugredirect_service_visibility.sql
psql "$DATABASE_URL" -f drizzle/manual/002_balance_item_subservices.sql
psql "$DATABASE_URL" -f drizzle/manual/003_balance_previous.sql
psql "$DATABASE_URL" -f drizzle/manual/004_card_generation.sql
psql "$DATABASE_URL" -f drizzle/manual/005_artwork_video.sql
node --env-file=.env scripts/seed-admin.js   # create the first admin user
```

The `drizzle-kit` CLI is installed for inspecting / generating diffs, but never
run `push`/`migrate` against production from this repo.

## Scripts

```bash
node --env-file=.env scripts/generate-previews.js --all   # regenerate image thumbnails
node --env-file=.env scripts/import-assets.js             # bulk-import assets
```

## Card API (Chromium)

`/api/youtube/card` renders cards in headless Chromium. `pnpm install` downloads
it (Playwright postinstall). A bare Linux server may also need its system
libraries once:

```bash
npx playwright install-deps chromium
```

## Building

```bash
pnpm build                                # → build/
node --env-file=.env build/index.js       # run the production server
```

In production, env vars are typically injected by the deploy environment
(systemd `EnvironmentFile=`, Docker `--env-file`, etc.) so `--env-file` is
only needed for local smoke tests of the compiled output.

## Health Check

`GET /healthz` returns `{ ok, db, ts }` and a 200 / 503 status. Wire this
into your uptime monitor.

## Admin

The admin panel is available at `/admin` and is protected by session-cookie authentication. Create an admin account with the seed script before first use.

---

> AI guidance framework: https://github.com/doncezart/prompting-and-instructions/tree/main/github-copilot-instructions
> AI working files (logs, task lists, plans) are gitignored; see `.gitignore`.
