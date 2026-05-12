import { db } from '$lib/server/db/index.js';
import {
	discoverySection, discoveryItem,
	discoveryItemImage, discoveryItemTag, discoveryTag
} from '$lib/server/db/schema.ts';
import { eq, asc, desc, inArray, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const [section] = await db
		.select()
		.from(discoverySection)
		.where(eq(discoverySection.slug, params.section));

	if (!section) error(404, `Section "${params.section}" not found`);

	const items = await db
		.select()
		.from(discoveryItem)
		.where(and(eq(discoveryItem.sectionId, section.id), eq(discoveryItem.visible, true)))
		.orderBy(desc(discoveryItem.createdAt));

	const itemIds = items.map(i => i.id);
	let imageRows = [];
	let tagRows = [];
	let allSectionTags = [];

	if (itemIds.length > 0) {
		imageRows = await db
			.select()
			.from(discoveryItemImage)
			.where(inArray(discoveryItemImage.itemId, itemIds))
			.orderBy(asc(discoveryItemImage.position));

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
