-- 0006 — the messaging gate
--
-- Rule 1: teacher -> school messaging is locked until the application reaches
-- the interview stage; before that the teacher may only send a super-like.
-- Rule 2: teacher-to-teacher messaging does not exist. It is not hidden here,
-- it is unrepresentable: every message hangs off an application, and an
-- application has exactly one teacher and one school.
--
-- Config: a platform default, overridable per school. NULL on the school
-- inherits. Decided rather than inferred — nothing in the mock said where the
-- configuration lives.
--
-- Re-lock: it does not. `messaging_unlocked_at` latches open. Rejection stops
-- new sends via the policy below, but the thread stays readable, so a message
-- stored legitimately at interview is never retroactively invalid.

BEGIN;

CREATE TABLE platform_settings (
  id                  boolean PRIMARY KEY DEFAULT true CHECK (id),  -- single row
  messaging_min_stage application_stage NOT NULL DEFAULT 'interview',
  school_may_initiate boolean NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

INSERT INTO platform_settings DEFAULT VALUES;

CREATE FUNCTION messaging_min_stage_for(p_school_id text)
  RETURNS application_stage LANGUAGE sql STABLE AS $$
  SELECT COALESCE(s.messaging_min_stage, ps.messaging_min_stage)
  FROM   platform_settings ps
  LEFT   JOIN schools s ON s.id = p_school_id $$;

CREATE FUNCTION school_may_initiate_for(p_school_id text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(s.school_may_initiate, ps.school_may_initiate)
  FROM   platform_settings ps
  LEFT   JOIN schools s ON s.id = p_school_id $$;

-- Now that messaging_min_stage_for exists, arm the pipeline triggers from 0005.
CREATE TRIGGER applications_pipeline
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION applications_pipeline();

CREATE TRIGGER applications_record_stage
  AFTER INSERT OR UPDATE OF stage ON applications
  FOR EACH ROW EXECUTE FUNCTION applications_record_stage();

CREATE TABLE messages (
  id             text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

  -- The mock addresses the school as a USER when sending (usr_his_hr) and as
  -- an ORGANISATION when receiving (sch_hangang). Modelled as a shared school
  -- inbox: exactly one sender column is set, and the counterparty follows from
  -- the application. Inbound mail is addressed to the school, and whichever
  -- user replies is recorded.
  sender_school_user_id text REFERENCES school_users(id),
  sender_teacher_id     text REFERENCES teachers(id),

  body           text NOT NULL CHECK (length(btrim(body)) > 0),
  sent_at        timestamptz NOT NULL DEFAULT now(),
  read_at        timestamptz,

  CONSTRAINT one_sender CHECK (
    (sender_school_user_id IS NOT NULL) <> (sender_teacher_id IS NOT NULL)
  )
);

CREATE INDEX ON messages (application_id, sent_at);
CREATE INDEX ON messages (application_id) WHERE read_at IS NULL;

CREATE FUNCTION messages_enforce_gate() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE app applications%ROWTYPE;
BEGIN
  SELECT * INTO app FROM applications WHERE id = NEW.application_id;

  IF app.messaging_unlocked_at IS NULL THEN
    RAISE EXCEPTION
      'application %: messaging is locked (stage %, opens at %). A teacher may only send a super-like before then.',
      app.id, app.stage, messaging_min_stage_for(app.school_id);
  END IF;

  IF app.stage IN ('rejected','withdrawn','hired') THEN
    RAISE EXCEPTION 'application %: thread is closed to new messages (stage %)', app.id, app.stage;
  END IF;

  IF NEW.sender_school_user_id IS NOT NULL THEN
    IF NOT school_may_initiate_for(app.school_id)
       AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.application_id = app.id) THEN
      RAISE EXCEPTION 'application %: this school may not open the conversation', app.id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM school_users u
                   WHERE u.id = NEW.sender_school_user_id AND u.school_id = app.school_id) THEN
      RAISE EXCEPTION 'user % does not belong to school %', NEW.sender_school_user_id, app.school_id;
    END IF;
  ELSE
    IF NEW.sender_teacher_id <> app.teacher_id THEN
      RAISE EXCEPTION 'teacher % is not the applicant on %', NEW.sender_teacher_id, app.id;
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER messages_enforce_gate BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_enforce_gate();

-- The only thing a teacher may send before the gate opens.
CREATE TABLE super_likes (
  application_id text PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  sent_at        timestamptz NOT NULL DEFAULT now()
);

COMMIT;
