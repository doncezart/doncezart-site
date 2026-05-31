import { db } from '$lib/server/db/index.js';
import { discoveryItem, discoveryItemImage, discoverySection, auditEvent } from '$lib/server/db/schema.ts';
import { eq, asc, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { deleteFromR2 } from '$lib/server/r2.js';

function urlToKey(url) {
	if (!url) return null;
	try { return new URL(url).pathname.slice(1); } catch { return null; }
}

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
	delete: async ({ request, locals, getClientAddress }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id.' });

		const [item] = await db.select().from(discoveryItem).where(eq(discoveryItem.id, id));
		if (!item) return fail(404, { error: 'Not found.' });

		const carouselImages = await db
			.select()
			.from(discoveryItemImage)
			.where(eq(discoveryItemImage.itemId, id));

		try {
			await db.transaction(async (tx) => {
				await tx.delete(discoveryItem).where(eq(discoveryItem.id, id));
				await tx.insert(auditEvent).values({
					actorId: locals.user?.id ?? null,
					actorUsername: locals.user?.username ?? null,
					action: 'discovery.delete',
					entityType: 'discovery_item',
					entityId: String(id),
					payload: { title: item.title, mediaType: item.mediaType },
					ip: getClientAddress()
				});
			});
		} catch (e) {
			console.error('[admin/discovery/delete] tx failed:', e);
			return fail(500, { error: 'Database error.' });
		}

		const keysToDelete = [
			urlToKey(item.imageUrl),
			urlToKey(item.thumbnailUrl),
			urlToKey(item.previewUrl),
			...carouselImages.flatMap((img) => [urlToKey(img.imageUrl), urlToKey(img.thumbnailUrl)])
		].filter(Boolean);

		await Promise.allSettled(keysToDelete.map((key) => deleteFromR2(key)));

		return { deleted: true };
	},

	toggleVisible: async ({ request, locals, getClientAddress }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const visible = data.get('visible') === 'true';
		if (!id) return fail(400, { error: 'Invalid id.' });
		await db.update(discoveryItem).set({ visible: !visible }).where(eq(discoveryItem.id, id));
		await db.insert(auditEvent).values({
			actorId: locals.user?.id ?? null,
			actorUsername: locals.user?.username ?? null,
			action: 'discovery.toggle_visible',
			entityType: 'discovery_item',
			entityId: String(id),
			payload: { from: visible, to: !visible },
			ip: getClientAddress()
		});
		return { toggled: true };
	}
};

