-- doncezart additive schema migration (manual)
-- Previous-balance links: lets an admin attach other balances (e.g. older
-- payments from the same client) so the client page can link to them.
-- Run when you're ready. Safe to run multiple times (IF NOT EXISTS guards).

BEGIN;

CREATE TABLE IF NOT EXISTS balance_previous (
    balance_id text NOT NULL REFERENCES balance(id) ON DELETE CASCADE,
    previous_id text NOT NULL REFERENCES balance(id) ON DELETE CASCADE,
    position   integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (balance_id, previous_id)
);

CREATE INDEX IF NOT EXISTS balance_previous_balance_id_idx ON balance_previous (balance_id);

COMMIT;