# Discovery Hover Video Preview — Design Spec

**Date:** 2026-05-13
**Status:** Approved

---

## Overview

When a user hovers over a grid item in `/discovery/[section]`, a short muted looping mp4 preview plays in place of the static thumbnail. Items without a `previewUrl` remain static. No video data is fetched until hover begins.

---

## Architecture

Single-file change: `src/lib/components/GalleryGrid.svelte`. A new boolean prop `enableHoverPreview` (default `false`) gates the feature. The discovery page passes `enableHoverPreview={true}`; homepage and `/my-work` are untouched.

The `previewUrl` field is already on every grid item object, already populated from the DB, and already passed through `allGridItems` in the discovery page — no server or schema changes needed.

---

## Approach: Persistent overlay element, lazy src injection

A `<video class="hover-preview">` is always in the DOM for items that have a `previewUrl`, positioned absolutely over the `<img>`, opacity 0, with **no `src`** at render time. `data-src` holds the preview URL.

This is chosen over:
- **Dynamic element creation** (DOM churn on every hover, race conditions on rapid mouse-overs)
- **`preload="none"` with src always set** (browsers still prefetch DNS/TCP on large grids, violating the no-preload requirement)

---

## DOM Structure (per item)

```
.gallery-item
  <img>                    ← always rendered baseline thumbnail
  <video class="hover-preview">  ← absolute, full-cover, opacity 0 at rest, no src
  .item-overlay            ← unchanged, z-index above both
```

---

## Video Element Attributes

- `muted`
- `playsinline`
- `loop`
- `disablepictureinpicture`
- `controlslist="nopictureinpicture nodownload noremoteplayback"`
- `tabindex="-1"`
- No `controls`
- No `src` at render time — set dynamically on hover

---

## Interaction Logic

**`mouseenter`:**
1. Assign `video.src = video.dataset.src`
2. Call `video.play()` — catch and ignore rejection (rapid hover cancel)
3. On `canplay` event → add class `.preview-visible` (opacity: 1, 0.15s transition)

**`mouseleave`:**
1. Remove `.preview-visible` immediately (instant fade-out via CSS transition)
2. Remove the pending `canplay` listener if it hasn't fired yet
3. `video.pause()`
4. `video.removeAttribute('src')`
5. `video.load()` — resets internal state, releases buffered data

The `canplay` listener is registered as `{ once: true }` and stored on the element as `_cpHandler` for removal on early leave, preventing leaks during rapid hover sequences.

---

## CSS

```css
.hover-preview {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
    display: block;
    background: transparent;
}
.hover-preview.preview-visible {
    opacity: 1;
}
```

The `<img>` remains visible underneath at all times — the video fades in on top once it has data. No blank-frame flash on slow connections.

---

## Masonry Impact

None. The `<video>` is `position: absolute; inset: 0` — zero height contribution to the masonry layout algorithm.

---

## Scope

| Location | Changed |
|---|---|
| `src/lib/components/GalleryGrid.svelte` | Yes |
| `src/routes/discovery/[section]/+page.svelte` | Yes — add `enableHoverPreview={true}` |
| `src/routes/+page.svelte` (homepage) | No |
| `src/routes/my-work/+page.svelte` | No |
| DB schema | No |
| Server routes | No |

---

## Out of Scope

- Hover preview for items with `videoSrc` (native video media type) — already play inline
- Hover preview on homepage or my-work grids
- Any preloading, eager fetching, or prefetch hints
- Delay before triggering on hover (fires immediately on `mouseenter`)
