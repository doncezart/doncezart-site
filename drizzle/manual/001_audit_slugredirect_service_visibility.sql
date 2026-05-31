-- doncezart additive schema migration (manual)
-- Run when you're ready. Safe to run multiple times (IF NOT EXISTS guards).
-- Does NOT drop columns or alter existing rows.

BEGIN;

-- artwork: visible flag (drafts) + soft delete
ALTER TABLE artwork ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;
ALTER TABLE artwork ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS artwork_visible_idx ON artwork (visible, deleted_at);
CREATE INDEX IF NOT EXISTS artwork_category_idx ON artwork (category);

-- slug_redirect: old → current artwork slug
CREATE TABLE IF NOT EXISTS slug_redirect (
	from_slug text PRIMARY KEY,
	to_slug   text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

-- service: optional sales / services pages
CREATE TABLE IF NOT EXISTS service (
	id         serial PRIMARY KEY,
	slug       text NOT NULL UNIQUE,
	title      text NOT NULL,
	tagline    text,
	body       text,
	price_from integer,
	visible    boolean NOT NULL DEFAULT true,
	position   integer NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

-- audit_event: append-only admin action log
CREATE TABLE IF NOT EXISTS audit_event (
	id              serial PRIMARY KEY,
	actor_id        text,
	actor_username  text,
	action          text NOT NULL,
	entity_type     text,
	entity_id       text,
	payload         jsonb,
	ip              text,
	created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_event_entity_idx  ON audit_event (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_event_created_idx ON audit_event (created_at);

COMMIT;
