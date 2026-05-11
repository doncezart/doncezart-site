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
