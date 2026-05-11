import { pgTable, text, integer, timestamp, boolean, serial } from 'drizzle-orm/pg-core';

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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

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

// ── Types ──────────────────────────────────────────────
export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Artwork = typeof artwork.$inferSelect;
export type ArtworkImage = typeof artworkImage.$inferSelect;
export type CaseStudy = typeof caseStudy.$inferSelect;
export type Tag = typeof tag.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Subcategory = typeof subcategory.$inferSelect;
