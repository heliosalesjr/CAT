-- 0010 — notifications
-- Explicitly not real-time; rows are produced by Cloud Tasks / Pub-Sub workers.

BEGIN;

CREATE TABLE notifications (
  id             text PRIMARY KEY,
  recipient_type text NOT NULL CHECK (recipient_type IN ('candidate','school_user')),
  recipient_id   text NOT NULL,
  kind           text NOT NULL,
  -- Four values, not three: the bundle has no severity enum to copy, and it
  -- uses 'success' as well ("moved you to Offer"). A notification feed that
  -- cannot say good news is the wrong shape for a two-sided product.
  severity       text NOT NULL DEFAULT 'info'
                 CHECK (severity IN ('info','success','warning','critical')),
  title          text NOT NULL,
  body           text,
  action_url     text,
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON notifications (recipient_type, recipient_id, created_at DESC);
CREATE INDEX ON notifications (recipient_type, recipient_id) WHERE read_at IS NULL;

COMMIT;
