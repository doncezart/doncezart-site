import { db } from '$lib/server/db/index.js';
import { tag } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function load() {
	const tags = await db.select().from(tag).orderBy(tag.name);
	return { tags };
}

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		if (!name) return fail(400, { error: 'Tag name is required.' });
		if (name.length > 100) return fail(400, { error: 'Tag name must be under 100 characters.' });

		const slug = slugify(name);
		try {
			await db.insert(tag).values({ name, slug });
		} catch {
			return fail(400, { error: 'Tag already exists.' });
		}
		return { created: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id.' });
		await db.delete(tag).where(eq(tag.id, id));
		return { deleted: true };
	}
};
