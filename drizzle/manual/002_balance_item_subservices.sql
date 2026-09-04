-- doncezart additive schema migration (manual)
-- Sub-services for balance items: a balance_item can now have a parent item,
-- and is rendered underneath it as a smaller, subdued line item.
-- Run when you're ready. Safe to run multiple times (IF NOT EXISTS guards).
-- Does NOT drop columns or alter existing rows.

BEGIN;

ALTER TABLE balance_item ADD COLUMN IF NOT EXISTS parent_id text REFERENCES balance_item(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS balance_item_parent_id_idx ON balance_item (parent_id);

COMMIT;