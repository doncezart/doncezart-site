# DONCEZART — Discovery Section Design Spec
**Date:** 2026-05-11  
**Scope:** Full Discovery section — DB schema, public media grid + modal, admin CRUD, admin sidebar rework.  
**Approach:** Fully isolated Discovery tables (Approach A). No coupling to artwork schema.

---

## 1. Database Schema

Five new tables added to `src/lib/server/db/schema.ts`.

### `discovery_section`
Admin-manageable sections. Replaces the hardcoded array currently in `src/routes/discovery/+page.server.js`.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | Display name, e.g. "Pure Art" |
| `slug` | text NOT NULL UNIQUE | URL segment, e.g. "pure-art" |
| `description` | text | Shown on section card and page subtitle |
| `position` | integer NOT NULL DEFAULT 0 | Controls order on `/discovery` grid |
| `createdAt` | timestamptz | defaultNow() |

### `discovery_tag`
Isolated tag vocabulary for Discovery. Independent from the artwork `tag` table.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL UNIQUE | |
| `slug` | text NOT NULL UNIQUE | |

### `discovery_item`
One row per piece of media.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `sectionId` | integer NOT NULL FK → `discovery_section(id)` | CASCADE DELETE |
| `title` | text NOT NULL | |
| `description` | text | Shown in modal |
| `mediaType` | text NOT NULL | `'image'` \| `'video'` \| `'youtube'` \| `'carousel'` |
| `imageUrl` | text | Primary CDN URL. Null for youtube-only items |
| `thumbnailUrl` | text | Grid thumbnail. Falls back to `imageUrl` |
| `youtubeId` | text | YouTube video ID (e.g. `dQw4w9WgXcQ`). Null if not youtube |
| `sourceUrl` | text | Original page URL ("View Original" link) |
| `creatorName` | text | Shown in modal |
| `creatorUrl` | text | Link on creatorName in modal |
| `position` | integer NOT NULL DEFAULT 0 | Manual sort order within section |
| `createdAt` | timestamptz | defaultNow() |
| `updatedAt` | timestamptz | defaultNow() |

### `discovery_item_image`
Carousel frames for `mediaType = 'carousel'` items.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `itemId` | integer NOT NULL FK → `discovery_item(id)` | CASCADE DELETE |
| `imageUrl` | text NOT NULL | CDN URL |
| `thumbnailUrl` | text | |
| `position` | integer NOT NULL DEFAULT 0 | Frame order |

### `discovery_item_tag`
Junction table.

| Column | Type | Notes |
|---|---|---|
| `itemId` | integer NOT NULL FK → `discovery_item(id)` | CASCADE DELETE |
| `tagId` | integer NOT NULL FK → `discovery_tag(id)` | CASCADE DELETE |

---

## 2. Public-Facing UI

### `/discovery` — Section Index
- Identical look to current page: grid of section cards.
- Data loaded from `discovery_section` table ordered by `position`, not from the hardcoded array.
- Section cards show `name` and `description`. "Coming soon" text is removed.
- Sections with zero items still show their card.

### `/discovery/[section]` — Section Media Grid

**Layout:** Masonry grid, reuses `GalleryGrid.svelte`. 4 columns desktop → 2 tablet → 1 mobile.

**Filtering and sorting:**
- Tag filter pills above the grid (same pattern as artwork gallery). Pulls from `discovery_tag` via the section's items.
- Sort toggle: Newest / Oldest (by `createdAt`). Default: Newest.
- Active filter + sort state is local reactive state only — no URL params needed.

**Grid cards:**
- Show thumbnail. For `youtube` items, thumbnail resolves as: `thumbnailUrl` (if set) → `https://img.youtube.com/vi/{youtubeId}/mqdefault.jpg` (auto-fetched, no API key needed) → generic video icon placeholder.
- Small media type badge in the top-right corner: image icon, video icon, youtube icon, carousel icon.
- Title on hover overlay (subtle, same style as artwork cards).

**Section validation:** `+page.server.js` loads section by slug from DB. Throws 404 if not found. Returns section, items (with images + tags), and all tags that appear in this section.

### Full-View Modal (Instagram-Style)

Triggered by clicking any grid card. No URL change.

**Desktop layout — two-panel:**
- Left panel (65% width): media display area, black background.
  - `image`: `<img>` centered, contain-fit.
  - `carousel`: image with prev/next arrow buttons, dot indicators, same navigator as artwork lightbox.
  - `video`: `<video controls>` with CDN `src`.
  - `youtube`: `<iframe>` with `src="https://www.youtube-nocookie.com/embed/{youtubeId}?rel=0&modestbranding=1"`, `allowfullscreen`.
- Right panel (35% width): vertical scroll if content overflows.
  - Title (display font, large).
  - Description (body font, secondary colour).
  - Tags as pill badges (same `Badge` component).
  - Creator row: "By [creatorName]" — name is a link to `creatorUrl` if set, plain text if not.
  - "View Original" button (outline style, opens `sourceUrl` in new tab). Hidden if `sourceUrl` is null.
  - Close button (×) top-right of the right panel.

**Mobile layout:** stacks vertically — media fills viewport width on top, info panel below with padding. Overlay covers full screen with scroll.

**Close behaviour:** click backdrop (left panel outside media on desktop), click ×, or press Escape.

---

## 3. Admin CMS

### 3a. Sidebar Rework (`src/routes/admin/+layout.svelte`)

The flat nav list is replaced with collapsible nav groups. Each group has a header button and indented sub-items that show/hide on click. Active group auto-expands on page load.

**Structure:**

```
Dashboard  (link, always visible)

▼ Artworks          (group header — expands if currentPath starts with /admin/artworks, /admin/categories, /admin/tags, /admin/case-studies)
    Artworks        → /admin/artworks
    Categories      → /admin/categories
    Tags            → /admin/tags
    Case Studies    → /admin/case-studies

▼ Discovery         (group header — expands if currentPath starts with /admin/discovery)
    Items           → /admin/discovery
    Sections        → /admin/discovery/sections
    Tags            → /admin/discovery/tags

── (divider)
View Site           (external link)
[user] [logout]
```

**Behaviour:**
- Groups are independently toggled by clicking the header.
- On initial render, any group containing the current route is expanded; others are collapsed.
- Active sub-item highlights with the same white background + red icon treatment as current nav items.
- Group headers are not navigation links — they only toggle expansion.

**Implementation:** Pure Svelte reactive state (`$state` booleans), no JS library. Chevron icon rotates on expand (CSS `transform: rotate`).

### 3b. Discovery Admin Routes

#### `/admin/discovery` — Items List
Same visual style as `/admin/artworks`.
- Lists all discovery items across all sections.
- Filter dropdown to narrow by section.
- Each row: thumbnail (or youtube icon placeholder), title, section name, media type badge.
- Actions: Edit (pencil), Delete (trash, with confirmation).
- "New Item" button → `/admin/discovery/new`.

#### `/admin/discovery/new` + `/admin/discovery/[id]/edit` — Item Form

Fields:
1. **Title** (text, required)
2. **Description** (textarea)
3. **Section** (select, populated from `discovery_section`)
4. **Media Type** (select: Image / Carousel / Video / YouTube) — controls which upload area renders:
   - `image`: single file upload → R2, same flow as artwork upload.
   - `carousel`: multi-file upload → R2, same drag-sort reorder UI as artwork carousel.
   - `video`: single file upload → R2 (CDN direct video).
   - `youtube`: text field for YouTube URL or bare ID. Server auto-extracts the 11-char video ID from any valid youtube.com or youtu.be URL before saving.
5. **Creator Name** (text)
6. **Creator URL** (text, url input type)
7. **Source URL** (text, url input type)
8. **Tags** (multi-select checkboxes from `discovery_tag`)

Server action uploads to R2 (reuses `src/lib/server/r2.js`), inserts/updates `discovery_item` and `discovery_item_image` rows, syncs `discovery_item_tag` junction.

#### `/admin/discovery/sections` — Sections List
Table with columns: Name, Slug, Item Count, Position.
- Reorder via up/down arrow buttons (swaps `position` values in DB).
- Create new section: inline form at top — Name field only; slug is auto-generated server-side from name.
- Edit: inline or link to `/admin/discovery/sections/[id]/edit` (name + description fields).
- Delete: form POST with confirmation. Blocked (with error message) if section has items — admin must reassign or delete items first.

#### `/admin/discovery/tags` — Tags List
Identical implementation to `/admin/tags` but for `discovery_tag`. Name → auto-slug on save. Delete blocked if tag is in use.

---

## 4. File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/lib/server/db/schema.ts` | Add 5 new tables |
| Create | `drizzle/` (new migration) | DB migration for new tables |
| Modify | `src/routes/admin/+layout.svelte` | Sidebar collapsible groups |
| Create | `src/routes/admin/discovery/+page.server.js` | List items, delete action |
| Create | `src/routes/admin/discovery/+page.svelte` | Items list UI |
| Create | `src/routes/admin/discovery/new/+page.server.js` | Create item + R2 upload |
| Create | `src/routes/admin/discovery/new/+page.svelte` | Create form UI |
| Create | `src/routes/admin/discovery/[id]/edit/+page.server.js` | Load + update item |
| Create | `src/routes/admin/discovery/[id]/edit/+page.svelte` | Edit form UI |
| Create | `src/routes/admin/discovery/sections/+page.server.js` | List, create, reorder, delete sections |
| Create | `src/routes/admin/discovery/sections/+page.svelte` | Sections list UI |
| Create | `src/routes/admin/discovery/sections/[id]/edit/+page.server.js` | Load + update section |
| Create | `src/routes/admin/discovery/sections/[id]/edit/+page.svelte` | Section edit form |
| Create | `src/routes/admin/discovery/tags/+page.server.js` | Discovery tag CRUD |
| Create | `src/routes/admin/discovery/tags/+page.svelte` | Tags list UI |
| Modify | `src/routes/discovery/+page.svelte` | Remove hardcoded sections, use DB data |
| Create | `src/routes/discovery/+page.server.js` | Load sections from DB (file does not exist yet; hardcoded data lives in the Svelte component) |
| Modify | `src/routes/discovery/[section]/+page.server.js` | Load section + items + tags from DB |
| Modify | `src/routes/discovery/[section]/+page.svelte` | Media grid + modal |

---

## 5. Out of Scope

- Pagination (all items load per section; revisit if counts grow large)
- Search across Discovery items
- Public sharing / permalink per item
- Video transcoding or thumbnail generation for self-hosted video
