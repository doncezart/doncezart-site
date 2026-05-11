# FUNCTIONALITY

## Landing Page

### Hero Section
- **What it does:** Displays the DONCEZART logo (responsive: wide on desktop, square on mobile) with the tagline "The swiss army knife of the creative world."
- **Entry point:** `src/routes/+page.svelte`
- **Key functions / components:** `.landing` section, responsive `<img>` logo swap via CSS media queries

### Art Gallery
- **What it does:** Shows a grid of case study preview images (DONCEZART, PIM, Merotika, The Social Boost Hub) linking to portfolio work.
- **Entry point:** `src/routes/+page.svelte`
- **Key functions / components:** `.gallery` section, `.artworks` grid
- **Dependencies:** Images served from `cdn.doncez.art`

## Portfolio (My Work)

### Work Gallery
- **What it does:** Displays categorized grids of design work — Custom CPA Thumbnails, Gaming Thumbnails, Template Thumbnails, and Logo Designs.
- **Entry point:** `src/routes/my-work/+page.svelte`
- **Dependencies:** Images served from DigitalOcean Spaces CDN

## Contact

### Contact Form
- **What it does:** Collects email, name, and message from the user. Validates required fields server-side. On success, submits to Google Forms and sends a Discord webhook notification.
- **Entry point:** `src/routes/contact/+page.svelte`
- **Key functions / components:** `+page.server.js` → `send` action
- **API calls:** `POST https://docs.google.com/forms/d/e/{FORM_ID}/formResponse` (Google Form), `POST {WEBHOOK_URL}` (Discord)
- **Data flow:** Form submit → SvelteKit form action → validate → POST to Google Forms + POST to Discord webhook → return success/fail
- **Dependencies:** `FORM_ID` and `WEBHOOK_URL` env vars

## Navigation

### Navbar
- **What it does:** Sticky glass-effect navigation bar with desktop link layout (My work, Assets, Testimonials, Discord Server, Socials, Contact) and a mobile hamburger menu.
- **Entry point:** `src/lib/components/Navbar.svelte`
- **Key functions / components:** `dropMenu()` toggle, `.glasseffect` CSS, responsive show/hide

## Layout

### App Layout
- **What it does:** Wraps all pages with the Navbar, imports Font Awesome CSS, and applies a slide transition on route changes keyed by pathname.
- **Entry point:** `src/routes/+layout.svelte`
- **Key functions / components:** `Navbar` component, `slide` transition from `svelte/transition`
- **Dependencies:** `+layout.js` passes `pathname` from URL

## Error Handling

### Error Page
- **What it does:** Shows a "Work in progress" message with links to home, Discord, and contact page.
- **Entry point:** `src/routes/+error.svelte`

## Admin CMS

### Admin Login
- **What it does:** Username/password login form for admin access. Creates a session cookie valid for 30 days.
- **Entry point:** `src/routes/admin/login/+page.svelte`
- **Key functions / components:** `+page.server.js` → default action, `verifyPassword()`, `createSession()`
- **Data flow:** Form submit → validate credentials against `user` table → create session row → set `session_id` cookie → redirect to `/admin`
- **Dependencies:** `src/lib/server/auth.js`, `user` + `session` tables

### Admin Dashboard
- **What it does:** Shows artwork and tag counts with quick links to management pages and an upload shortcut.
- **Entry point:** `src/routes/admin/+page.svelte`

### Artwork Management
- **What it does:** List, create, edit, and delete artworks. Upload images to Cloudflare R2. Assign tags and case study content.
- **Entry point:** `src/routes/admin/artworks/+page.svelte`
- **Key functions / components:** `+page.server.js` (list + delete), `new/+page.server.js` (create + R2 upload), `[id]/edit/+page.server.js` (update)
- **API calls:** R2 PutObject via `@aws-sdk/client-s3`
- **Data flow:** Form submit → validate → upload image to R2 → insert/update `artwork` row + `artwork_tag` junction → redirect
- **Dependencies:** `src/lib/server/r2.js`, `artwork` + `artwork_tag` + `tag` tables

### Tag Management
- **What it does:** Create and delete tags used for categorizing artworks.
- **Entry point:** `src/routes/admin/tags/+page.svelte`
- **Key functions / components:** `+page.server.js` → `create` and `delete` actions

### Auth Guard
- **What it does:** Protects all `/admin/*` routes (except `/admin/login`). Redirects unauthenticated users to login.
- **Entry point:** `src/hooks.server.js`
- **Key functions / components:** `handle()` hook, `validateSession()`
- **Dependencies:** `src/lib/server/auth.js`

## Case Studies

### Case Study Page
- **What it does:** Displays a full case study for an artwork: hero image, title, tags, description, and markdown body content.
- **Entry point:** `src/routes/work/[slug]/+page.svelte`
- **Key functions / components:** `+page.server.js` loads artwork by slug where `hasCaseStudy = true`
- **Dependencies:** `artwork` + `artwork_tag` + `tag` tables

## Gallery Interactions

### Lightbox Popup
- **What it does:** Clicking a gallery item without a case study opens a full-screen lightbox overlay with the full image, title, and tags.
- **Entry point:** `src/routes/+page.svelte` (lightbox section)
- **Key functions / components:** `handleItemClick()`, `closeLightbox()`, Escape key handler

### Case Study Badge
- **What it does:** Shows a red "Case Study" badge on gallery items that have case study content, signaling to users they can click through for more detail.
- **Entry point:** `src/lib/components/GalleryGrid.svelte`

### Tag Filtering
- **What it does:** Tag pill buttons on the gallery allow filtering artworks by tag across all categories.
- **Entry point:** `src/routes/+page.svelte` (tag-filters section)
