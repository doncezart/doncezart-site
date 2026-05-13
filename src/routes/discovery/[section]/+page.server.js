import { db } from '$lib/server/db/index.js';
import {
	discoverySection, discoveryItem,
	discoveryItemImage, discoveryItemTag, discoveryTag
} from '$lib/server/db/schema.ts';
import { eq, asc, desc, inArray, and, isNotNull, ne } from 'drizzle-orm';
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
	const seenTagPairs = new Set();
	for (const row of tagRows) {
		const key = `${row.itemId}:${row.tagId}`;
		if (seenTagPairs.has(key)) continue;
		seenTagPairs.add(key);
		if (!tagsByItem[row.itemId]) tagsByItem[row.itemId] = [];
		if (tagMap[row.tagId]) tagsByItem[row.itemId].push(tagMap[row.tagId]);
	}

	const mappedItems = items.map(item => ({
		...item,
		images: (imagesByItem[item.id] ?? []).map(img => img.imageUrl),
		tags: tagsByItem[item.id] ?? []
	}));

	// For each unique creator in this section, load their other visible items (cross-section)
	const creatorNames = [...new Set(items.map(i => i.creatorName).filter(Boolean))];
	const creatorItems = {};

	if (creatorNames.length > 0) {
		const currentIds = new Set(items.map(i => i.id));
		for (const creator of creatorNames) {
			const others = await db
				.select()
				.from(discoveryItem)
				.where(and(
					eq(discoveryItem.creatorName, creator),
					eq(discoveryItem.visible, true)
				))
				.orderBy(desc(discoveryItem.createdAt));

			// Load carousel images for these items
			const otherIds = others.map(i => i.id);
			let otherImages = [];
			if (otherIds.length > 0) {
				otherImages = await db
					.select()
					.from(discoveryItemImage)
					.where(inArray(discoveryItemImage.itemId, otherIds))
					.orderBy(asc(discoveryItemImage.position));
			}
			const otherImagesByItem = {};
			for (const img of otherImages) {
				if (!otherImagesByItem[img.itemId]) otherImagesByItem[img.itemId] = [];
				otherImagesByItem[img.itemId].push(img);
			}

			creatorItems[creator] = others.map(o => {
				const imgs = (otherImagesByItem[o.id] ?? []).map(img => img.imageUrl);
				// previewUrl priority: generated preview > static thumbnail > first image (non-video) > imageUrl for image items
				const previewUrl = o.previewUrl
					?? o.thumbnailUrl
					?? (imgs[0] && !/\.(mp4|webm|mov)$/i.test(imgs[0]) ? imgs[0] : null)
					?? (o.mediaType === 'image' ? o.imageUrl : null);
				return { ...o, images: imgs, tags: [], previewUrl };
			});
		}
	}

	return {
		section,
		items: mappedItems,
		allSectionTags,
		creatorItems
	};
}
