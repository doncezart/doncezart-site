# DONCEZART — Visual Style Reference

## Design Movement: Dark Bold Minimalism

A fusion of **Swiss/International Typographic Style** and **dark-mode editorial design**. Sometimes called "typographic minimalism" or "dark editorial." It borrows the grid discipline and type hierarchy of Swiss design, the raw honesty of brutalism, and the dramatic contrast of editorial print — then renders it all on a black canvas.

---

## Core Principles

| Principle | Description |
|---|---|
| **High contrast** | Pure black (#000) background, white text, minimal mid-tones. No gradients except functional ones (glass blur on navbar). |
| **Typography as hero** | Large display type dominates the page. The font *is* the design. Minimal iconography. |
| **Center-aligned, full width** | Content is centered within a max-width container (1920px). Grids stretch edge to edge within that container. |
| **Content-first** | The work speaks for itself. No decorative filler. If it doesn't communicate, it doesn't belong. |
| **Restrained color** | Monochrome palette with a single accent (red `#ff0000` for theme-color/branding only). Body text in muted gray. |
| **Bold but quiet** | Big type and big images, but no noise — no animations for their own sake, no parallax, no decorative shapes. |

---

## Typography

| Role | Font | Weight | Color |
|---|---|---|---|
| Display / H1 / H2 | **Yapari Trial** | 600 (semibold) | `#FFFFFF` |
| Body / UI / H3 | **Satoshi** | 400–500 | `#8B989C` (paragraphs), `#FFFFFF` (headings, links) |
| Buttons | Satoshi | 400 | Varies by context |

**Pairing rationale:** Yapari is a geometric display face with sharp, condensed letterforms — bold and architectural. Satoshi is a modern geometric sans with excellent readability. The contrast between the expressive display and the neutral body mirrors the overall "bold but clean" identity.

**Type scale guidance:**
- Hero headlines: oversized, center-aligned, generous vertical padding (10rem+ top/bottom)
- Section headings (H1): large but not hero-sized
- Body text: standard 1rem, comfortable line height
- Nav links: 16px, muted gray → white on hover

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| Background | `#000000` | Page background, card backgrounds |
| Text primary | `#FFFFFF` | Headings, links, active nav items |
| Text secondary | `#8B989C` | Body paragraphs, inactive nav items |
| Border | `#FFFFFF` at 0.1rem | Buttons, form fields, dividers |
| Glass BG | `rgba(0,0,0,0.8)` | Navbar backdrop |
| Accent | `#FF0000` | Theme-color meta tag, brand mark only — never as UI fill |

**Rule:** No new colors without a clear functional reason. The palette stays monochrome.

---

## Layout Patterns

### Hero / Landing
- Center-aligned, generous vertical padding (10rem top+bottom)
- Logo + tagline only — no clutter
- Responsive: wide logo on desktop, square logo on mobile (breakpoint 667px)

### Content grids
- CSS Grid with `1fr` columns (4-col → 2-col → 1-col stack)
- Consistent `1rem` gap
- Full-width within the 1920px max container
- Images fill their grid cell (width: 100%)

### Container
- Max width: `1920px`, centered with `margin: 0 auto`
- Padding: `2rem` sides, `0` top (navbar handles top spacing)

### Navigation
- Sticky top, glass-blur backdrop
- Desktop: symmetrical link groups flanking centered logo
- Mobile: hamburger → vertical dropdown with border-bottom

---

## Component Style

### Buttons
Two variants:
1. **Solid** — white bg, black text, no border
2. **Outline** (`.main-border`) — transparent bg, white border (0.1rem solid), white text

Both: `padding: 0.75rem 2rem`, Satoshi font, no border-radius, `transition: 0.3s`, hover = underline. No rounded corners anywhere.

### Form fields
- Transparent background, white border, white text
- No border-radius
- Resize disabled on textareas
- Focus: `outline: none` (border stays)

### Cards / Case studies
- Image fills width, label text (H3) below
- No card border, no shadow, no hover effect — the image is the card

---

## Spacing Philosophy
- Generous vertical breathing room between sections (`<br>` tags or large padding)
- Tight gaps within grids (1rem)
- No decorative whitespace — space is structural

---

## Interaction & Motion
- `transition: 0.3s` on buttons (color/underline)
- `slide` transition on route changes (Svelte)
- Logo hover: subtle height increase (2rem → 2.2rem)
- Nav links: muted gray → white on hover
- **No:** parallax, scroll-triggered animations, loading spinners on content, decorative motion

---

## Reference Websites

Sites that share this aesthetic (dark, bold, typographic, minimal):

| Website | Why it's relevant |
|---|---|
| [ndstudio.gov](https://ndstudio.gov) | Government site with bold modernist type, center-aligned, full-width, high contrast dark/light sections, spaced letterforms. The "institutional bold minimalism" end of the spectrum. |
| [minimal.gallery](https://minimal.gallery) | Curates sites in this exact aesthetic lane. Clean grid, typography-first, monochrome. A good ongoing source of inspiration. |
| [linear.app](https://linear.app) | Dark theme, bold sans-serif headlines, high contrast, content-forward with minimal chrome. Proof this style works for product/SaaS, not just portfolios. |
| [brittanychiang.com](https://brittanychiang.com) | Dark portfolio, scroll-driven single page, muted secondary text with bright primary text. Same type hierarchy pattern (display + clean sans body). |
| [ibm.com/design/language](https://www.ibm.com/design/language) | IBM's design language site — grid discipline, bold type, restrained palette. Represents the Swiss/corporate heritage this style descends from. |
| [tayte.co](https://www.tayte.co) | Minimal dark portfolio featured on minimal.gallery. |
| [karl.works](https://karl.works) | Portfolio with bold typographic identity, dark theme. |
| [corentinbernadou.com](https://corentinbernadou.com) | Award-winning minimal dark portfolio (Awwwards SOTD). |

---

## Anti-patterns (what this style avoids)

- Rounded corners, pill buttons, soft shadows
- Pastel or muted color palettes
- Gradient backgrounds
- Decorative illustrations or icons
- Animated cursors or scroll-jacking
- Card borders with visible radius
- Light/beige backgrounds
- Playful or handwritten typefaces
- Excessive hover effects or micro-interactions

---

## Design DNA Summary

> **Black canvas. White type. Let the work breathe.**
>
> The style is confident enough to use empty space as a design element and bold enough to make a single word fill the viewport. It trusts the content — thumbnails, logos, case studies — to carry the visual weight, while the frame stays invisible.

Movement lineage: **Swiss Typographic Style → Brutalist Web → Dark Editorial Minimalism**
