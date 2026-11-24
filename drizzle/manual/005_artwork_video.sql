-- doncezart additive schema migration (manual)
-- Video entries in the portfolio: an artwork with display_mode 'video' plays a
-- YouTube video (video_id) in the My Work lightbox, and shows its live view
-- count. Adds the "Video Editing" category they go in. Safe to run multiple times.

BEGIN;

ALTER TABLE artwork ADD COLUMN IF NOT EXISTS video_id text;

INSERT INTO category (name, slug, aspect_ratio)
VALUES ('Video Editing', 'video-editing', '16/9')
ON CONFLICT DO NOTHING;

COMMIT;
