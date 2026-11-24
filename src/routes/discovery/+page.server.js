import { db } from '$lib/server/db/index.js';
import { discoverySection, discoveryItem } from '$lib/server/db/schema.ts';
import { asc, desc, eq } from 'drizzle-orm';

// Each section with its item count and a few recent covers for the card mosaic.
const COVERS = 4;

function cover(item) {
	// Video items keep the clip itself in imageUrl; previewUrl is the short loop.
	if (item.mediaType === 'video') {
		const src = item.previewUrl || item.imageUrl;
		return src ? { kind: 'video', src, poster: item.thumbnailUrl } : null;
	}
	if (item.thumbnailUrl || item.imageUrl) return { kind: 'image', src: item.thumbnailUrl || item.imageUrl };
	if (item.youtubeId) return { kind: 'image', src: `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg` };
	if (item.previewUrl) return { kind: 'video', src: item.previewUrl };
	return null;
}

export async function load() {
	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	const items = await db
		.select({
			sectionId: discoveryItem.sectionId,
			title: discoveryItem.title,
			mediaType: discoveryItem.mediaType,
			imageUrl: discoveryItem.imageUrl,
			thumbnailUrl: discoveryItem.thumbnailUrl,
			previewUrl: discoveryItem.previewUrl,
			youtubeId: discoveryItem.youtubeId
		})
		.from(discoveryItem)
		.where(eq(discoveryItem.visible, true))
		.orderBy(desc(discoveryItem.createdAt));

	return {
		sections: sections.map((s) => {
			const own = items.filter((i) => i.sectionId === s.id);
			return {
				...s,
				count: own.length,
				covers: own
					.map((i) => ({ title: i.title, ...cover(i) }))
					.filter((c) => c.src)
					.slice(0, COVERS)
			};
		})
	};
}
