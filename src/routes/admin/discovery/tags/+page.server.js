import { db } from '$lib/server/db/index.js';
import { discoveryTag, discoveryItemTag } from '$lib/server/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function load() {
	const tags = await db
		.select({
			id: discoveryTag.id,
			name: discoveryTag.name,
			slug: discoveryTag.slug,
			useCount: sql`(SELECT COUNT(*) FROM discovery_item_tag WHERE tag_id = ${discoveryTag.id})::int`
		})
		.from(discoveryTag)
		.orderBy(discoveryTag.name);
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
	},

	rename: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const name = data.get('name')?.toString().trim();
		if (!id || !name) return fail(400, { error: 'Invalid input.' });
		const slug = slugify(name);
		try {
			await db.update(discoveryTag).set({ name, slug }).where(eq(discoveryTag.id, id));
		} catch {
			return fail(400, { error: 'Tag name already taken.' });
		}
		return { renamed: true };
	}
};
