-- doncezart additive schema migration (manual)
-- Generation log for the public tools: every YouTube card loaded or exported
-- in the tool page, and every card rendered through /api/youtube/card.
-- Shown in the admin under "Generations". Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS card_generation (
    id           serial PRIMARY KEY,
    tool         text NOT NULL,
    source       text NOT NULL,
    action       text NOT NULL,
    video_id     text,
    video_title  text,
    channel_name text,
    layout       text,
    format       text,
    client_hash  text,
    referrer     text,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_generation_created_idx ON card_generation (created_at);
CREATE INDEX IF NOT EXISTS card_generation_video_idx ON card_generation (video_id);

COMMIT;
