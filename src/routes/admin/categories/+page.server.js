import { db } from '$lib/server/db/index.js';
import { category, subcategory } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function load() {
	const categories = await db.select().from(category).orderBy(category.name);
	const subcategories = await db.select().from(subcategory).orderBy(subcategory.name);
	return { categories, subcategories };
}

export const actions = {
	addCategory: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		if (!name) return fail(400, { error: 'Category name is required.' });
		if (name.length > 100) return fail(400, { error: 'Category name must be under 100 characters.' });
		const slug = slugify(name);
		try {
			await db.insert(category).values({ name, slug });
		} catch (e) {
			if (e.code === '23505') return fail(400, { error: 'A category with that name already exists.' });
			throw e;
		}
		return { success: true };
	},

	deleteCategory: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid category ID.' });
		await db.delete(category).where(eq(category.id, id));
		return { success: true };
	},

	renameCategory: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const name = data.get('name')?.toString().trim();
		if (!id || !name) return fail(400, { error: 'ID and name are required.' });
		if (name.length > 100) return fail(400, { error: 'Category name must be under 100 characters.' });
		const slug = slugify(name);
		try {
			await db.update(category).set({ name, slug }).where(eq(category.id, id));
		} catch (e) {
			if (e.code === '23505') return fail(400, { error: 'A category with that name already exists.' });
			throw e;
		}
		return { success: true };
	},

	addSubcategory: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const categoryId = Number(data.get('category_id'));
		if (!name || !categoryId) return fail(400, { error: 'Name and category are required.' });
		if (name.length > 100) return fail(400, { error: 'Subcategory name must be under 100 characters.' });
		const slug = slugify(name);
		await db.insert(subcategory).values({ name, slug, categoryId });
		return { success: true };
	},

	deleteSubcategory: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid subcategory ID.' });
		await db.delete(subcategory).where(eq(subcategory.id, id));
		return { success: true };
	},

	renameSubcategory: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const name = data.get('name')?.toString().trim();
		if (!id || !name) return fail(400, { error: 'ID and name are required.' });
		const slug = slugify(name);
		await db.update(subcategory).set({ name, slug }).where(eq(subcategory.id, id));
		return { success: true };
	},

	updateAspectRatio: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const aspectRatio = data.get('aspect_ratio')?.toString().trim();
		if (!id || !aspectRatio) return fail(400, { error: 'ID and aspect ratio are required.' });
		if (!/^\d+\/\d+$/.test(aspectRatio)) return fail(400, { error: 'Aspect ratio must be in the format "W/H" (e.g. 16/9).' });
		await db.update(category).set({ aspectRatio }).where(eq(category.id, id));
		return { success: true };
	}
};
