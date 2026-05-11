import { db } from '$lib/server/db/index.js';
import { caseStudy, artwork } from '$lib/server/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function load() {
	const caseStudies = await db.select().from(caseStudy).orderBy(caseStudy.title);

	// Count artworks per case study
	const countRows = await db
		.select({ caseStudyId: artwork.caseStudyId, count: sql`count(*)::int` })
		.from(artwork)
		.where(sql`case_study_id IS NOT NULL`)
		.groupBy(artwork.caseStudyId);
	const countMap = Object.fromEntries(countRows.map(r => [r.caseStudyId, r.count]));

	return {
		caseStudies: caseStudies.map(cs => ({
			...cs,
			artworkCount: countMap[cs.id] || 0
		}))
	};
}

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const content = data.get('content')?.toString().trim() || null;
		if (!title) return fail(400, { error: 'Title is required.' });
		const slug = slugify(title);
		try {
			await db.insert(caseStudy).values({ title, slug, content });
		} catch (e) {
			if (e.code === '23505') return fail(400, { error: 'A case study with that title already exists.' });
			throw e;
		}
		return { success: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const title = data.get('title')?.toString().trim();
		const content = data.get('content')?.toString().trim() || null;
		if (!id || !title) return fail(400, { error: 'ID and title are required.' });
		const slug = slugify(title);
		try {
			await db.update(caseStudy).set({ title, slug, content, updatedAt: new Date() }).where(eq(caseStudy.id, id));
		} catch (e) {
			if (e.code === '23505') return fail(400, { error: 'A case study with that title already exists.' });
			throw e;
		}
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid ID.' });
		// Unlink artworks first
		await db.update(artwork).set({ caseStudyId: null, hasCaseStudy: false }).where(eq(artwork.caseStudyId, id));
		await db.delete(caseStudy).where(eq(caseStudy.id, id));
		return { success: true };
	}
};
