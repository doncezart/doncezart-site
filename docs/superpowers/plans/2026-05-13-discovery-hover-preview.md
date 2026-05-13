# Discovery Hover Video Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play a muted looping mp4 preview when a user hovers over a grid item in `/discovery/[section]`, falling back silently to a static thumbnail when no preview exists.

**Architecture:** A `<video>` element with no `src` at render time sits absolutely positioned over the `<img>` in each gallery item. On `mouseenter`, `src` is injected from `data-src`, `play()` is called, and the video fades in on `canplay`. On `mouseleave`, the video fades out, `src` is cleared, and `load()` resets internal buffer state. Gated behind an `enableHoverPreview` prop on `GalleryGrid` so only the discovery page activates it.

**Tech Stack:** Svelte 5 (runes), vanilla browser APIs (`HTMLVideoElement`), CSS transitions

---

## File Map

| File | Change |
|---|---|
| `src/lib/components/GalleryGrid.svelte` | Add `enableHoverPreview` prop, `hoverStart`/`hoverEnd` handlers, `<video class="hover-preview">` element, and supporting CSS |
| `src/routes/discovery/[section]/+page.svelte` | Pass `enableHoverPreview={true}` to `<GalleryGrid>` |

No other files are touched. No DB changes. No new dependencies.

---

## Context to read before starting

- **Spec:** `docs/superpowers/specs/2026-05-13-discovery-hover-preview-design.md`
- **`GalleryGrid.svelte`** `src/lib/components/GalleryGrid.svelte` — understand the existing `hoverStart`/`hoverEnd` pattern, the masonry layout, and the two existing media branches (`videoSrc` and `img`).
- **Discovery page:** `src/routes/discovery/[section]/+page.svelte` — note how `previewUrl` is already mapped into every item in `allGridItems`.

---

## Task 1: Add `enableHoverPreview` prop and hover handlers to GalleryGrid

**Files:**
- Modify: `src/lib/components/GalleryGrid.svelte` — `$props()` destructure and `<script>` block

- [ ] **Step 1: Read the current `$props()` line**

  Open `src/lib/components/GalleryGrid.svelte`. The props line looks like:
  ```js
  let { items = [], columns = 4, showMoreHref = '/my-work', onItemClick = null, showAll = false } = $props();
  ```

- [ ] **Step 2: Add `enableHoverPreview` to the destructure**

  Replace that line with:
  ```js
  let { items = [], columns = 4, showMoreHref = '/my-work', onItemClick = null, showAll = false, enableHoverPreview = false } = $props();
  ```

- [ ] **Step 3: Add hover handler functions directly below the `$props()` line**

  ```js
  function hoverStart(e) {
      const video = e.currentTarget.querySelector('.hover-preview');
      if (!video) return;
      video.src = video.dataset.src;
      const p = video.play();
      if (p) p.catch(() => {});
      const onCanPlay = () => video.classList.add('preview-visible');
      video._cpHandler = onCanPlay;
      video.addEventListener('canplay', onCanPlay, { once: true });
  }

  function hoverEnd(e) {
      const video = e.currentTarget.querySelector('.hover-preview');
      if (!video) return;
      video.classList.remove('preview-visible');
      if (video._cpHandler) {
          video.removeEventListener('canplay', video._cpHandler);
          video._cpHandler = null;
      }
      video.pause();
      video.removeAttribute('src');
      video.load();
  }
  ```

- [ ] **Step 4: Verify no syntax errors**

  Run:
  ```bash
  cd /home/cezar/doncezart && pnpm svelte-check 2>&1 | tail -20
  ```
  Expected: `0 errors` (warnings about `a11y_media_has_caption` are pre-existing and acceptable).

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/components/GalleryGrid.svelte
  git commit -m "feat(gallery): add enableHoverPreview prop and hover handlers"
  ```

---

## Task 2: Add hover video element and wire up event handlers in the template

**Files:**
- Modify: `src/lib/components/GalleryGrid.svelte` — template section

- [ ] **Step 1: Find the `.gallery-item` div in the template**

  The div currently looks like:
  ```svelte
  <div
      class="gallery-item"
      class:clickable={!!onItemClick}
      onclick={() => handleClick(item)}
      onkeydown={(e) => e.key === 'Enter' && handleClick(item)}
      role={onItemClick ? 'button' : undefined}
      tabindex={onItemClick ? 0 : undefined}
  >
  ```

- [ ] **Step 2: Add `onmouseenter` and `onmouseleave` to the `.gallery-item` div**

  Replace the opening div with:
  ```svelte
  <div
      class="gallery-item"
      class:clickable={!!onItemClick}
      onclick={() => handleClick(item)}
      onkeydown={(e) => e.key === 'Enter' && handleClick(item)}
      onmouseenter={enableHoverPreview ? hoverStart : undefined}
      onmouseleave={enableHoverPreview ? hoverEnd : undefined}
      role={onItemClick ? 'button' : undefined}
      tabindex={onItemClick ? 0 : undefined}
  >
  ```

- [ ] **Step 3: Find the `{:else}` img branch in the template**

  Currently:
  ```svelte
  {:else}
      <img src={item.src} alt={item.alt} loading="lazy" />
  {/if}
  ```

- [ ] **Step 4: Add the hover video element after the `<img>` inside `{:else}`**

  ```svelte
  {:else}
      <img src={item.src} alt={item.alt} loading="lazy" />
      {#if enableHoverPreview && item.previewUrl}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video
              class="hover-preview"
              data-src={item.previewUrl}
              muted
              playsinline
              loop
              disablepictureinpicture
              controlslist="nopictureinpicture nodownload noremoteplayback"
              tabindex="-1"
          ></video>
      {/if}
  {/if}
  ```

  Key attributes explained:
  - No `src` — injected dynamically on hover
  - `data-src` — holds the preview URL, read by `hoverStart`
  - `muted` + `playsinline` — required for autoplay in all browsers without user gesture
  - `loop` — repeats the 5-second clip continuously
  - `disablepictureinpicture` + `controlslist` — prevents any browser UI from appearing
  - `tabindex="-1"` — removed from tab order

- [ ] **Step 5: Verify no syntax errors**

  ```bash
  cd /home/cezar/doncezart && pnpm svelte-check 2>&1 | tail -20
  ```
  Expected: `0 errors`

- [ ] **Step 6: Commit**

  ```bash
  git add src/lib/components/GalleryGrid.svelte
  git commit -m "feat(gallery): add hover-preview video element to gallery items"
  ```

---

## Task 3: Add CSS for `.hover-preview`

**Files:**
- Modify: `src/lib/components/GalleryGrid.svelte` — `<style>` block

- [ ] **Step 1: Locate the `.thumb-video` rule in the `<style>` block**

  It currently looks like:
  ```css
  .thumb-video { pointer-events: none; background: #000; }
  ```

- [ ] **Step 2: Add the hover-preview rules directly after it**

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

  Why `position: absolute; inset: 0`:
  - The parent `.gallery-item` already has `position: relative`
  - `inset: 0` means `top: 0; right: 0; bottom: 0; left: 0` — fills the item exactly
  - Zero contribution to masonry height calculation

  Why `background: transparent` (not `#000`):
  - The `<img>` beneath shows through while the video loads — no black flash

- [ ] **Step 3: Verify the item-overlay still renders above the video**

  The `.item-overlay` has `position: absolute` and no explicit `z-index`. The video is rendered before the overlay in the DOM, so stacking order keeps the overlay on top. No z-index changes needed.

- [ ] **Step 4: Verify no syntax errors**

  ```bash
  cd /home/cezar/doncezart && pnpm svelte-check 2>&1 | tail -20
  ```
  Expected: `0 errors`

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/components/GalleryGrid.svelte
  git commit -m "feat(gallery): add hover-preview CSS"
  ```

---

## Task 4: Enable the feature in the discovery page

**Files:**
- Modify: `src/routes/discovery/[section]/+page.svelte`

- [ ] **Step 1: Find the `<GalleryGrid>` call in the discovery page template**

  It looks like:
  ```svelte
  <GalleryGrid
      items={displayedItems}
      columns={columns}
      showAll={true}
      onItemClick={openModal}
  />
  ```

- [ ] **Step 2: Add `enableHoverPreview={true}`**

  ```svelte
  <GalleryGrid
      items={displayedItems}
      columns={columns}
      showAll={true}
      onItemClick={openModal}
      enableHoverPreview={true}
  />
  ```

- [ ] **Step 3: Verify no syntax errors**

  ```bash
  cd /home/cezar/doncezart && pnpm svelte-check 2>&1 | tail -20
  ```
  Expected: `0 errors`

- [ ] **Step 4: Commit**

  ```bash
  git add src/routes/discovery/[section]/+page.svelte
  git commit -m "feat(discovery): enable hover video preview on gallery grid"
  ```

---

## Task 5: Manual browser verification

The project has no automated test suite. Verify by hand in the running dev server (`pnpm run dev`, port 6969).

- [ ] **Step 1: Open a discovery section that has previews**

  Navigate to `http://localhost:6969/discovery/videography` (or any section where items have `previewUrl` set in the DB).

- [ ] **Step 2: Hover over an item that has a preview**

  Expected:
  - After a brief moment (video fetch + first frame decode), the preview video fades in over the thumbnail
  - The hover metadata overlay (title, chips) still renders on top of the video
  - No video controls, no PiP button visible anywhere
  - The clip loops continuously while hovering

- [ ] **Step 3: Move the mouse away**

  Expected:
  - Video fades out immediately
  - Static thumbnail is visible again
  - No error in the browser console

- [ ] **Step 4: Rapid mouse-over test**

  Sweep the mouse quickly across multiple items.
  Expected:
  - No console errors
  - No stuck visible videos after the mouse has left
  - No visible flicker or black frames

- [ ] **Step 5: Hover over an item without a `previewUrl`**

  Expected:
  - Nothing happens — thumbnail stays static
  - No error in the browser console

- [ ] **Step 6: Verify homepage and /my-work are unaffected**

  Navigate to `http://localhost:6969` and `http://localhost:6969/my-work`.
  Expected:
  - No hover video behavior on either page
  - Existing behavior (click-to-modal, masonry) unchanged

- [ ] **Step 7: Check network tab on hover**

  Open DevTools → Network → filter by `mp4`. Hover over an item.
  Expected:
  - The `.mp4` request starts **only after** mouseenter — no pre-fetching at page load
  - After mouseleave, no additional requests for the same file

- [ ] **Step 8: Final commit if any manual fixes were made during verification**

  ```bash
  git add -p
  git commit -m "fix(gallery): <describe any fix>"
  ```
