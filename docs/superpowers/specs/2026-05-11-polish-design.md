# DONCEZART — Polish & Modularisation Design Spec
**Date:** 2026-05-11  
**Scope:** Front-end polish, CSS token system, component library, new pages, bug fixes. DB migration tasks (TASK-010, TASK-012) are explicitly out of scope.

---

## 1. CSS Token System

### Goal
Replace all hardcoded values with CSS custom properties. Every colour, spacing value, font reference, and timing value used more than once must come from a token. This is the foundation everything else builds on.

### File
`static/css/tokens.css` — created new, imported in `src/app.html` **before** `global.css`.

### Token definitions

```css
:root {
  /* Colors */
  --color-bg:              #000000;
  --color-text-primary:    #ffffff;
  --color-text-secondary:  #8B989C;
  --color-border:          rgba(255, 255, 255, 0.12);
  --color-glass-bg:        rgba(0, 0, 0, 0.6);
  --color-accent:          #ff0000;
  --color-discord:         #7289DA;

  /* Typography */
  --font-display: 'Clash Display', sans-serif;
  --font-body:    'Satoshi', sans-serif;

  /* Type scale */
  --text-xs:   0.72rem;
  --text-sm:   0.83rem;
  --text-base: 1rem;
  --text-lg:   1.1rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;
  --text-3xl:  2rem;
  --text-4xl:  clamp(2.5rem, 6vw, 5rem);
  --text-hero: clamp(3rem, 8vw, 7rem);

  /* Spacing */
  --space-xs:   0.25rem;
  --space-sm:   0.5rem;
  --space-md:   1rem;
  --space-lg:   1.5rem;
  --space-xl:   2rem;
  --space-2xl:  3rem;
  --space-3xl:  4rem;
  --space-4xl:  6rem;

  /* Layout */
  --container-max: 1920px;
  --container-pad: var(--space-xl);
  --nav-height:    4.5rem;
  --radius:        0; /* Brutalist — no border radius anywhere */

  /* Motion */
  --transition-fast: 0.15s ease;
  --transition-base: 0.3s ease;

  /* Borders */
  --border-width: 1px;
  --border:       var(--border-width) solid var(--color-border);
  --border-solid: var(--border-width) solid var(--color-text-primary);
}
```

### Migration rule
After `tokens.css` is created, `global.css` and all component `<style>` blocks are updated to reference tokens. No hardcoded hex values, font names, or timing values in component styles — token references only.

---

## 2. Component Library — `src/lib/components/ui/`

A new `ui/` subdirectory. All components are plain `.svelte` files (JS, no TS), following existing conventions. They accept props via `$props()`, emit nothing (consumers handle events directly).

### 2.1 `Button.svelte`

**Props:** `variant` (`'solid'` | `'outline'` | `'cta'`), `href` (string, optional — renders `<a>` if present, `<button>` otherwise), `size` (`'md'` | `'sm'`, default `'md'`), `type` (for `<button>`, default `'button'`).

**Behaviour:** Replaces `.btn`, `.main-border`, and `.btn-cta` class patterns site-wide. The `cta` variant is the arrow-underline CTA used in gallery "View all" links.

**No rounded corners.** No box shadow. Hover = underline (solid/outline) or border-bottom reveal (cta).

### 2.2 `Badge.svelte`

**Props:** `icon` (FA class string, optional), `label` (string).

**Behaviour:** Replaces `.case-study-badge` and `.multi-badge` in `GalleryGrid.svelte`. Positioned absolute within gallery items, top-right.

### 2.3 `PageHeader.svelte`

**Props:** `title` (string), `subtitle` (string, optional).

**Behaviour:** Renders the repeated `<h1>` + muted `<p>` block used on Contact, Privacy, and placeholder pages. Centre-aligned, generous vertical padding using `--space-4xl`.

### 2.4 `NavDropdown.svelte`

**Props:** `label` (string), `items` (array of `{ label, description, href }`), `headerDescription` (string).

**Behaviour:** The Discovery nav item. Renders a trigger button and a dropdown panel. See Section 4.2 for full behaviour spec.

---

## 3. `global.css` Cleanup

After token migration, `global.css` retains only:
- `body` base styles (background, margin, font-family via token)
- Element-level resets (`h1`–`h3`, `a`, `p` defaults)
- Nothing else — all utility classes move into `Button.svelte`, `Badge.svelte`, etc.

Specifically **removed** from `global.css`: `.btn`, `.main-border`, `.btn-cta`. These are replaced by `Button.svelte` at every call site.

---

## 4. Navbar Fixes

### 4.1 Z-index & stacking

**Problem:** Navbar renders under gallery images on the main page.

**Fix:**
- `Navbar.svelte`: add `z-index: 100` to `.navbar`
- `GalleryGrid.svelte`: ensure `.gallery-item` has no stacking context that escapes (remove any `z-index` on gallery items, or explicitly set `z-index: 0`)
- Lightbox overlay: `z-index: 200` (already above navbar)

### 4.2 Glass blur

**Problem:** Navbar currently has `rgba(0,0,0,0.8)` — opaque, not glassy.

**Fix:** Replace with true glassmorphism:
```css
background: var(--color-glass-bg); /* rgba(0,0,0,0.6) */
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
border-bottom: var(--border);
```

### 4.3 Navigation restructure

**Remove:** "Testimonials" link  
**Add:** "Discovery" dropdown (see 4.4)  
**Keep:** My Work, Assets, Discord Server, Socials, Contact

### 4.4 Discovery Dropdown (`NavDropdown.svelte`)

**Trigger:** A button labelled "Discovery" with a chevron icon. Sits in the left nav group alongside My Work and Assets.

**Dropdown panel behaviour:**
- Opens/closes on trigger click
- Closes on click-outside (document click listener registered and cleaned up via `$effect` return function — Svelte 5 pattern)
- Closes on Escape key
- Panel is positioned `absolute`, `top: 100%`, `left: 50%`, `transform: translateX(-50%)` **relative to the trigger element** — centered under the button, flush to the bottom of the trigger (no gap, no overlap with navbar)
- Panel has the same glass blur as the navbar: `background: rgba(0,0,0,0.85)`, `backdrop-filter: blur(24px) saturate(180%)`, `border: var(--border)`, `border-top: none`

**Panel structure:**
```
┌─────────────────────────────────┐
│ DISCOVERY                       │  ← small caps label
│ A curated library of media —    │  ← description, muted
│ handpicked resources, art, and  │
│ inspiration.                    │
├─────────────────────────────────┤
│ Curated Resources               │  ← label
│ Tools, references & articles    │  ← description, muted smaller
├─────────────────────────────────┤
│ Tutorials                       │
│ Step-by-step guides and         │
│ learning material               │
├─────────────────────────────────┤
│ Pure Art                        │
│ Artwork and visual inspiration  │
├─────────────────────────────────┤
│ Videography                     │
│ Film, motion, and cinematography│
└─────────────────────────────────┘
```

**Routes:** Each item links to `/discovery/[section-slug]` (e.g. `/discovery/curated-resources`). These are placeholder pages for now (see Section 7.3).

---

## 5. Footer Component (`src/lib/components/Footer.svelte`)

Replaces the absence of a footer. Added in `+layout.svelte` below `{@render children?.()}`, outside the admin branch (admin layout gets no footer).

### Layout

Two-column grid: `auto 1fr`.

**Left column:**
- Logo SVG (`/logo-long.svg` via `<img>`) — use the wide/long variant (exists in `/static/logo-long.svg`)
- Motto text below: *"The Swiss army knife of the creative world."* — `--text-sm`, `--color-text-secondary`
- Bottom row (flex, same line): copyright text + social icon links
  - Copyright: `© {year} DONCEZART. All rights reserved.` — `--text-xs`, `--color-text-secondary`, 50% opacity
  - Social icons: Font Awesome brand icons, same muted colour, 60% opacity, hover → full white. Platforms: **Discord, X, Instagram, YouTube, TikTok**. Each icon is an `<a>` with `title` attribute for accessibility. Actual URLs stored as a data array in the component, easy to update.

**Right column:**
Three link sub-columns, each with a small-caps heading and links below:

| Work | Discovery | Connect |
|---|---|---|
| Portfolio | Curated Resources | Contact |
| Case Studies | Tutorials | Socials |
| Assets | Pure Art | Privacy Policy |
| Free Resources | Videography | Discord Server (plain link) |

**Discord Server** in the Connect column is an unstyled `<a>` link — same `.footer-link` style as everything else. No special button styling.

### Styling rules
- `border-top: var(--border)` at the top of the footer
- `padding: var(--space-2xl) var(--container-pad)`
- `max-width: var(--container-max)`, `margin: 0 auto`
- Column headings: `--text-xs`, letter-spacing, text-transform uppercase, `--color-text-secondary` at 50% opacity
- Links: `--text-sm`, `--color-text-secondary`, hover → `--color-text-primary`

---

## 6. Error / 404 Page (replaces `+error.svelte`)

The current `+error.svelte` is a generic "work in progress" page. It gets replaced with a proper error page that handles both 404s and other errors.

### Behaviour
- SvelteKit's `+error.svelte` receives `$page.status` and `$page.error`
- If status is `404`: show the styled 404 design
- Otherwise: show a generic "Something went wrong" message

### 404 design
```
            404           ← Outlined/hollow, Clash Display, clamp(6rem,18vw,13rem)
                            letter-spacing: 0.04em (slight, prevents crowding, not excessive)

        Nothing here.     ← Clash Display, ~2rem, solid white

  This page doesn't exist — or not yet.
        Check the URL or head back.    ← Satoshi, muted, max-width: 36ch

  I've been notified of this error.   ← Satoshi, --text-xs, 40% opacity

    [ Go Home ]  [ Get in touch ]     ← solid + outline Button variants
```

**"I've been notified" note:** This text is shown on 404 specifically. For other error statuses, it is omitted unless a Sentry/error tracking integration exists. For now it's static text — no actual error reporting is wired.

### Svelte 5 fix
The current file has `<!-- @migration-task Error while migrating Svelte code -->`. The full file is rewritten, which clears the migration warning.

---

## 7. New Pages

### 7.1 Privacy Policy (`/privacy`)

**Route:** `src/routes/privacy/+page.svelte` (no server file needed — static content).

**Content:** Real but minimal. Covers exactly what the site does:
- What is collected: name, email, message via the contact form
- Where it goes: forwarded to Google Forms, triggers a Discord webhook notification
- Cookies: session cookie for admin area only; no tracking cookies, no analytics
- Third-party services: Google (Forms), Discord (webhook), Cloudflare (DNS/CDN, Turnstile)
- Contact for data requests: `me@doncez.art`
- No selling of data, no newsletter, no accounts for public users

**Style:** Uses `PageHeader.svelte` for the title. Body text in `--font-body`, `--color-text-secondary`. Section headings in `--font-display`. Max-width `60rem`, centred.

### 7.2 Assets (`/assets`)

**Route:** `src/routes/assets/+page.svelte`

**Content:** Placeholder. Uses `PageHeader.svelte` with title "Assets" and subtitle "Free resources and design assets — coming soon." One muted paragraph explaining what will live here. No call to action yet.

### 7.3 Discovery (`/discovery` and `/discovery/[section]`)

**Routes:**
- `src/routes/discovery/+page.svelte` — index, lists the 4 sections as cards
- `src/routes/discovery/[section]/+page.svelte` — per-section placeholder

**Content:** Index shows four cards (Curated Resources, Tutorials, Pure Art, Videography), each with a short description and a "Coming soon" indicator. Consistent grid layout matching the rest of the site (4-col → 2-col → 1-col).

Section pages: `PageHeader.svelte` + "Content coming soon" body. Recognises the `section` param and shows the correct section name/description.

### 7.4 Socials (`/socials`)

**Route:** `src/routes/socials/+page.svelte`

**Content:** Placeholder page listing all social platforms as a clean link list — icon + platform name + handle/URL, using the same `--font-body` link style. Not a full "socials hub" yet, just organised links.

---

## 8. Contact Form — Cloudflare Turnstile

### Integration approach

Cloudflare Turnstile is a CAPTCHA-free bot protection widget. It works by rendering a JS widget client-side that generates a token, which must be verified server-side before the form is processed.

**Client side (`contact/+page.svelte`):**
- Load Turnstile script: `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` in this page's `<svelte:head>`
- Add `<div class="cf-turnstile" data-sitekey="{PUBLIC_TURNSTILE_SITE_KEY}"></div>` inside the `<form>`, above the submit button
- The widget auto-renders and injects a hidden `cf-turnstile-response` field into the form on success

**Server side (`contact/+page.server.js`):**
- Import `TURNSTILE_SECRET_KEY` from `$env/static/private`, `PUBLIC_TURNSTILE_SITE_KEY` (already public) from `$env/static/public`
- In the `send` action, after field validation, extract `cf-turnstile-response` from form data
- POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `{ secret, response, remoteip }`
- If `success !== true`: return `fail(400, { ..., captcha_failed: true })`
- Show a form error: "Please complete the CAPTCHA challenge."
- Only proceed to Google Forms + Discord webhook if verification passes

**Env vars to add:**
- `.env`: `TURNSTILE_SECRET_KEY=your_secret_key_here`
- `.env.example`: `TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here` and `PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key_here`

**Styling:** The Turnstile widget renders in dark mode automatically when the page background is dark. No custom styling needed — it inherits the dark theme.

---

## 9. Svelte 5 Migration Fixes

Fix all remaining Svelte 5 migration warnings across the codebase:

| File | Issue | Fix |
|---|---|---|
| `+error.svelte` | `@migration-task` comment, `onclick` as string | Full rewrite (covered in Section 6) |
| `Navbar.svelte` | `on:click={dropMenu}` | → `onclick={dropMenu}` |
| Any other `on:*` event attributes | Legacy Svelte 4 syntax | → Svelte 5 `on*` prop |

Audit: search for `on:` in all `.svelte` files and convert. The `on:click` on the hamburger button in `Navbar.svelte` is the known remaining instance.

---

## 10. File Change Summary

| Action | File |
|---|---|
| Create | `static/css/tokens.css` |
| Modify | `static/css/global.css` (token migration, remove utility classes) |
| Modify | `src/app.html` (import tokens.css, add PUBLIC_TURNSTILE_SITE_KEY) |
| Create | `src/lib/components/ui/Button.svelte` |
| Create | `src/lib/components/ui/Badge.svelte` |
| Create | `src/lib/components/ui/PageHeader.svelte` |
| Create | `src/lib/components/ui/NavDropdown.svelte` |
| Create | `src/lib/components/Footer.svelte` |
| Modify | `src/lib/components/Navbar.svelte` (z-index, glass blur, Discovery dropdown, Svelte 5 fix) |
| Modify | `src/lib/components/GalleryGrid.svelte` (z-index, use Badge.svelte) |
| Modify | `src/routes/+layout.svelte` (add Footer, remove slide transition or keep) |
| Rewrite | `src/routes/+error.svelte` (proper 404 + error page) |
| Modify | `src/routes/contact/+page.svelte` (Turnstile widget) |
| Modify | `src/routes/contact/+page.server.js` (Turnstile verification) |
| Create | `src/routes/privacy/+page.svelte` |
| Create | `src/routes/assets/+page.svelte` |
| Create | `src/routes/discovery/+page.svelte` |
| Create | `src/routes/discovery/[section]/+page.svelte` |
| Create | `src/routes/socials/+page.svelte` |
| Modify | `.env.example` (Turnstile keys) |

---

## 11. Out of Scope

- DB migration / seeding (TASK-010, TASK-012)
- R2 credentials / upload flow (TASK-011)
- `/my-work` page changes
- `adapter-auto` replacement (TASK-008)
- Markdown rendering for case studies (TASK-013)
- Any new CMS features
