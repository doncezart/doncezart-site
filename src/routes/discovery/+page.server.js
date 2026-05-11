import { db } from '$lib/server/db/index.js';
import { discoverySection } from '$lib/server/db/schema.ts';
import { asc } from 'drizzle-orm';

export async function load() {
	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	return { sections };
}
