import { db } from '$lib/server/db/index.js';
import { artwork, artworkImage, artworkTag, tag, category, subcategory } from '$lib/server/db/schema.ts';
import { desc } from 'drizzle-orm';

export async function load() {
	const artworks = await db.select().from(artwork).orderBy(desc(artwork.createdAt));

	const allTags = await db.select().from(tag);
	const atRows = await db.select().from(artworkTag);
	const aiRows = await db.select().from(artworkImage);
	const categories = await db.select().from(category).orderBy(category.name);
	const subcategories = await db.select().from(subcategory).orderBy(subcategory.name);

	const tagMap = Object.fromEntries(allTags.map(t => [t.id, t]));
	const artworkTags = {};
	for (const row of atRows) {
		if (!artworkTags[row.artworkId]) artworkTags[row.artworkId] = [];
		if (tagMap[row.tagId]) artworkTags[row.artworkId].push(tagMap[row.tagId]);
	}

	// Group images by artwork, sorted by position
	const artworkImages = {};
	for (const row of aiRows) {
		if (!artworkImages[row.artworkId]) artworkImages[row.artworkId] = [];
		artworkImages[row.artworkId].push({
			imageUrl: row.imageUrl,
			thumbnailUrl: row.thumbnailUrl,
			position: row.position
		});
	}
	for (const key in artworkImages) {
		artworkImages[key].sort((a, b) => a.position - b.position);
	}

	// Build category filter structure from DB
	const categoryFilters = [
		{ id: 'all', label: 'All' },
		...categories.map(c => ({ id: c.slug, label: c.name }))
	];

	const subcategoryFilters = {};
	for (const cat of categories) {
		const subs = subcategories.filter(s => s.categoryId === cat.id);
		if (subs.length > 0) {
			subcategoryFilters[cat.slug] = [
				{ id: 'all', label: 'All' },
				...subs.map(s => ({ id: s.slug, label: s.name }))
			];
		}
	}

	// Build category aspect ratio map from DB
	const categoryAspectRatios = {};
	for (const cat of categories) {
		categoryAspectRatios[cat.slug] = cat.aspectRatio || '1/1';
	}

	return {
		artworks: artworks.map(a => {
			const images = artworkImages[a.id] || [];
			return {
				id: a.id,
				title: a.title,
				slug: a.slug,
				description: a.description,
				imageUrl: a.imageUrl,
				thumbnailUrl: a.thumbnailUrl || a.imageUrl,
				category: a.category,
				subcategory: a.subcategory,
				displayMode: a.displayMode,
				carouselDirection: a.carouselDirection || 'horizontal',
				hasCaseStudy: !!(a.caseStudyId),
				tags: artworkTags[a.id] ?? [],
				images: images.map(img => img.imageUrl),
				imageCount: images.length || 1
			};
		}),
		allTags,
		categoryFilters,
		subcategoryFilters,
		categoryAspectRatios
	};
}
