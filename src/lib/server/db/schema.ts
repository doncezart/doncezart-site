import { pgTable, text, integer, timestamp, boolean, serial, jsonb, index } from 'drizzle-orm/pg-core';

// ── Auth ───────────────────────────────────────────────
export const user = pgTable('user', {
    id: text('id').primaryKey(),
    age: integer('age'),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// ── Artworks ───────────────────────────────────────────
export const artwork = pgTable('artwork', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    category: text('category').notNull(),
    subcategory: text('subcategory'),
    blurDataUrl: text('blur_data_url'),
    displayMode: text('display_mode').notNull().default('single'),
    carouselDirection: text('carousel_direction').notNull().default('horizontal'),
    caseStudyId: integer('case_study_id'),
    hasCaseStudy: boolean('has_case_study').notNull().default(false),
    caseStudyContent: text('case_study_content'),
    visible: boolean('visible').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
}, (t) => ({
    visibleIdx: index('artwork_visible_idx').on(t.visible, t.deletedAt),
    categoryIdx: index('artwork_category_idx').on(t.category)
}));

// ── Artwork Images ─────────────────────────────────────
export const artworkImage = pgTable('artwork_image', {
    id: serial('id').primaryKey(),
    artworkId: integer('artwork_id').notNull().references(() => artwork.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    blurDataUrl: text('blur_data_url'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

// ── Case Studies ───────────────────────────────────────
export const caseStudy = pgTable('case_study', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    content: text('content'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

// ── Categories ─────────────────────────────────────────
export const category = pgTable('category', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    aspectRatio: text('aspect_ratio').notNull().default('1/1')
});

export const subcategory = pgTable('subcategory', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    categoryId: integer('category_id').notNull().references(() => category.id, { onDelete: 'cascade' })
});

// ── Tags ───────────────────────────────────────────────
export const tag = pgTable('tag', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique()
});

export const artworkTag = pgTable('artwork_tag', {
    artworkId: integer('artwork_id').notNull().references(() => artwork.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull().references(() => tag.id, { onDelete: 'cascade' })
});

// ── Slug Redirects ─────────────────────────────────────
// Old artwork slug → current slug, for 301s after a rename.
export const slugRedirect = pgTable('slug_redirect', {
    fromSlug: text('from_slug').primaryKey(),
    toSlug: text('to_slug').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

// ── Services (sales pages) ─────────────────────────────
export const service = pgTable('service', {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    tagline: text('tagline'),
    body: text('body'),
    priceFrom: integer('price_from'),
    visible: boolean('visible').notNull().default(true),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

// ── Audit Log ──────────────────────────────────────────
// Append-only record of admin actions for accountability + debugging.
export const auditEvent = pgTable('audit_event', {
    id: serial('id').primaryKey(),
    actorId: text('actor_id'),
    actorUsername: text('actor_username'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    payload: jsonb('payload'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
}, (t) => ({
    entityIdx: index('audit_event_entity_idx').on(t.entityType, t.entityId),
    createdIdx: index('audit_event_created_idx').on(t.createdAt)
}));

// ── Discovery ──────────────────────────────────────────
export const discoverySection = pgTable('discovery_section', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	position: integer('position').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const discoveryTag = pgTable('discovery_tag', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	slug: text('slug').notNull().unique()
});

export const discoveryItem = pgTable('discovery_item', {
	id: serial('id').primaryKey(),
	sectionId: integer('section_id').notNull().references(() => discoverySection.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	notes: text('notes'),
	mediaType: text('media_type').notNull(),
	imageUrl: text('image_url'),
	thumbnailUrl: text('thumbnail_url'),
	previewUrl: text('preview_url'),
	youtubeId: text('youtube_id'),
	sourceUrl: text('source_url'),
	creatorName: text('creator_name'),
	creatorUrl: text('creator_url'),
	position: integer('position').notNull().default(0),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const discoveryItemImage = pgTable('discovery_item_image', {
	id: serial('id').primaryKey(),
	itemId: integer('item_id').notNull().references(() => discoveryItem.id, { onDelete: 'cascade' }),
	imageUrl: text('image_url').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	position: integer('position').notNull().default(0)
});

export const discoveryItemTag = pgTable('discovery_item_tag', {
	itemId: integer('item_id').notNull().references(() => discoveryItem.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id').notNull().references(() => discoveryTag.id, { onDelete: 'cascade' })
});

// ── Types ──────────────────────────────────────────────
export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Artwork = typeof artwork.$inferSelect;
export type ArtworkImage = typeof artworkImage.$inferSelect;
export type CaseStudy = typeof caseStudy.$inferSelect;
export type Tag = typeof tag.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Subcategory = typeof subcategory.$inferSelect;
export type SlugRedirect = typeof slugRedirect.$inferSelect;
export type Service = typeof service.$inferSelect;
export type AuditEvent = typeof auditEvent.$inferSelect;
export type DiscoverySection = typeof discoverySection.$inferSelect;
export type DiscoveryTag = typeof discoveryTag.$inferSelect;
export type DiscoveryItem = typeof discoveryItem.$inferSelect;
export type DiscoveryItemImage = typeof discoveryItemImage.$inferSelect;
