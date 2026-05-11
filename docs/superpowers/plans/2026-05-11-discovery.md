# Discovery Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Discovery section — 5 new isolated DB tables, admin CRUD (items, sections, tags) with a reworked collapsible sidebar, and a public media grid with an Instagram-style split modal supporting image, carousel, video, and YouTube media types.

**Architecture:** Fully isolated Discovery tables (no coupling to artwork schema). Public section routes load from DB. Admin sidebar becomes grouped/collapsible. GalleryGrid is reused for the public grid by mapping discovery items to its expected shape. The Instagram-style modal is inline in the section page.

**Tech Stack:** SvelteKit 2 / Svelte 5, Drizzle ORM, PostgreSQL, `@aws-sdk/client-s3` (R2 uploads), `sharp` (image processing via existing `processImage`), Font Awesome 7, plain CSS, pnpm.

---

## File Map

| Action | File |
|---|---|
| Modify | `src/lib/server/db/schema.ts` |
| Modify | `src/routes/admin/+layout.svelte` |
| Create | `src/routes/admin/discovery/+page.server.js` |
| Create | `src/routes/admin/discovery/+page.svelte` |
| Create | `src/routes/admin/discovery/new/+page.server.js` |
| Create | `src/routes/admin/discovery/new/+page.svelte` |
| Create | `src/routes/admin/discovery/[id]/edit/+page.server.js` |
| Create | `src/routes/admin/discovery/[id]/edit/+page.svelte` |
| Create | `src/routes/admin/discovery/sections/+page.server.js` |
| Create | `src/routes/admin/discovery/sections/+page.svelte` |
| Create | `src/routes/admin/discovery/tags/+page.server.js` |
| Create | `src/routes/admin/discovery/tags/+page.svelte` |
| Create | `src/routes/discovery/+page.server.js` |
| Modify | `src/routes/discovery/+page.svelte` |
| Modify | `src/routes/discovery/[section]/+page.server.js` |
| Rewrite | `src/routes/discovery/[section]/+page.svelte` |

---

## Task 1: Add 5 new tables to schema.ts and push to DB

**Files:**
- Modify: `src/lib/server/db/schema.ts`

- [ ] **Step 1: Append the 5 Discovery tables to `src/lib/server/db/schema.ts`**

Add this block at the end of the file, before the `// ── Types ──` section:

```typescript
// ── Discovery ──────────────────────────────────────────
export const discoverySection = pgTable('discovery_section', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	position: integer('position').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const discoveryTag = pgTable('discovery_tag', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	slug: text('slug').notNull().unique()
});

export const discoveryItem = pgTable('discovery_item', {
	id: serial('id').primaryKey(),
	sectionId: integer('section_id').notNull().references(() => discoverySection.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	mediaType: text('media_type').notNull(), // 'image' | 'video' | 'youtube' | 'carousel'
	imageUrl: text('image_url'),
	thumbnailUrl: text('thumbnail_url'),
	youtubeId: text('youtube_id'),
	sourceUrl: text('source_url'),
	creatorName: text('creator_name'),
	creatorUrl: text('creator_url'),
	position: integer('position').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const discoveryItemImage = pgTable('discovery_item_image', {
	id: serial('id').primaryKey(),
	itemId: integer('item_id').notNull().references(() => discoveryItem.id, { onDelete: 'cascade' }),
	imageUrl: text('image_url').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	position: integer('position').notNull().default(0)
});

export const discoveryItemTag = pgTable('discovery_item_tag', {
	itemId: integer('item_id').notNull().references(() => discoveryItem.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id').notNull().references(() => discoveryTag.id, { onDelete: 'cascade' })
});
```

Also add these type exports at the bottom of the `// ── Types ──` section:

```typescript
export type DiscoverySection = typeof discoverySection.$inferSelect;
export type DiscoveryTag = typeof discoveryTag.$inferSelect;
export type DiscoveryItem = typeof discoveryItem.$inferSelect;
export type DiscoveryItemImage = typeof discoveryItemImage.$inferSelect;
```

- [ ] **Step 2: Push the schema to the database**

```bash
cd /home/cezar/doncezart
npx drizzle-kit push
```

Expected: Drizzle lists 5 new tables and confirms creation. No errors.

- [ ] **Step 3: Verify build still passes**

```bash
pnpm build
```

Expected: Build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/db/schema.ts
git commit -m "feat(discovery): add 5 new isolated DB tables"
```

---

## Task 2: Rework admin sidebar — collapsible nav groups

**Files:**
- Modify: `src/routes/admin/+layout.svelte`

The flat `<nav>` is replaced with collapsible group headers. Each group auto-expands when the current URL is inside it.

- [ ] **Step 1: Replace the `<script>` block in `src/routes/admin/+layout.svelte`**

Replace the existing `<script>` block with:

```svelte
<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	let { data, children } = $props();

	let isLoginPage = $derived(page.url.pathname === '/admin/login');
	let currentPath = $derived(page.url.pathname);

	function isActive(href) {
		if (href === '/admin') return currentPath === '/admin';
		return currentPath.startsWith(href);
	}

	// Auto-open the group that contains the current route
	let artworksOpen = $state(
		['/admin/artworks', '/admin/categories', '/admin/tags', '/admin/case-studies']
			.some(p => page.url.pathname.startsWith(p))
	);
	let discoveryOpen = $state(page.url.pathname.startsWith('/admin/discovery'));

	function isDiscoveryItems() {
		return currentPath === '/admin/discovery' ||
			(currentPath.startsWith('/admin/discovery/') &&
				!currentPath.startsWith('/admin/discovery/sections') &&
				!currentPath.startsWith('/admin/discovery/tags'));
	}
</script>
```

- [ ] **Step 2: Replace the `<nav class="sidebar-nav">` block in the template**

Find and replace the `<nav class="sidebar-nav">` block with:

```svelte
<nav class="sidebar-nav">
	<!-- Artworks group -->
	<button
		class="nav-group"
		class:nav-group--open={artworksOpen}
		onclick={() => (artworksOpen = !artworksOpen)}
	>
		<i class="fa-solid fa-images"></i>
		<span>Artworks</span>
		<i class="fa-solid fa-chevron-down nav-chevron" class:rotated={artworksOpen}></i>
	</button>
	{#if artworksOpen}
		<div class="nav-subitems">
			<a href="/admin/artworks" class="nav-subitem" class:active={isActive('/admin/artworks')}>
				Items
			</a>
			<a href="/admin/categories" class="nav-subitem" class:active={isActive('/admin/categories')}>
				Categories
			</a>
			<a href="/admin/tags" class="nav-subitem" class:active={isActive('/admin/tags')}>
				Tags
			</a>
			<a href="/admin/case-studies" class="nav-subitem" class:active={isActive('/admin/case-studies')}>
				Case Studies
			</a>
		</div>
	{/if}

	<!-- Discovery group -->
	<button
		class="nav-group"
		class:nav-group--open={discoveryOpen}
		onclick={() => (discoveryOpen = !discoveryOpen)}
	>
		<i class="fa-solid fa-compass"></i>
		<span>Discovery</span>
		<i class="fa-solid fa-chevron-down nav-chevron" class:rotated={discoveryOpen}></i>
	</button>
	{#if discoveryOpen}
		<div class="nav-subitems">
			<a href="/admin/discovery" class="nav-subitem" class:active={isDiscoveryItems()}>
				Items
			</a>
			<a href="/admin/discovery/sections" class="nav-subitem" class:active={isActive('/admin/discovery/sections')}>
				Sections
			</a>
			<a href="/admin/discovery/tags" class="nav-subitem" class:active={isActive('/admin/discovery/tags')}>
				Tags
			</a>
		</div>
	{/if}
</nav>
```

- [ ] **Step 3: Add the new CSS for groups to the `<style>` block**

Add these rules to the existing `<style>` block (after the `.nav-item.active i` rule):

```css
/* Nav groups */
.nav-group {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.6rem 0.75rem;
	border-radius: 0.5rem;
	color: rgba(255, 255, 255, 0.45);
	font-family: 'Satoshi', sans-serif;
	font-size: 0.9rem;
	font-weight: 500;
	cursor: pointer;
	background: none;
	border: none;
	width: 100%;
	text-align: left;
	transition: all 0.15s ease;
}
.nav-group:hover {
	color: rgba(255, 255, 255, 0.8);
	background: rgba(255, 255, 255, 0.04);
}
.nav-group--open {
	color: #fff;
}
.nav-group i:first-child {
	width: 1.25rem;
	text-align: center;
	font-size: 0.9rem;
}
.nav-chevron {
	margin-left: auto;
	font-size: 0.7rem;
	transition: transform 0.2s ease;
}
.nav-chevron.rotated {
	transform: rotate(180deg);
}

/* Subitems */
.nav-subitems {
	display: flex;
	flex-direction: column;
	gap: 0.1rem;
	padding-left: 2.25rem;
	margin-bottom: 0.25rem;
}
.nav-subitem {
	display: block;
	padding: 0.4rem 0.6rem;
	border-radius: 0.4rem;
	text-decoration: none;
	color: rgba(255, 255, 255, 0.4);
	font-family: 'Satoshi', sans-serif;
	font-size: 0.85rem;
	font-weight: 400;
	transition: all 0.15s ease;
}
.nav-subitem:hover {
	color: rgba(255, 255, 255, 0.75);
	background: rgba(255, 255, 255, 0.04);
}
.nav-subitem.active {
	color: #fff;
	background: rgba(255, 255, 255, 0.07);
}
```

- [ ] **Step 4: Verify build and check the sidebar visually**

```bash
pnpm build
```

Start dev server and navigate to `/admin/artworks`, `/admin/tags`, `/admin/categories` — each should expand the Artworks group and highlight the correct subitem.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/+layout.svelte
git commit -m "feat(admin): collapsible sidebar nav groups for Artworks and Discovery"
```

---

## Task 3: Discovery Tags admin

**Files:**
- Create: `src/routes/admin/discovery/tags/+page.server.js`
- Create: `src/routes/admin/discovery/tags/+page.svelte`

- [ ] **Step 1: Create `src/routes/admin/discovery/tags/+page.server.js`**

```js
import { db } from '$lib/server/db/index.js';
import { discoveryTag } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function load() {
	const tags = await db.select().from(discoveryTag).orderBy(discoveryTag.name);
	return { tags };
}

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		if (!name) return fail(400, { error: 'Tag name is required.' });
		const slug = slugify(name);
		try {
			await db.insert(discoveryTag).values({ name, slug });
		} catch {
			return fail(400, { error: 'Tag already exists.' });
		}
		return { created: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id.' });
		await db.delete(discoveryTag).where(eq(discoveryTag.id, id));
		return { deleted: true };
	}
};
```

- [ ] **Step 2: Create `src/routes/admin/discovery/tags/+page.svelte`**

```svelte
<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<div class="page-header">
	<h1>Discovery Tags</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<form method="POST" action="?/create" use:enhance class="create-form">
	<input type="text" name="name" placeholder="New tag name…" required />
	<button type="submit" class="btn-cta">Add Tag</button>
</form>

{#if data.tags.length === 0}
	<p class="empty">No discovery tags yet.</p>
{:else}
	<div class="tag-list">
		{#each data.tags as t (t.id)}
			<div class="tag-row">
				<span class="tag-name">{t.name}</span>
				<span class="tag-slug">{t.slug}</span>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={t.id} />
					<button type="submit" class="delete-btn" aria-label="Delete tag">
						<i class="fa-solid fa-xmark"></i>
					</button>
				</form>
			</div>
		{/each}
	</div>
{/if}

<style>
	.page-header { margin-bottom: 1.5rem; }
	.create-form {
		display: flex;
		gap: 0.75rem;
		max-width: 500px;
	}
	.create-form input {
		flex: 1;
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 1rem;
	}
	.create-form input:focus { outline: none; border-color: #ff0000; }
	.empty { color: rgba(255,255,255,0.5); margin-top: 1.5rem; }
	.tag-list {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 500px;
	}
	.tag-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
	}
	.tag-name { font-weight: 600; }
	.tag-slug { flex: 1; color: rgba(255,255,255,0.4); font-size: 0.85rem; }
	.delete-btn {
		background: none;
		border: none;
		color: rgba(255,255,255,0.3);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: color 0.15s;
	}
	.delete-btn:hover { color: #ff3333; }
	.error {
		color: #ff4444;
		background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Expected: no errors. Navigate to `/admin/discovery/tags` in dev — shows empty state, can create and delete tags.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/discovery/tags/
git commit -m "feat(admin): Discovery tags CRUD"
```

---

## Task 4: Discovery Sections admin

**Files:**
- Create: `src/routes/admin/discovery/sections/+page.server.js`
- Create: `src/routes/admin/discovery/sections/+page.svelte`

- [ ] **Step 1: Create `src/routes/admin/discovery/sections/+page.server.js`**

```js
import { db } from '$lib/server/db/index.js';
import { discoverySection, discoveryItem } from '$lib/server/db/schema.ts';
import { eq, asc, count } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function load() {
	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	const counts = await db
		.select({ sectionId: discoveryItem.sectionId, total: count() })
		.from(discoveryItem)
		.groupBy(discoveryItem.sectionId);
	const countMap = Object.fromEntries(counts.map(r => [r.sectionId, Number(r.total)]));
	return {
		sections: sections.map(s => ({ ...s, itemCount: countMap[s.id] ?? 0 }))
	};
}

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		if (!name) return fail(400, { error: 'Name is required.' });

		const slug = slugify(name);
		const all = await db
			.select({ position: discoverySection.position })
			.from(discoverySection)
			.orderBy(asc(discoverySection.position));
		const nextPos = all.length ? all[all.length - 1].position + 1 : 0;
		try {
			await db.insert(discoverySection).values({ name, slug, description, position: nextPos });
		} catch {
			return fail(400, { error: 'A section with that name already exists.' });
		}
		return { created: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const name = data.get('name')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		if (!id || !name) return fail(400, { error: 'Name is required.' });
		await db.update(discoverySection).set({ name, description }).where(eq(discoverySection.id, id));
		return { updated: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id.' });
		const items = await db
			.select({ id: discoveryItem.id })
			.from(discoveryItem)
			.where(eq(discoveryItem.sectionId, id));
		if (items.length > 0) {
			return fail(400, { error: `Cannot delete: section has ${items.length} item(s). Delete them first.` });
		}
		await db.delete(discoverySection).where(eq(discoverySection.id, id));
		return { deleted: true };
	},

	moveUp: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
		const idx = sections.findIndex(s => s.id === id);
		if (idx <= 0) return {};
		const a = sections[idx], b = sections[idx - 1];
		await db.update(discoverySection).set({ position: b.position }).where(eq(discoverySection.id, a.id));
		await db.update(discoverySection).set({ position: a.position }).where(eq(discoverySection.id, b.id));
		return {};
	},

	moveDown: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
		const idx = sections.findIndex(s => s.id === id);
		if (idx < 0 || idx >= sections.length - 1) return {};
		const a = sections[idx], b = sections[idx + 1];
		await db.update(discoverySection).set({ position: b.position }).where(eq(discoverySection.id, a.id));
		await db.update(discoverySection).set({ position: a.position }).where(eq(discoverySection.id, b.id));
		return {};
	}
};
```

- [ ] **Step 2: Create `src/routes/admin/discovery/sections/+page.svelte`**

```svelte
<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let editingId = $state(null);
	let editName = $state('');
	let editDesc = $state('');

	function startEdit(s) {
		editingId = s.id;
		editName = s.name;
		editDesc = s.description ?? '';
	}
	function cancelEdit() { editingId = null; }
</script>

<div class="page-header">
	<h1>Discovery Sections</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<!-- Create -->
<form method="POST" action="?/create" use:enhance class="create-form">
	<input type="text" name="name" placeholder="Section name…" required />
	<input type="text" name="description" placeholder="Short description…" />
	<button type="submit" class="btn-cta">Add Section</button>
</form>

{#if data.sections.length === 0}
	<p class="empty">No sections yet.</p>
{:else}
	<div class="section-list">
		{#each data.sections as s (s.id)}
			<div class="section-row">
				<!-- Reorder -->
				<div class="order-btns">
					<form method="POST" action="?/moveUp" use:enhance>
						<input type="hidden" name="id" value={s.id} />
						<button type="submit" class="order-btn" aria-label="Move up">
							<i class="fa-solid fa-chevron-up"></i>
						</button>
					</form>
					<form method="POST" action="?/moveDown" use:enhance>
						<input type="hidden" name="id" value={s.id} />
						<button type="submit" class="order-btn" aria-label="Move down">
							<i class="fa-solid fa-chevron-down"></i>
						</button>
					</form>
				</div>

				<!-- Info / Edit -->
				{#if editingId === s.id}
					<form method="POST" action="?/update" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="edit-form">
						<input type="hidden" name="id" value={s.id} />
						<input type="text" name="name" bind:value={editName} required />
						<input type="text" name="description" bind:value={editDesc} placeholder="Description…" />
						<button type="submit" class="btn-sm save"><i class="fa-solid fa-check"></i></button>
						<button type="button" class="btn-sm cancel" onclick={cancelEdit}><i class="fa-solid fa-xmark"></i></button>
					</form>
				{:else}
					<div class="section-info">
						<span class="section-name">{s.name}</span>
						<span class="section-slug">{s.slug}</span>
						{#if s.description}<span class="section-desc">{s.description}</span>{/if}
					</div>
					<span class="item-count">{s.itemCount} item{s.itemCount === 1 ? '' : 's'}</span>
					<button class="btn-sm edit" onclick={() => startEdit(s)} aria-label="Edit section">
						<i class="fa-solid fa-pen"></i>
					</button>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={s.id} />
						<button
							type="submit"
							class="btn-sm delete"
							aria-label="Delete section"
							onclick={(e) => { if (!confirm(`Delete "${s.name}"?`)) e.preventDefault(); }}
						>
							<i class="fa-solid fa-trash"></i>
						</button>
					</form>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.page-header { margin-bottom: 1.5rem; }
	.create-form {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}
	.create-form input {
		flex: 1;
		min-width: 160px;
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9rem;
	}
	.create-form input:focus { outline: none; border-color: #ff0000; }
	.empty { color: rgba(255,255,255,0.5); }
	.section-list { display: flex; flex-direction: column; gap: 0.5rem; max-width: 700px; }
	.section-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
	}
	.order-btns { display: flex; flex-direction: column; gap: 0.1rem; }
	.order-btn {
		background: none; border: none; color: rgba(255,255,255,0.3);
		cursor: pointer; padding: 0.15rem; font-size: 0.7rem;
		transition: color 0.15s;
	}
	.order-btn:hover { color: #fff; }
	.section-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
	.section-name { font-weight: 600; font-size: 0.95rem; }
	.section-slug { color: rgba(255,255,255,0.35); font-size: 0.8rem; }
	.section-desc { color: rgba(255,255,255,0.55); font-size: 0.85rem; }
	.item-count { color: rgba(255,255,255,0.4); font-size: 0.8rem; white-space: nowrap; }
	.edit-form { display: flex; gap: 0.5rem; flex: 1; align-items: center; }
	.edit-form input {
		flex: 1;
		padding: 0.4rem 0.6rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.2);
		border-radius: 0.35rem;
		color: #fff;
		font-size: 0.9rem;
	}
	.btn-sm {
		padding: 0.35rem 0.6rem;
		border-radius: 0.35rem;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.15s;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
	}
	.btn-sm:hover { background: rgba(255,255,255,0.14); color: #fff; }
	.btn-sm.delete:hover { background: rgba(255,50,50,0.2); color: #ff4444; }
	.btn-sm.save:hover { background: rgba(50,200,50,0.2); color: #44cc44; }
	.error {
		color: #ff4444;
		background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Navigate to `/admin/discovery/sections` in dev — create a few sections, confirm up/down reorder works, confirm delete blocked when items exist (test once items are created in Task 5+).

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/discovery/sections/
git commit -m "feat(admin): Discovery sections CRUD with reorder"
```

---

## Task 5: Discovery Items admin — list page

**Files:**
- Create: `src/routes/admin/discovery/+page.server.js`
- Create: `src/routes/admin/discovery/+page.svelte`

- [ ] **Step 1: Create `src/routes/admin/discovery/+page.server.js`**

```js
import { db } from '$lib/server/db/index.js';
import { discoveryItem, discoverySection } from '$lib/server/db/schema.ts';
import { eq, asc, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export async function load() {
	const items = await db.select().from(discoveryItem).orderBy(desc(discoveryItem.createdAt));
	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	const sectionMap = Object.fromEntries(sections.map(s => [s.id, s]));
	return {
		items: items.map(item => ({ ...item, section: sectionMap[item.sectionId] ?? null })),
		sections
	};
}

export const actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id.' });
		// discoveryItemImage and discoveryItemTag cascade-delete via FK
		await db.delete(discoveryItem).where(eq(discoveryItem.id, id));
		return { deleted: true };
	}
};
```

- [ ] **Step 2: Create `src/routes/admin/discovery/+page.svelte`**

```svelte
<script>
	import { enhance } from '$app/forms';
	let { data } = $props();

	let filterSection = $state('all');

	const MEDIA_ICONS = {
		image: 'fa-image',
		carousel: 'fa-images',
		video: 'fa-film',
		youtube: 'fa-brands fa-youtube'
	};

	let filtered = $derived(
		filterSection === 'all'
			? data.items
			: data.items.filter(i => String(i.sectionId) === filterSection)
	);
</script>

<div class="header">
	<h1>Discovery Items</h1>
	<div class="header-actions">
		<select bind:value={filterSection} class="filter-select">
			<option value="all">All sections</option>
			{#each data.sections as s}
				<option value={String(s.id)}>{s.name}</option>
			{/each}
		</select>
		<a href="/admin/discovery/new" class="btn-cta">
			<i class="fa-solid fa-plus"></i> New Item
		</a>
	</div>
</div>

{#if filtered.length === 0}
	<p class="empty">No items{filterSection !== 'all' ? ' in this section' : ''}.</p>
{:else}
	<div class="item-list">
		{#each filtered as item (item.id)}
			<div class="item-card">
				{#if item.thumbnailUrl}
					<img
						src={item.mediaType === 'youtube' && !item.thumbnailUrl
							? `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`
							: item.thumbnailUrl}
						alt={item.title}
						class="item-thumb"
					/>
				{:else if item.youtubeId}
					<img
						src="https://img.youtube.com/vi/{item.youtubeId}/mqdefault.jpg"
						alt={item.title}
						class="item-thumb"
					/>
				{:else}
					<div class="item-thumb thumb-placeholder">
						<i class="fa-solid {MEDIA_ICONS[item.mediaType] ?? 'fa-file'}"></i>
					</div>
				{/if}
				<div class="item-info">
					<h3>{item.title}</h3>
					<div class="item-meta">
						{#if item.section}<span class="meta-section">{item.section.name}</span>{/if}
						<span class="meta-type">
							<i class="fa-solid {MEDIA_ICONS[item.mediaType] ?? 'fa-file'}"></i>
							{item.mediaType}
						</span>
					</div>
				</div>
				<div class="item-actions">
					<a href="/admin/discovery/{item.id}/edit" class="action-btn" aria-label="Edit">
						<i class="fa-solid fa-pen"></i>
					</a>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={item.id} />
						<button
							type="submit"
							class="action-btn delete"
							aria-label="Delete"
							onclick={(e) => { if (!confirm('Delete this item?')) e.preventDefault(); }}
						>
							<i class="fa-solid fa-trash"></i>
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.header-actions { display: flex; gap: 0.5rem; align-items: center; }
	.filter-select {
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.empty { color: rgba(255,255,255,0.5); }
	.item-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.item-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
	}
	.item-thumb {
		width: 72px;
		height: 48px;
		object-fit: cover;
		border-radius: 0.35rem;
		flex-shrink: 0;
		background: rgba(255,255,255,0.06);
	}
	.thumb-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255,255,255,0.3);
		font-size: 1.2rem;
	}
	.item-info { flex: 1; }
	.item-info h3 { font-size: 0.95rem; font-weight: 600; margin: 0 0 0.3rem; }
	.item-meta { display: flex; gap: 0.75rem; }
	.meta-section, .meta-type {
		font-size: 0.8rem;
		color: rgba(255,255,255,0.45);
	}
	.item-actions { display: flex; gap: 0.35rem; }
	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 0.35rem;
		background: rgba(255,255,255,0.06);
		border: none;
		color: rgba(255,255,255,0.5);
		cursor: pointer;
		text-decoration: none;
		font-size: 0.85rem;
		transition: all 0.15s;
	}
	.action-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
	.action-btn.delete:hover { background: rgba(255,50,50,0.2); color: #ff4444; }
</style>
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Navigate to `/admin/discovery` in dev — shows empty list (or items once created). Section filter dropdown populated from DB.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/discovery/+page.server.js src/routes/admin/discovery/+page.svelte
git commit -m "feat(admin): Discovery items list with section filter"
```

---

## Task 6: Discovery Items admin — New item form

**Files:**
- Create: `src/routes/admin/discovery/new/+page.server.js`
- Create: `src/routes/admin/discovery/new/+page.svelte`

- [ ] **Step 1: Create `src/routes/admin/discovery/new/+page.server.js`**

```js
import { db } from '$lib/server/db/index.js';
import {
	discoveryItem, discoveryItemImage, discoveryItemTag,
	discoverySection, discoveryTag
} from '$lib/server/db/schema.ts';
import { asc } from 'drizzle-orm';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';
import { fail, redirect } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractYoutubeId(input) {
	if (!input) return null;
	const trimmed = input.trim();
	if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
	try {
		const url = new URL(trimmed);
		if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
		if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
	} catch {}
	return null;
}

const ALLOWED_IMAGE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

async function processAndUpload(file, baseKey) {
	const buffer = Buffer.from(await file.arrayBuffer());
	const result = await processImage(buffer, baseKey);
	const uploads = await Promise.all(
		result.variants.map(async (v) => {
			const url = await uploadToR2(v.buffer, v.key, v.contentType);
			return { name: v.name, url };
		})
	);
	const urlMap = Object.fromEntries(uploads.map(u => [u.name, u.url]));
	return { imageUrl: urlMap.full, thumbnailUrl: urlMap.thumb };
}

export async function load() {
	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	const tags = await db.select().from(discoveryTag).orderBy(discoveryTag.name);
	return { sections, tags };
}

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const sectionId = Number(data.get('section_id'));
		const mediaType = data.get('media_type')?.toString();
		const creatorName = data.get('creator_name')?.toString().trim() || null;
		const creatorUrl = data.get('creator_url')?.toString().trim() || null;
		const sourceUrl = data.get('source_url')?.toString().trim() || null;
		const tagIds = data.getAll('tags').map(Number).filter(Boolean);
		const youtubeInput = data.get('youtube_url')?.toString().trim() || null;

		if (!title || !sectionId || !mediaType) {
			return fail(400, { error: 'Title, section, and media type are required.' });
		}

		const slug = slugify(title);
		const ts = Date.now();
		let imageUrl = null, thumbnailUrl = null, youtubeId = null;
		let carouselImages = [];

		if (mediaType === 'youtube') {
			youtubeId = extractYoutubeId(youtubeInput);
			if (!youtubeId) return fail(400, { error: 'Invalid YouTube URL or video ID.' });
			thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

		} else if (mediaType === 'image') {
			const file = data.get('image');
			if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'Image file is required.' });
			if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return fail(400, { error: 'Unsupported image format.' });
			try {
				const r = await processAndUpload(file, `discovery/${slug}-${ts}`);
				imageUrl = r.imageUrl;
				thumbnailUrl = r.thumbnailUrl;
			} catch (e) {
				console.error(e);
				return fail(500, { error: 'Image upload failed.' });
			}

		} else if (mediaType === 'carousel') {
			const files = data.getAll('images').filter(f => f instanceof File && f.size > 0);
			if (files.length < 2) return fail(400, { error: 'Carousel requires at least 2 images.' });
			for (const f of files) {
				if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return fail(400, { error: 'Unsupported image format.' });
			}
			try {
				const results = await Promise.all(
					files.map((f, i) => processAndUpload(f, `discovery/${slug}-${ts}-${i}`))
				);
				imageUrl = results[0].imageUrl;
				thumbnailUrl = results[0].thumbnailUrl;
				carouselImages = results;
			} catch (e) {
				console.error(e);
				return fail(500, { error: 'Image upload failed.' });
			}

		} else if (mediaType === 'video') {
			const file = data.get('video');
			if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'Video file is required.' });
			if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return fail(400, { error: 'Unsupported video format. Use mp4, webm, or mov.' });
			if (file.size > MAX_VIDEO_SIZE) return fail(400, { error: 'Video must be under 200 MB.' });
			try {
				const buffer = Buffer.from(await file.arrayBuffer());
				const ext = file.name.split('.').pop() || 'mp4';
				imageUrl = await uploadToR2(buffer, `discovery/${slug}-${ts}.${ext}`, file.type);
			} catch (e) {
				console.error(e);
				return fail(500, { error: 'Video upload failed.' });
			}
		} else {
			return fail(400, { error: 'Invalid media type.' });
		}

		const [inserted] = await db.insert(discoveryItem).values({
			sectionId, title, description, mediaType,
			imageUrl, thumbnailUrl, youtubeId,
			sourceUrl, creatorName, creatorUrl
		}).returning({ id: discoveryItem.id });

		if (mediaType === 'carousel' && carouselImages.length > 0) {
			await db.insert(discoveryItemImage).values(
				carouselImages.map((img, i) => ({
					itemId: inserted.id,
					imageUrl: img.imageUrl,
					thumbnailUrl: img.thumbnailUrl,
					position: i
				}))
			);
		}

		if (tagIds.length > 0) {
			await db.insert(discoveryItemTag).values(tagIds.map(tagId => ({ itemId: inserted.id, tagId })));
		}

		redirect(303, '/admin/discovery');
	}
};
```

- [ ] **Step 2: Create `src/routes/admin/discovery/new/+page.svelte`**

```svelte
<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let mediaType = $state('image');
	let selectedFiles = $state([]);
	let uploading = $state(false);
	let hiddenInput = $state(null);

	function syncHidden(files) {
		if (!hiddenInput) return;
		const dt = new DataTransfer();
		files.forEach(f => dt.items.add(f));
		hiddenInput.files = dt.files;
	}

	function handleCarouselChange(e) {
		const files = Array.from(e.target.files || []);
		selectedFiles = [...selectedFiles, ...files];
		syncHidden(selectedFiles);
	}

	function removeFile(i) {
		selectedFiles = selectedFiles.filter((_, idx) => idx !== i);
		syncHidden(selectedFiles);
	}
</script>

<div class="page-header">
	<h1>New Discovery Item</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => {
		uploading = true;
		return async ({ update }) => { uploading = false; await update(); };
	}}
	class="item-form"
>
	<label>
		Title *
		<input type="text" name="title" required value={form?.title ?? ''} />
	</label>

	<label>
		Description
		<textarea name="description" rows="3">{form?.description ?? ''}</textarea>
	</label>

	<div class="row">
		<label>
			Section *
			<select name="section_id" required>
				<option value="">Select…</option>
				{#each data.sections as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</label>

		<label>
			Media Type *
			<select name="media_type" bind:value={mediaType}>
				<option value="image">Image</option>
				<option value="carousel">Carousel (multiple images)</option>
				<option value="video">Video (self-hosted)</option>
				<option value="youtube">YouTube</option>
			</select>
		</label>
	</div>

	<!-- Media input — switches by type -->
	{#if mediaType === 'image'}
		<label>
			Image *
			<input type="file" name="image" accept="image/*" required />
		</label>
	{:else if mediaType === 'carousel'}
		<label>
			Images * (at least 2)
			<input type="file" accept="image/*" multiple onchange={handleCarouselChange} />
			<input type="file" name="images" multiple bind:this={hiddenInput} style="display:none" />
		</label>
		{#if selectedFiles.length > 0}
			<div class="file-preview">
				{#each selectedFiles as f, i}
					<div class="file-chip">
						<span>{f.name}</span>
						<button type="button" onclick={() => removeFile(i)} aria-label="Remove">×</button>
					</div>
				{/each}
			</div>
		{/if}
	{:else if mediaType === 'video'}
		<label>
			Video * (mp4, webm, mov — max 200 MB)
			<input type="file" name="video" accept="video/mp4,video/webm,video/quicktime" required />
		</label>
	{:else if mediaType === 'youtube'}
		<label>
			YouTube URL or Video ID *
			<input type="text" name="youtube_url" placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ" required />
		</label>
	{/if}

	<hr />

	<div class="row">
		<label>
			Creator Name
			<input type="text" name="creator_name" value={form?.creatorName ?? ''} />
		</label>
		<label>
			Creator URL
			<input type="url" name="creator_url" placeholder="https://…" value={form?.creatorUrl ?? ''} />
		</label>
	</div>

	<label>
		Source / Original URL
		<input type="url" name="source_url" placeholder="https://…" value={form?.sourceUrl ?? ''} />
	</label>

	{#if data.tags.length > 0}
		<fieldset>
			<legend>Tags</legend>
			<div class="tag-checks">
				{#each data.tags as t}
					<label class="tag-check">
						<input type="checkbox" name="tags" value={t.id} />
						{t.name}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<div class="form-actions">
		<a href="/admin/discovery" class="btn-secondary">Cancel</a>
		<button type="submit" class="btn-cta" disabled={uploading}>
			{uploading ? 'Uploading…' : 'Create Item'}
		</button>
	</div>
</form>

<style>
	.page-header { margin-bottom: 1.5rem; }
	.item-form { display: flex; flex-direction: column; gap: 1.25rem; max-width: 700px; }
	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.9rem;
		color: rgba(255,255,255,0.7);
	}
	input[type="text"], input[type="url"], textarea, select {
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.07);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.95rem;
		font-family: inherit;
	}
	input:focus, textarea:focus, select:focus { outline: none; border-color: #ff0000; }
	textarea { resize: vertical; }
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); }
	fieldset { border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 1rem; }
	legend { color: rgba(255,255,255,0.7); font-size: 0.9rem; padding: 0 0.4rem; }
	.tag-checks { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
	.tag-check {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: rgba(255,255,255,0.6);
		cursor: pointer;
	}
	.file-preview { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.file-chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.6rem;
		background: rgba(255,255,255,0.07);
		border-radius: 0.35rem;
		font-size: 0.8rem;
	}
	.file-chip button { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 1rem; }
	.form-actions { display: flex; gap: 0.75rem; padding-top: 0.5rem; }
	.error {
		color: #ff4444;
		background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
	}
</style>
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Create a test item of each media type (image, carousel, video, YouTube) via the form. Confirm each appears in the items list with correct thumbnail and media type label.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/discovery/new/
git commit -m "feat(admin): Discovery item create form with 4 media types"
```

---

## Task 7: Discovery Items admin — Edit form

**Files:**
- Create: `src/routes/admin/discovery/[id]/edit/+page.server.js`
- Create: `src/routes/admin/discovery/[id]/edit/+page.svelte`

- [ ] **Step 1: Create `src/routes/admin/discovery/[id]/edit/+page.server.js`**

```js
import { db } from '$lib/server/db/index.js';
import {
	discoveryItem, discoveryItemImage, discoveryItemTag,
	discoverySection, discoveryTag
} from '$lib/server/db/schema.ts';
import { eq, asc } from 'drizzle-orm';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';
import { fail, redirect, error } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractYoutubeId(input) {
	if (!input) return null;
	const trimmed = input.trim();
	if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
	try {
		const url = new URL(trimmed);
		if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
		if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
	} catch {}
	return null;
}

const ALLOWED_IMAGE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

async function processAndUpload(file, baseKey) {
	const buffer = Buffer.from(await file.arrayBuffer());
	const result = await processImage(buffer, baseKey);
	const uploads = await Promise.all(
		result.variants.map(async (v) => {
			const url = await uploadToR2(v.buffer, v.key, v.contentType);
			return { name: v.name, url };
		})
	);
	const urlMap = Object.fromEntries(uploads.map(u => [u.name, u.url]));
	return { imageUrl: urlMap.full, thumbnailUrl: urlMap.thumb };
}

export async function load({ params }) {
	const id = Number(params.id);
	if (!id) error(404, 'Not found');

	const [item] = await db.select().from(discoveryItem).where(eq(discoveryItem.id, id));
	if (!item) error(404, 'Item not found');

	const images = await db
		.select()
		.from(discoveryItemImage)
		.where(eq(discoveryItemImage.itemId, id))
		.orderBy(asc(discoveryItemImage.position));

	const itemTagRows = await db
		.select()
		.from(discoveryItemTag)
		.where(eq(discoveryItemTag.itemId, id));
	const currentTagIds = new Set(itemTagRows.map(r => r.tagId));

	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	const allTags = await db.select().from(discoveryTag).orderBy(discoveryTag.name);

	return {
		item,
		images,
		sections,
		allTags: allTags.map(t => ({ ...t, checked: currentTagIds.has(t.id) }))
	};
}

export const actions = {
	default: async ({ request, params }) => {
		const id = Number(params.id);
		if (!id) return fail(400, { error: 'Invalid id.' });

		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const sectionId = Number(data.get('section_id'));
		const mediaType = data.get('media_type')?.toString();
		const creatorName = data.get('creator_name')?.toString().trim() || null;
		const creatorUrl = data.get('creator_url')?.toString().trim() || null;
		const sourceUrl = data.get('source_url')?.toString().trim() || null;
		const tagIds = data.getAll('tags').map(Number).filter(Boolean);
		const youtubeInput = data.get('youtube_url')?.toString().trim() || null;

		if (!title || !sectionId || !mediaType) {
			return fail(400, { error: 'Title, section, and media type are required.' });
		}

		// Get existing item to preserve URLs if no new file
		const [existing] = await db.select().from(discoveryItem).where(eq(discoveryItem.id, id));
		if (!existing) return fail(404, { error: 'Item not found.' });

		const slug = slugify(title);
		const ts = Date.now();
		let imageUrl = existing.imageUrl;
		let thumbnailUrl = existing.thumbnailUrl;
		let youtubeId = existing.youtubeId;
		let carouselImages = null; // null = don't replace

		if (mediaType === 'youtube') {
			youtubeId = extractYoutubeId(youtubeInput);
			if (!youtubeId) return fail(400, { error: 'Invalid YouTube URL or video ID.' });
			thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
			imageUrl = null;

		} else if (mediaType === 'image') {
			const file = data.get('image');
			if (file instanceof File && file.size > 0) {
				if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return fail(400, { error: 'Unsupported image format.' });
				try {
					const r = await processAndUpload(file, `discovery/${slug}-${ts}`);
					imageUrl = r.imageUrl;
					thumbnailUrl = r.thumbnailUrl;
				} catch (e) {
					console.error(e);
					return fail(500, { error: 'Image upload failed.' });
				}
			}
			youtubeId = null;

		} else if (mediaType === 'carousel') {
			const files = data.getAll('images').filter(f => f instanceof File && f.size > 0);
			if (files.length > 0) {
				if (files.length < 2) return fail(400, { error: 'Carousel requires at least 2 images.' });
				for (const f of files) {
					if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return fail(400, { error: 'Unsupported image format.' });
				}
				try {
					const results = await Promise.all(
						files.map((f, i) => processAndUpload(f, `discovery/${slug}-${ts}-${i}`))
					);
					imageUrl = results[0].imageUrl;
					thumbnailUrl = results[0].thumbnailUrl;
					carouselImages = results;
				} catch (e) {
					console.error(e);
					return fail(500, { error: 'Image upload failed.' });
				}
			}
			youtubeId = null;

		} else if (mediaType === 'video') {
			const file = data.get('video');
			if (file instanceof File && file.size > 0) {
				if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return fail(400, { error: 'Unsupported video format.' });
				if (file.size > MAX_VIDEO_SIZE) return fail(400, { error: 'Video must be under 200 MB.' });
				try {
					const buffer = Buffer.from(await file.arrayBuffer());
					const ext = file.name.split('.').pop() || 'mp4';
					imageUrl = await uploadToR2(buffer, `discovery/${slug}-${ts}.${ext}`, file.type);
					thumbnailUrl = null;
				} catch (e) {
					console.error(e);
					return fail(500, { error: 'Video upload failed.' });
				}
			}
			youtubeId = null;
		} else {
			return fail(400, { error: 'Invalid media type.' });
		}

		await db.update(discoveryItem)
			.set({
				title, description, sectionId, mediaType,
				imageUrl, thumbnailUrl, youtubeId,
				sourceUrl, creatorName, creatorUrl,
				updatedAt: new Date()
			})
			.where(eq(discoveryItem.id, id));

		// Replace carousel images only if new files were uploaded
		if (mediaType === 'carousel' && carouselImages !== null) {
			await db.delete(discoveryItemImage).where(eq(discoveryItemImage.itemId, id));
			await db.insert(discoveryItemImage).values(
				carouselImages.map((img, i) => ({
					itemId: id,
					imageUrl: img.imageUrl,
					thumbnailUrl: img.thumbnailUrl,
					position: i
				}))
			);
		}

		// Sync tags
		await db.delete(discoveryItemTag).where(eq(discoveryItemTag.itemId, id));
		if (tagIds.length > 0) {
			await db.insert(discoveryItemTag).values(tagIds.map(tagId => ({ itemId: id, tagId })));
		}

		redirect(303, '/admin/discovery');
	}
};
```

- [ ] **Step 2: Create `src/routes/admin/discovery/[id]/edit/+page.svelte`**

```svelte
<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let mediaType = $state(data.item.mediaType);
	let selectedFiles = $state([]);
	let uploading = $state(false);
	let hiddenInput = $state(null);

	function syncHidden(files) {
		if (!hiddenInput) return;
		const dt = new DataTransfer();
		files.forEach(f => dt.items.add(f));
		hiddenInput.files = dt.files;
	}

	function handleCarouselChange(e) {
		const files = Array.from(e.target.files || []);
		selectedFiles = [...selectedFiles, ...files];
		syncHidden(selectedFiles);
	}

	function removeFile(i) {
		selectedFiles = selectedFiles.filter((_, idx) => idx !== i);
		syncHidden(selectedFiles);
	}
</script>

<div class="page-header">
	<h1>Edit Discovery Item</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => {
		uploading = true;
		return async ({ update }) => { uploading = false; await update(); };
	}}
	class="item-form"
>
	<label>
		Title *
		<input type="text" name="title" required value={data.item.title} />
	</label>

	<label>
		Description
		<textarea name="description" rows="3">{data.item.description ?? ''}</textarea>
	</label>

	<div class="row">
		<label>
			Section *
			<select name="section_id" required>
				{#each data.sections as s}
					<option value={s.id} selected={s.id === data.item.sectionId}>{s.name}</option>
				{/each}
			</select>
		</label>

		<label>
			Media Type *
			<select name="media_type" bind:value={mediaType}>
				<option value="image">Image</option>
				<option value="carousel">Carousel (multiple images)</option>
				<option value="video">Video (self-hosted)</option>
				<option value="youtube">YouTube</option>
			</select>
		</label>
	</div>

	<!-- Current media preview -->
	{#if data.item.thumbnailUrl || data.item.imageUrl}
		<div class="current-media">
			<p class="current-label">Current media:</p>
			{#if data.item.mediaType === 'video'}
				<video src={data.item.imageUrl} controls style="max-height:120px; border-radius:0.4rem;"></video>
			{:else}
				<img
					src={data.item.thumbnailUrl || data.item.imageUrl}
					alt="current"
					style="max-height:120px; border-radius:0.4rem;"
				/>
			{/if}
		</div>
	{/if}

	<!-- Media input -->
	{#if mediaType === 'image'}
		<label>
			Replace image (leave empty to keep current)
			<input type="file" name="image" accept="image/*" />
		</label>
	{:else if mediaType === 'carousel'}
		{#if data.images.length > 0}
			<p class="current-label">Current frames: {data.images.length} images. Upload new set to replace all.</p>
		{/if}
		<label>
			Replace all frames (upload 2+ images to replace)
			<input type="file" accept="image/*" multiple onchange={handleCarouselChange} />
			<input type="file" name="images" multiple bind:this={hiddenInput} style="display:none" />
		</label>
		{#if selectedFiles.length > 0}
			<div class="file-preview">
				{#each selectedFiles as f, i}
					<div class="file-chip">
						<span>{f.name}</span>
						<button type="button" onclick={() => removeFile(i)} aria-label="Remove">×</button>
					</div>
				{/each}
			</div>
		{/if}
	{:else if mediaType === 'video'}
		<label>
			Replace video (leave empty to keep current)
			<input type="file" name="video" accept="video/mp4,video/webm,video/quicktime" />
		</label>
	{:else if mediaType === 'youtube'}
		<label>
			YouTube URL or Video ID *
			<input
				type="text"
				name="youtube_url"
				placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ"
				value={data.item.youtubeId ?? ''}
				required
			/>
		</label>
	{/if}

	<hr />

	<div class="row">
		<label>
			Creator Name
			<input type="text" name="creator_name" value={data.item.creatorName ?? ''} />
		</label>
		<label>
			Creator URL
			<input type="url" name="creator_url" value={data.item.creatorUrl ?? ''} />
		</label>
	</div>

	<label>
		Source / Original URL
		<input type="url" name="source_url" value={data.item.sourceUrl ?? ''} />
	</label>

	{#if data.allTags.length > 0}
		<fieldset>
			<legend>Tags</legend>
			<div class="tag-checks">
				{#each data.allTags as t}
					<label class="tag-check">
						<input type="checkbox" name="tags" value={t.id} checked={t.checked} />
						{t.name}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<div class="form-actions">
		<a href="/admin/discovery" class="btn-secondary">Cancel</a>
		<button type="submit" class="btn-cta" disabled={uploading}>
			{uploading ? 'Saving…' : 'Save Changes'}
		</button>
	</div>
</form>

<style>
	.page-header { margin-bottom: 1.5rem; }
	.item-form { display: flex; flex-direction: column; gap: 1.25rem; max-width: 700px; }
	label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; color: rgba(255,255,255,0.7); }
	input[type="text"], input[type="url"], textarea, select {
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.07);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.95rem;
		font-family: inherit;
	}
	input:focus, textarea:focus, select:focus { outline: none; border-color: #ff0000; }
	textarea { resize: vertical; }
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); }
	.current-media { display: flex; flex-direction: column; gap: 0.5rem; }
	.current-label { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
	fieldset { border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 1rem; }
	legend { color: rgba(255,255,255,0.7); font-size: 0.9rem; padding: 0 0.4rem; }
	.tag-checks { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
	.tag-check { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: rgba(255,255,255,0.6); cursor: pointer; }
	.file-preview { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.file-chip {
		display: flex; align-items: center; gap: 0.4rem;
		padding: 0.25rem 0.6rem; background: rgba(255,255,255,0.07); border-radius: 0.35rem; font-size: 0.8rem;
	}
	.file-chip button { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 1rem; }
	.form-actions { display: flex; gap: 0.75rem; padding-top: 0.5rem; }
	.error {
		color: #ff4444; background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3); padding: 0.75rem 1rem; border-radius: 0.5rem;
	}
</style>
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Edit an existing item — confirm fields pre-populate, change media type, upload replacement, change tags. Confirm redirect back to list.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/discovery/[id]/
git commit -m "feat(admin): Discovery item edit form"
```

---

## Task 8: Public Discovery index — DB-driven

**Files:**
- Create: `src/routes/discovery/+page.server.js`
- Modify: `src/routes/discovery/+page.svelte`

- [ ] **Step 1: Create `src/routes/discovery/+page.server.js`**

```js
import { db } from '$lib/server/db/index.js';
import { discoverySection } from '$lib/server/db/schema.ts';
import { asc } from 'drizzle-orm';

export async function load() {
	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	return { sections };
}
```

- [ ] **Step 2: Replace the `<script>` block in `src/routes/discovery/+page.svelte`**

Replace the current `<script>` block (which has hardcoded `sections` array) with:

```svelte
<script>
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	let { data } = $props();
</script>
```

- [ ] **Step 3: Replace the `{#each sections as section}` in the template with `{#each data.sections as section}`**

Find the `{#each sections as section}` line in `+page.svelte` and change it to:

```svelte
{#each data.sections as section}
```

Also change the `href` inside from `/discovery/{section.slug}` (already correct) and the properties from `section.label` to `section.name` (the DB column is `name`, not `label`):

Change `{section.label}` → `{section.name}` and `{section.description}` stays as-is.

Remove the `<span class="section-coming">Coming soon</span>` line.

- [ ] **Step 4: Build and verify**

```bash
pnpm build
```

Navigate to `/discovery` in dev — section cards load from DB. Create a section in admin and confirm it appears here without a deploy.

- [ ] **Step 5: Commit**

```bash
git add src/routes/discovery/+page.server.js src/routes/discovery/+page.svelte
git commit -m "feat(discovery): section index driven by DB"
```

---

## Task 9: Public Discovery section — media grid and modal

**Files:**
- Modify: `src/routes/discovery/[section]/+page.server.js`
- Rewrite: `src/routes/discovery/[section]/+page.svelte`

- [ ] **Step 1: Replace `src/routes/discovery/[section]/+page.server.js`**

```js
import { db } from '$lib/server/db/index.js';
import {
	discoverySection, discoveryItem,
	discoveryItemImage, discoveryItemTag, discoveryTag
} from '$lib/server/db/schema.ts';
import { eq, asc, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	// Load section by slug
	const [section] = await db
		.select()
		.from(discoverySection)
		.where(eq(discoverySection.slug, params.section));

	if (!section) error(404, `Section "${params.section}" not found`);

	// Load all items in section
	const items = await db
		.select()
		.from(discoveryItem)
		.where(eq(discoveryItem.sectionId, section.id))
		.orderBy(desc(discoveryItem.createdAt));

	// Load carousel images for all items
	const allImages = await db
		.select()
		.from(discoveryItemImage)
		.where(
			items.length > 0
				? eq(discoveryItemImage.itemId, items[0].id) // placeholder; we load all below
				: eq(discoveryItemImage.itemId, -1)
		);

	// Re-fetch all images for all items in one query via the section
	const itemIds = items.map(i => i.id);
	let imageRows = [];
	if (itemIds.length > 0) {
		// Drizzle doesn't have inArray without importing it; import it
		const { inArray } = await import('drizzle-orm');
		imageRows = await db
			.select()
			.from(discoveryItemImage)
			.where(inArray(discoveryItemImage.itemId, itemIds))
			.orderBy(asc(discoveryItemImage.position));
	}

	// Load tags for all items
	let tagRows = [];
	let allSectionTags = [];
	if (itemIds.length > 0) {
		const { inArray } = await import('drizzle-orm');
		tagRows = await db
			.select()
			.from(discoveryItemTag)
			.where(inArray(discoveryItemTag.itemId, itemIds));

		const tagIds = [...new Set(tagRows.map(r => r.tagId))];
		if (tagIds.length > 0) {
			allSectionTags = await db
				.select()
				.from(discoveryTag)
				.where(inArray(discoveryTag.id, tagIds));
		}
	}

	const tagMap = Object.fromEntries(allSectionTags.map(t => [t.id, t]));
	const imagesByItem = {};
	for (const img of imageRows) {
		if (!imagesByItem[img.itemId]) imagesByItem[img.itemId] = [];
		imagesByItem[img.itemId].push(img);
	}
	const tagsByItem = {};
	for (const row of tagRows) {
		if (!tagsByItem[row.itemId]) tagsByItem[row.itemId] = [];
		if (tagMap[row.tagId]) tagsByItem[row.itemId].push(tagMap[row.tagId]);
	}

	return {
		section,
		items: items.map(item => ({
			...item,
			images: (imagesByItem[item.id] ?? []).map(img => img.imageUrl),
			tags: tagsByItem[item.id] ?? []
		})),
		allSectionTags
	};
}
```

- [ ] **Step 2: Rewrite `src/routes/discovery/[section]/+page.svelte`**

```svelte
<script>
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import GalleryGrid from '$lib/components/GalleryGrid.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	let { data } = $props();

	let activeTag = $state('all');
	let sortOrder = $state('newest'); // 'newest' | 'oldest'
	let modalItem = $state(null);
	let carouselIndex = $state(0);

	const YOUTUBE_THUMB = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

	// Map discovery items to GalleryGrid-compatible shape
	let allGridItems = $derived(data.items.map(item => ({
		id: item.id,
		src: item.thumbnailUrl
			?? (item.youtubeId ? YOUTUBE_THUMB(item.youtubeId) : null)
			?? item.imageUrl
			?? '',
		alt: item.title,
		title: item.title,
		// Show media type in category slot for non-image items
		category: item.mediaType === 'youtube' ? 'YouTube'
			: item.mediaType === 'video' ? 'Video'
			: null,
		displayMode: item.mediaType === 'carousel' ? 'carousel' : 'single',
		imageCount: item.mediaType === 'carousel' ? (item.images?.length || 1) : 1,
		hasCaseStudy: false,
		tags: item.tags,
		// Discovery extras for modal:
		_discovery: item
	})));

	let filteredItems = $derived.by(() => {
		let items = allGridItems;
		if (activeTag !== 'all') {
			items = items.filter(i => i._discovery.tags.some(t => t.slug === activeTag));
		}
		if (sortOrder === 'oldest') {
			items = [...items].reverse();
		}
		return items;
	});

	let tagPills = $derived([
		{ slug: 'all', name: 'All' },
		...data.allSectionTags
	]);

	function openModal(gridItem) {
		modalItem = gridItem._discovery;
		carouselIndex = 0;
	}

	function closeModal() {
		modalItem = null;
	}

	function carouselPrev() {
		if (carouselIndex > 0) carouselIndex--;
	}
	function carouselNext() {
		if (modalItem && carouselIndex < modalItem.images.length - 1) carouselIndex++;
	}

	function handleKeydown(e) {
		if (!modalItem) return;
		if (e.key === 'Escape') closeModal();
		if (e.key === 'ArrowLeft') carouselPrev();
		if (e.key === 'ArrowRight') carouselNext();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{data.section.name} — Discovery — DONCEZART</title>
	<meta name="description" content={data.section.description ?? ''} />
</svelte:head>

<PageHeader title={data.section.name} subtitle={data.section.description ?? ''} />

<!-- Filters and sort -->
{#if data.items.length > 0}
	<div class="controls">
		<div class="tag-pills">
			{#each tagPills as t}
				<button
					class="tag-pill"
					class:active={activeTag === t.slug}
					onclick={() => (activeTag = t.slug)}
				>
					{t.name}
				</button>
			{/each}
		</div>
		<div class="sort-toggle">
			<button
				class="sort-btn"
				class:active={sortOrder === 'newest'}
				onclick={() => (sortOrder = 'newest')}
			>Newest</button>
			<button
				class="sort-btn"
				class:active={sortOrder === 'oldest'}
				onclick={() => (sortOrder = 'oldest')}
			>Oldest</button>
		</div>
	</div>

	<GalleryGrid
		items={filteredItems}
		columns={4}
		showAll={true}
		onItemClick={openModal}
	/>
{:else}
	<div class="empty-state">
		<p>No items in this section yet. Check back soon.</p>
		<Button href="/discovery" variant="outline">Back to Discovery</Button>
	</div>
{/if}

<!-- Modal -->
{#if modalItem}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-overlay"
		onclick={closeModal}
		role="dialog"
		aria-modal="true"
		aria-label="{modalItem.title} — full view"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>

			<!-- Left: media -->
			<div class="modal-media">
				{#if modalItem.mediaType === 'image'}
					<img src={modalItem.imageUrl} alt={modalItem.title} />

				{:else if modalItem.mediaType === 'carousel'}
					<div class="carousel-wrap">
						<img src={modalItem.images[carouselIndex]} alt="{modalItem.title} ({carouselIndex + 1}/{modalItem.images.length})" />
						{#if carouselIndex > 0}
							<button class="carousel-arrow prev" onclick={carouselPrev} aria-label="Previous">
								<i class="fa-solid fa-chevron-left"></i>
							</button>
						{/if}
						{#if carouselIndex < modalItem.images.length - 1}
							<button class="carousel-arrow next" onclick={carouselNext} aria-label="Next">
								<i class="fa-solid fa-chevron-right"></i>
							</button>
						{/if}
					</div>
					<div class="carousel-dots">
						{#each modalItem.images as _, i}
							<button
								class="dot"
								class:active={i === carouselIndex}
								onclick={() => (carouselIndex = i)}
								aria-label="Go to frame {i + 1}"
							></button>
						{/each}
					</div>

				{:else if modalItem.mediaType === 'video'}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={modalItem.imageUrl} controls></video>

				{:else if modalItem.mediaType === 'youtube'}
					<iframe
						src="https://www.youtube-nocookie.com/embed/{modalItem.youtubeId}?rel=0&modestbranding=1"
						title={modalItem.title}
						frameborder="0"
						allowfullscreen
					></iframe>
				{/if}
			</div>

			<!-- Right: info -->
			<div class="modal-info">
				<button class="modal-close" onclick={closeModal} aria-label="Close">
					<i class="fa-solid fa-xmark"></i>
				</button>

				<h2 class="modal-title">{modalItem.title}</h2>

				{#if modalItem.description}
					<p class="modal-desc">{modalItem.description}</p>
				{/if}

				{#if modalItem.tags.length > 0}
					<div class="modal-tags">
						{#each modalItem.tags as t}
							<span class="tag-badge">{t.name}</span>
						{/each}
					</div>
				{/if}

				{#if modalItem.creatorName}
					<p class="modal-creator">
						By
						{#if modalItem.creatorUrl}
							<a href={modalItem.creatorUrl} target="_blank" rel="noopener noreferrer">
								{modalItem.creatorName}
							</a>
						{:else}
							{modalItem.creatorName}
						{/if}
					</p>
				{/if}

				{#if modalItem.sourceUrl}
					<a
						href={modalItem.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="view-original"
					>
						<i class="fa-solid fa-arrow-up-right-from-square"></i>
						View Original
					</a>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0 var(--container-pad);
		margin-bottom: var(--space-lg);
	}
	.tag-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.tag-pill {
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		border: var(--border);
		background: transparent;
		color: var(--color-text-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: all var(--transition-base);
	}
	.tag-pill:hover { border-color: var(--color-text-primary); color: var(--color-text-primary); }
	.tag-pill.active { background: var(--color-text-primary); color: var(--color-bg); border-color: var(--color-text-primary); }
	.sort-toggle { display: flex; gap: 0.25rem; }
	.sort-btn {
		padding: 0.35rem 0.75rem;
		border: var(--border);
		background: transparent;
		color: var(--color-text-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: all var(--transition-base);
	}
	.sort-btn:first-child { border-radius: var(--radius) 0 0 var(--radius); }
	.sort-btn:last-child { border-radius: 0 var(--radius) var(--radius) 0; }
	.sort-btn.active { background: var(--color-text-primary); color: var(--color-bg); border-color: var(--color-text-primary); }

	.empty-state {
		display: flex; flex-direction: column; align-items: center;
		gap: var(--space-xl); text-align: center; padding-bottom: var(--space-4xl);
	}
	.empty-state p { color: var(--color-text-secondary); }

	/* Modal */
	.modal-overlay {
		position: fixed; inset: 0; z-index: 1000;
		background: rgba(0,0,0,0.88);
		display: flex; align-items: center; justify-content: center;
		padding: 1rem;
	}
	.modal-content {
		display: flex;
		width: min(92vw, 1100px);
		max-height: 90vh;
		background: #111;
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	/* Media side */
	.modal-media {
		flex: 0 0 65%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #000;
		position: relative;
		overflow: hidden;
	}
	.modal-media img {
		max-width: 100%; max-height: 100%;
		object-fit: contain;
		display: block;
	}
	.modal-media video, .modal-media iframe {
		width: 100%; height: 100%;
		border: none;
		display: block;
	}
	.carousel-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
	.carousel-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
	.carousel-arrow {
		position: absolute; top: 50%; transform: translateY(-50%);
		background: rgba(0,0,0,0.6); border: none; color: #fff;
		width: 40px; height: 40px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; font-size: 0.9rem;
		transition: background 0.15s;
	}
	.carousel-arrow:hover { background: rgba(0,0,0,0.9); }
	.carousel-arrow.prev { left: 0.75rem; }
	.carousel-arrow.next { right: 0.75rem; }
	.carousel-dots {
		display: flex; gap: 0.4rem;
		padding: 0.75rem 0;
		position: absolute; bottom: 0; left: 0; right: 0;
		justify-content: center;
	}
	.dot {
		width: 6px; height: 6px; border-radius: 50%;
		background: rgba(255,255,255,0.3);
		border: none; cursor: pointer; padding: 0;
		transition: background 0.15s;
	}
	.dot.active { background: #fff; }

	/* Info side */
	.modal-info {
		flex: 0 0 35%;
		display: flex; flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-xl) var(--space-xl);
		overflow-y: auto;
		position: relative;
	}
	.modal-close {
		position: absolute; top: var(--space-md); right: var(--space-md);
		background: rgba(255,255,255,0.08);
		border: none; color: rgba(255,255,255,0.6);
		width: 32px; height: 32px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; font-size: 0.9rem;
		transition: all 0.15s;
	}
	.modal-close:hover { background: rgba(255,255,255,0.15); color: #fff; }
	.modal-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
		padding-right: 2rem; /* avoid close btn overlap */
	}
	.modal-desc {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0;
	}
	.modal-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.tag-badge {
		padding: 0.2rem 0.6rem;
		border: var(--border);
		border-radius: 999px;
		font-family: var(--font-body);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
	}
	.modal-creator {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}
	.modal-creator a {
		color: var(--color-text-primary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.view-original {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.6rem 1.25rem;
		border: var(--border-solid);
		color: var(--color-text-primary);
		text-decoration: none;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		border-radius: var(--radius);
		transition: all var(--transition-base);
		margin-top: auto;
	}
	.view-original:hover { background: rgba(255,255,255,0.07); }

	/* Mobile: stack vertically */
	@media (max-width: 768px) {
		.modal-content { flex-direction: column; max-height: 95vh; width: 100%; border-radius: 0.5rem; }
		.modal-media { flex: 0 0 55%; }
		.modal-info { flex: 1; }
	}
</style>
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Navigate to `/discovery/[section-slug]` in dev with some items added. Confirm:
- Grid loads with correct thumbnails
- Tag filter pills work
- Newest/Oldest sort toggles work
- Clicking any card opens the modal
- Image, carousel (arrows + dots), video, and YouTube modes all render correctly in the modal
- Creator link appears in info panel
- "View Original" button opens in new tab
- Escape key and backdrop click close the modal

- [ ] **Step 4: Commit**

```bash
git add src/routes/discovery/[section]/
git commit -m "feat(discovery): media grid and Instagram-style modal with 4 media types"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 5 isolated DB tables — Task 1
- ✅ Sections manageable in admin — Task 4
- ✅ Items CRUD with 4 media types — Tasks 5–7
- ✅ Tags CRUD (discovery-specific) — Task 3
- ✅ Admin sidebar collapsible groups — Task 2
- ✅ Public section index driven from DB — Task 8
- ✅ Media grid with tag filters + sort — Task 9
- ✅ Instagram-style split modal (65/35) — Task 9
- ✅ YouTube nocookie embed — Task 9
- ✅ YouTube ID auto-extraction from URL — Tasks 6, 7
- ✅ YouTube thumbnail fallback from img.youtube.com — Task 9 (YOUTUBE_THUMB helper)
- ✅ Creator name + URL (modal only) — Task 9
- ✅ View Original button (new tab) — Task 9
- ✅ Carousel in modal with arrows + dots — Task 9
- ✅ Video player in modal — Task 9
- ✅ Mobile stacked layout — Task 9
- ✅ Delete blocked when section has items — Task 4

**Type consistency:** `discoveryItem`, `discoveryItemImage`, `discoveryItemTag`, `discoverySection`, `discoveryTag` — table names consistent across all tasks. `extractYoutubeId` defined identically in Tasks 6 and 7. `processAndUpload` defined identically in Tasks 6 and 7.

**One known duplication:** `extractYoutubeId` and `processAndUpload` are copy-pasted between the new and edit server files. If you want to DRY this up, extract both into `src/lib/server/discovery.js` — but this is optional and not blocking.

**Placeholder scan:** No TBDs. All code blocks are complete.
