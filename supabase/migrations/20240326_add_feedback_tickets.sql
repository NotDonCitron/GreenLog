-- =============================================
-- Feedback Tickets System
-- =============================================

CREATE TABLE IF NOT EXISTS feedback_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
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
-- Hinweis: Hier kannst du deine User-ID hart codieren oder eine Admin-Rolle nutzen.
-- Für den Anfang: Der Ersteller sieht seine eigenen Tickets, Admins sehen alles.
CREATE POLICY "Users can view own tickets"
  ON feedback_tickets FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE username = 'phhttps'));

-- 3. Nur Admins können Tickets aktualisieren (Status ändern etc.)
CREATE POLICY "Admins can update tickets"
  ON feedback_tickets FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE username = 'phhttps'));

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_tickets_user ON feedback_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON feedback_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON feedback_tickets(created_at);
