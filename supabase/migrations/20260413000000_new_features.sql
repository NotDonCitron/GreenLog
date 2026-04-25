-- =============================================
-- GreenLog Migration: New Legal Features
-- Datum: 2026-04-13
-- Features: Reminders, EC/Wasser-Tracking, Consumption Log, PDF Report
-- Legal: All features designed to be compliant with German law (KCanG §9)
-- =============================================

-- =============================================
-- 1. GROW REMINDERS (Erinnerungen für Gießen, Düngen, Umtopfen)
-- Legal: Generic plant care reminders, no cannabis-specific claims
-- =============================================
CREATE TABLE IF NOT EXISTS grow_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  grow_id UUID REFERENCES grows(id) ON DELETE CASCADE,
  reminder_type TEXT CHECK (reminder_type IN (
    'water',        -- Gießen / Bewässerung
    'nutrient',     -- Düngen / Nährstoffe
    'repot',        -- Umtopfen
    'ph_check',     -- pH-Wert Prüfung (Wasser)
    'temp_check',   -- Temperatur-Prüfung
    'defoliation',  -- Entlaubung
    'harvest',      -- Erntezeitpunkt
    'general'       -- Allgemeine Erinnerung
  )) NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  repeat_interval_days INTEGER, -- NULL = keine Wiederholung
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  push_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE grow_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON grow_reminders FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can create own reminders"
  ON grow_reminders FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own reminders"
  ON grow_reminders FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON grow_reminders FOR DELETE USING (requesting_user_id() = user_id);

CREATE INDEX idx_grow_reminders_user ON grow_reminders(user_id);
CREATE INDEX idx_grow_reminders_grow ON grow_reminders(grow_id);
CREATE INDEX idx_grow_reminders_due ON grow_reminders(due_date) WHERE is_completed = false;
CREATE INDEX idx_grow_reminders_pending ON grow_reminders(user_id, is_completed) WHERE is_completed = false;


-- =============================================
-- 2. CONSUMPTION LOGS (Konsum-Tagebuch)
-- Legal: Neutral labels only, no medical effect claims
-- NOTE: We store CONSUMPTION METHOD and SUBJECTIVE NOTES only
-- No THC/CBD percentages, no medical diagnoses
-- =============================================
CREATE TABLE IF NOT EXISTS consumption_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE SET NULL,
  -- KEIN THC/CBD hier - das wäre rechtlich problematisch
  consumption_method TEXT CHECK (consumption_method IN (
    'vaporizer',    -- Verdampfer
    'joint',        -- Joint / Zigarette
    'bong',         -- Bong / Pfeife
    'pipe',         -- Pfeife
    'edible',       -- Essbar / Lebensmittel
    'oil',          -- Öl / Konzentrat
    'topical',      -- Äußerlich
    'other'         -- Sonstiges
  )) NOT NULL,
  -- Neutrale Menge (Gewicht, nicht "Dosis")
  amount_grams DECIMAL(5,2),
  -- SUBJEKTIVE NOTIZEN (keine medizinischen Wirkungen deklarieren)
  subjective_notes TEXT,
  -- Wie fühlst du dich? (nur zur eigenen Dokumentation)
  -- WICHTIG: Keine medizinischen Begriffe wie "heilt", "behandelt", etc.
  mood_before TEXT CHECK (mood_before IN (
    'neutral', 'entspannt', 'aktiv', 'müde', 'gestresst', 'fröhlich', 'traurig', 'anderes'
  )),
  mood_after TEXT CHECK (mood_after IN (
    'neutral', 'entspannt', 'aktiv', 'müde', 'gestresst', 'fröhlich', 'traurig', 'anderes'
  )),
  -- Konsumzeit
  consumed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consumption_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consumption logs"
  ON consumption_logs FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can create own consumption logs"
  ON consumption_logs FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own consumption logs"
  ON consumption_logs FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own consumption logs"
  ON consumption_logs FOR DELETE USING (requesting_user_id() = user_id);

CREATE INDEX idx_consumption_logs_user ON consumption_logs(user_id);
CREATE INDEX idx_consumption_logs_strain ON consumption_logs(strain_id);
CREATE INDEX idx_consumption_logs_consumed ON consumption_logs(consumed_at DESC);


-- =============================================
-- 3. EXTEND GROW_ENTRIES with EC/Wasser-Werte
-- Legal: EC = Electrical Conductivity = Düngerleitfähigkeit (Wasser)
-- KEIN Bezug zu Cannabis-Wirkstoffen
-- =============================================
ALTER TABLE grow_entries
ADD COLUMN IF NOT EXISTS ec_value DECIMAL(5,2);  -- EC in mS/cm (Wasserqualität)

ALTER TABLE grow_entries
ADD COLUMN IF NOT EXISTS water_temperature DECIMAL(4,1);  -- Wassertemperatur in °C

ALTER TABLE grow_entries
ADD COLUMN IF NOT EXISTS nutrient_dose DECIMAL(5,2);  -- Dünger in ml/L

COMMENT ON COLUMN grow_entries.ec_value IS 'Wasser-EC Wert in mS/cm (Leitfähigkeit) - kein Wirkstoffgehalt';
COMMENT ON COLUMN grow_entries.water_temperature IS 'Wassertemperatur in Grad Celsius';
COMMENT ON COLUMN grow_entries.nutrient_dose IS 'Dünger-Dosierung in ml pro Liter';


-- =============================================
-- 4. EXTEND GROWS with more tracking fields
-- =============================================
ALTER TABLE grows
ADD COLUMN IF NOT EXISTS expected_harvest_date DATE,
ADD COLUMN IF NOT EXISTS grow_notes TEXT;


-- =============================================
-- 5. FUNCTION: Send Grow Reminder Push
-- =============================================
CREATE OR REPLACE FUNCTION send_grow_reminder_push(p_reminder_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id TEXT;
  v_title TEXT;
  v_body TEXT;
  v_subscription JSONB;
  v_endpoint TEXT;
  v_keys JSONB;
  v_auth TEXT;
BEGIN
  -- Get reminder details
  SELECT r.user_id, r.title INTO v_user_id, v_title
  FROM grow_reminders r WHERE r.id = p_reminder_id;

  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  -- Build notification body
  v_body := 'Erinnerung: ' || v_title;

  -- Get user's push subscriptions
  FOR v_subscription IN
    SELECT payload FROM push_subscriptions WHERE user_id = v_user_id
  LOOP
    v_endpoint := v_subscription->>'endpoint';
    v_keys := v_subscription->'keys';
    v_auth := v_keys->>'auth';

    -- Send push (will be handled by API route cron job)
    PERFORM net.http_post(
      url := '/api/push/send',
      body := jsonb_build_object(
        'endpoint', v_endpoint,
        'keys', v_keys,
        'title', v_title,
        'body', v_body
      )
    );
  END LOOP;

  -- Mark as sent
  UPDATE grow_reminders SET push_sent = true WHERE id = p_reminder_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 6. FUNCTION: Complete reminder and create next
-- =============================================
CREATE OR REPLACE FUNCTION complete_reminder_and_repeat(p_reminder_id UUID)
RETURNS UUID AS $$
DECLARE
  v_reminder grow_reminders%ROWTYPE;
  v_new_id UUID;
BEGIN
  SELECT * INTO v_reminder FROM grow_reminders WHERE id = p_reminder_id;

  IF NOT FOUND OR v_reminder.is_completed THEN
    RETURN NULL;
  END IF;

  -- Mark as completed
  UPDATE grow_reminders
  SET is_completed = true, completed_at = now()
  WHERE id = p_reminder_id;

  -- Create next reminder if interval is set
  IF v_reminder.repeat_interval_days IS NOT NULL AND v_reminder.repeat_interval_days > 0 THEN
    INSERT INTO grow_reminders (
      user_id, grow_id, reminder_type, title, notes,
      due_date, repeat_interval_days
    ) VALUES (
      v_reminder.user_id, v_reminder.grow_id, v_reminder.reminder_type,
      v_reminder.title, v_reminder.notes,
      now() + (v_reminder.repeat_interval_days || ' days')::interval,
      v_reminder.repeat_interval_days
    ) RETURNING id INTO v_new_id;

    RETURN v_new_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
