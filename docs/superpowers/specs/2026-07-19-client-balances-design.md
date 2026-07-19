# Client Balances — Design Spec

**Date:** 2026-07-19
**Status:** draft
**Project:** doncezart (SvelteKit 2, Svelte 5, Drizzle + PostgreSQL)

---

## Overview

Add a private, PIN-protected system where clients can view their remaining balance as a digital receipt. Admins create balances, add spend items (with optional discounts/free items), and clients access them via a short random URL + 4-letter PIN.

Balances are **client-agnostic** — no client identity is stored in the URL, on the page, or in the database. Each balance lives at `/balances/<shortId>` and is protected by a PIN set by the admin.

---

## Database Schema

Two new tables in `src/lib/server/db/schema.ts`:

### `balance`

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | `crypto.randomUUID()` |
| `shortId` | `text` UNIQUE NOT NULL | 8-char random alphanumeric (URL segment) |
| `pinHash` | `text` NOT NULL | scrypt hash, format: `salt:hash` (same as user passwords) |
| `initialAmount` | `integer` NOT NULL | In cents (bani). The amount the client paid up front. |
| `paymentDate` | `date` NOT NULL | When the client made the payment |
| `paymentMethod` | `text` NOT NULL | e.g. "Bank transfer", "Revolut", "Cash" |
| `label` | `text` | Admin-facing identifier. Never shown to client. |
| `expiresAt` | `timestamp` | Nullable. If set and past, receipt still shows but with "Expired" banner. |
| `createdAt` | `timestamp` NOT NULL | `defaultNow()` |
| `updatedAt` | `timestamp` NOT NULL | `defaultNow()` |

### `balanceItem`

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | `crypto.randomUUID()` |
| `balanceId` | `text` NOT NULL FK → `balance.id` | CASCADE on delete |
| `title` | `text` NOT NULL | Shown on receipt. If `url` is set, title renders as a clickable link. |
| `amount` | `integer` NOT NULL | In cents. 0 = free item (shows "FREE"). |
| `type` | `text` NOT NULL | Freeform category (e.g. "Video editing", "Thumbnail", "Extra") |
| `url` | `text` | Nullable. Optional external link on the title. |
| `discountPct` | `integer` NOT NULL DEFAULT 0 | 0–100. Display price = `amount × (1 - discountPct / 100)`. At 100, item shows "FREE". |
| `sortOrder` | `integer` NOT NULL DEFAULT 0 | Controls display order on receipt. |
| `createdAt` | `timestamp` NOT NULL | `defaultNow()` |
| `updatedAt` | `timestamp` NOT NULL | `defaultNow()` |

**Design decisions:**
- Amounts stored as **integers (cents)** — no floating-point money.
- `discountPct` handles both "free items" (set to 100) and partial discounts uniformly.
- `label` is admin-only; the public receipt never references it.
- CASCADE delete: removing a balance cleans up all its items.

---

## Public Routes

### `/balances/[shortId]` — PIN Gate

**Behavior:**
- **Always** renders the PIN input screen — 4 input squares (one per letter, A-Z only, case-insensitive), regardless of whether the `shortId` exists.
- No balance details, no labels, no hints are returned until the correct PIN is submitted.
- If the balance doesn't exist, the PIN screen is identical in appearance and timing — submitting any PIN returns a generic "Invalid PIN" error.

**Server-side (`+page.server.js`):**
- `load`: Returns nothing but the page shell. Does NOT check if `shortId` exists.
- `actions.default` (POST): Receives `{ shortId, pin }`.
  1. Look up `balance` by `shortId`. If not found → return generic error "Invalid PIN" (same as wrong PIN).
  2. Verify PIN against `pinHash` using scrypt.
  3. If PIN is wrong → increment rate-limit counter, return "Invalid PIN".
  4. If PIN is correct → set a **balance session cookie** (`balance_session` = `{balanceId, expiry}`) signed/encrypted, then redirect to same URL (which will now show the receipt).
  5. Rate limit: reuse existing `src/lib/server/rate-limit.js` — 5 failed attempts per IP per 15 minutes, per-balance. After lockout, return "Too many attempts" instead of "Invalid PIN" (still no existence leak).

**Client-side (`+page.svelte`):**
- On mount, checks for `balance_session` cookie via a server `load` that returns `{ authenticated: true, balance: {...} }` if the session is valid.
- If not authenticated: render 4 input squares with auto-focus and auto-advance. Submit on 4th character.
- If authenticated: render the receipt (see below).

### `/balances/[shortId]` — Receipt View

Shown after successful PIN authentication.

**Layout (digital receipt aesthetic, matching doncezart style):**

```
┌──────────────────────────────────┐
│  🧾 Digital Receipt              │
│                                  │
│  Payment date: 15 July 2026      │
│  Payment method: Bank transfer   │
│  Initial amount: 500.00 RON      │
│                                  │
│  ─────────────────────────────── │
│  Items                           │
│                                  │
│  Video Title (linkable)  150.00  │
│    Video editing                  │
│                                  │
│  Thumbnail Design        FREE    │
│    Extra                         │
│                                  │
│  Channel Intro           80.00   │
│    Video editing        -20%     │
│                                  │
│  ─────────────────────────────── │
│  Total spent:      230.00 RON    │
│  Remaining:        270.00 RON    │
│  ─────────────────────────────── │
│                                  │
│  [ Download PDF ]                │
│                                  │
│  Expires: 15 August 2026         │
│  (only if expiresAt is set)      │
└──────────────────────────────────┘
```

**Display rules:**
- Items sorted by `sortOrder`, then `createdAt`.
- Each item shows: title (linked if `url` set), display price (amount after discount), type label below.
- If `discountPct > 0` and `discountPct < 100`: show original amount struck through, then discounted amount, and a `-X%` badge.
- If `displayPrice === 0` (amount is 0 or discountPct is 100): show "FREE" instead of price.
- Total = sum of all display prices.
- Remaining = `initialAmount - total`.
- If `expiresAt` is set: show expiration date at bottom. If expired, show "Expired" warning banner at top.
- "Download PDF" button at bottom.

**Balance session cookie:**
- Name: `balance_session_{shortId}` (one cookie per balance, avoids cross-balance replay)
- Value: `balanceId` (the UUID) — plain, since it's opaque and scoped by path
- Set via SvelteKit `event.cookies.set(name, value, { path, httpOnly, sameSite, secure, maxAge })`
- Max age: 24 hours (86400 seconds)
- Attributes: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in prod, `path: '/balances/{shortId}'`
- No signing/HMAC needed — the balanceId is an unguessable UUID and the cookie is path-scoped.

---

## Admin Routes

All under `/admin/balances`, protected by existing admin auth in `hooks.server.js`.

### Sidebar Entry

New top-level group in `src/routes/admin/+layout.svelte` sidebar, alongside "Artworks" and "Discovery":

```
📊 Balances
```

### `/admin/balances` — List View

- Table of all balances, sorted by `createdAt` DESC.
- Columns: Label, Payment Date, Initial Amount, Spent, Remaining, Status (Active/Expired), Actions.
- Clicking a balance row goes to its detail/edit page.
- "New Balance" button at top.

### `/admin/balances/new` — Create Balance

Form fields:
- **Label** (text) — internal identifier
- **Initial amount** (number, in RON) — converted to cents on save
- **Payment date** (date picker)
- **Payment method** (text)
- **PIN** (4 letters, text input with `maxlength=4`, shown as `••••` after entry)
- **Expiry date** (optional date picker)

On submit: generate `shortId` (8-char random alphanumeric), hash PIN with scrypt, insert balance, redirect to `/admin/balances/[id]`.

### `/admin/balances/[id]` — Edit Balance + Manage Items

Single page with two sections:

**Top: Balance Details (editable)**
- All fields from creation, inline-editable.
- PIN field: "Change PIN" button that reveals input, or leave blank to keep existing.
- Save button.
- Delete balance button (with confirmation modal).

**Bottom: Items List**
- Table of items: Title, Type, Amount, Discount, Display Price, Actions (edit/delete).
- Each item row is clickable to edit inline or via modal.
- "Add Item" button opens a form inline or modal:

  Add/Edit Item fields:
  - **Title** (text, required)
  - **Amount** (number in RON, required. 0 = free)
  - **Type** (text, required)
  - **URL** (optional URL)
  - **Discount %** (number 0–100, default 0)

- Delete item: two options:
  1. **Remove** — hard delete, item disappears, total recalculates.
  2. **Discount to 100%** — keeps the item visible but shows as FREE (sets `discountPct = 100`).

- Drag-to-reorder items (updates `sortOrder`).

**Live preview:** A small receipt preview panel on the side or below, showing how the receipt will look to the client. Updates in real-time as items are added/edited.

---

## Security

### PIN Verification

- Uses same `crypto.scrypt` pattern as admin passwords (`src/lib/server/auth.js`).
- Hash: 16-byte random salt, 64-byte derived key, stored as `salt:hex:hash:hex`.
- PINs are case-insensitive (uppercased before hashing). 4 letters = 26^4 = ~456K combinations.

### Brute-force Protection

Reuse existing `src/lib/server/rate-limit.js`:
- 5 failed PIN attempts per IP per 15 minutes.
- After lockout: return "Too many attempts. Try again later." — no existence leak.
- Rate limit key includes the `shortId` so attacking one balance doesn't block others for the same IP.

### Timing Attack Mitigation

- When balance doesn't exist: still run a dummy scrypt hash (against a fixed dummy hash) so timing is identical to a real (but wrong) PIN attempt.
- Both paths return the exact same error message and take roughly the same time.

### Cookie Security

- `balance_session`: separate cookie from admin `session_id`. Compromising one doesn't compromise the other.
- Session is scoped to `/balances/{shortId}` path so it can't be used across balances.

---

## PDF Generation

"Download PDF" button on the receipt page — **client-side only**, no server deps:

- Use `html2canvas` to capture the receipt DOM element as a canvas.
- Use `jspdf` to embed the canvas as a full-page PDF.
- Trigger browser download via `pdf.save('receipt-{shortId}.pdf')`.
- Both libraries are loaded dynamically (`await import(...)`) only when user clicks "Download PDF" to avoid bloating the initial bundle.
- The receipt element gets a `data-pdf` attribute for targeting; the PDF button itself is hidden in the capture via CSS class.

No server-side PDF endpoint needed.

---

## Audit Logging

Reuse the existing `audit_event` table — it already has flexible `entity_type`, `entity_id` (text), `action` (text), and `payload` (jsonb) columns. The existing pattern logs `actor_id`, `ip`, and timestamp.

Events:
- `balance.create` — payload: `{ label, initialAmount }`
- `balance.update` — payload: `{ changed: ['label', 'pin', ...] }`
- `balance.delete` — payload: `{ label }`
- `balance_item.create` — payload: `{ title, amount, type }`
- `balance_item.update` — payload: `{ changed: ['title', 'amount', ...] }`
- `balance_item.delete` — payload: `{ title }`

Existing `audit_event` columns are sufficient — no new table needed.

---

## Error Handling

- **Nonexistent balance:** PIN screen shows, any PIN returns "Invalid PIN" — indistinguishable from a real balance with wrong PIN.
- **Expired balance:** PIN still works, receipt still shows, but a yellow "This balance has expired" banner appears at top.
- **Rate limited:** After 5 failed attempts, show "Too many attempts. Please try again in 15 minutes."
- **Invalid PIN:** Generic "Invalid PIN" message, no indication of whether the balance exists.
- **Server errors:** Generic "Something went wrong" message, logged server-side.

---

## Route Summary

| Route | Auth | Purpose |
|---|---|---|
| `/balances/[shortId]` | PIN | PIN gate → receipt view |
| `/admin/balances` | Admin session | List all balances |
| `/admin/balances/new` | Admin session | Create balance |
| `/admin/balances/[id]` | Admin session | Edit balance + manage items |

---

## Files Changed / Created

```
src/
├── lib/
│   ├── server/
│   │   ├── db/
│   │   │   └── schema.ts          # ADD: balance, balanceItem tables
│   │   └── balance.js             # NEW: balance helpers (PIN verify, session, shortId gen)
│   └── components/
│       ├── PinInput.svelte        # NEW: 4-square PIN input component
│       └── Receipt.svelte         # NEW: receipt display component
├── routes/
│   ├── balances/
│   │   └── [shortId]/
│   │       ├── +page.server.js    # NEW: PIN verify + receipt data
│   │       ├── +page.svelte       # NEW: PIN gate / receipt switch
│   │       └── +server.js         # NEW: PDF download endpoint (if server-side)
│   └── admin/
│       ├── +layout.svelte         # EDIT: add "Balances" to sidebar
│       └── balances/
│           ├── +page.server.js    # NEW: list balances
│           ├── +page.svelte       # NEW: balances table
│           ├── new/
│           │   ├── +page.server.js # NEW: create balance form action
│           │   └── +page.svelte   # NEW: create balance form
│           └── [id]/
│               ├── +page.server.js # NEW: edit balance + item CRUD
│               └── +page.svelte   # NEW: edit balance + item management
└── drizzle/
    └── 000X_balances.sql          # NEW: migration
```
