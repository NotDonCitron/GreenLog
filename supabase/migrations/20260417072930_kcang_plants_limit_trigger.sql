-- Enforce KCanG § 9 at the database boundary.
-- App code already checks this before inserts/updates; this trigger is the final guard
-- for direct API writes and concurrent requests.

CREATE OR REPLACE FUNCTION enforce_kcang_active_plant_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF NEW.status IN ('seedling', 'vegetative', 'flowering', 'flushing') THEN
    SELECT COUNT(*) INTO active_count
    FROM plants
    WHERE user_id = NEW.user_id
      AND status IN ('seedling', 'vegetative', 'flowering', 'flushing')
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF active_count >= 3 THEN
      RAISE EXCEPTION 'KCANG_PLANT_LIMIT: Max 3 active plants allowed per user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kcang_active_plant_limit ON plants;

CREATE TRIGGER trg_kcang_active_plant_limit
  BEFORE INSERT OR UPDATE OF status, user_id ON plants
  FOR EACH ROW
  EXECUTE FUNCTION enforce_kcang_active_plant_limit();
