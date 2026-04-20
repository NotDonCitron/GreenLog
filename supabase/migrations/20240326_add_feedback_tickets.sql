-- =============================================
-- Feedback Tickets System
-- =============================================

CREATE TABLE IF NOT EXISTS feedback_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- TEXT because GreenLog auth IDs are Clerk/Supabase subject strings.
  -- No FK here: this migration runs before profiles exists in the current chain.
  user_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  category TEXT CHECK (category IN ('bug', 'feature', 'design', 'content', 'other')) DEFAULT 'other',
  page_url TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE feedback_tickets ENABLE ROW LEVEL SECURITY;

-- 1. Jeder (auch Gäste oder eingeloggte Freunde) kann Tickets erstellen
CREATE POLICY "Anyone can create tickets"
  ON feedback_tickets FOR INSERT WITH CHECK (true);

-- 2. Nur Admins (oder der Ersteller) können Tickets sehen
-- Früh-migrationssicher ohne Abhängigkeit auf profiles.
CREATE POLICY "Users can view own tickets"
  ON feedback_tickets FOR SELECT USING ((auth.uid())::text = user_id);

-- 3. Ersteller können ihre eigenen Tickets aktualisieren
CREATE POLICY "Users can update own tickets"
  ON feedback_tickets FOR UPDATE USING ((auth.uid())::text = user_id);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_tickets_user ON feedback_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON feedback_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON feedback_tickets(created_at);
