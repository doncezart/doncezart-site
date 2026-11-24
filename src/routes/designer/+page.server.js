import { db } from '$lib/server/db/index.js';
import { discoverySection, discoveryItem } from '$lib/server/db/schema.ts';
import { asc, desc, eq } from 'drizzle-orm';

// Designer side: every library section with its item count and a few recent
// covers for the preview mosaic.
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
		.select()
		.from(discoveryItem)
		.where(eq(discoveryItem.visible, true))
		.orderBy(desc(discoveryItem.createdAt));

	return {
		library: sections.map((s) => {
			const own = items.filter((i) => i.sectionId === s.id);
			return {
				name: s.name,
				slug: s.slug,
				description: s.description,
				count: own.length,
				covers: own.map((i) => ({ title: i.title, ...cover(i) })).filter((c) => c.src).slice(0, COVERS)
			};
		}),
		totalItems: items.length
	};
}
