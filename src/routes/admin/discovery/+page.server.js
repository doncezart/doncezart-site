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
		await db.delete(discoveryItem).where(eq(discoveryItem.id, id));
		return { deleted: true };
	}
};
