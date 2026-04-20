-- =============================================
-- GreenLog Migration: Feedback Tickets System
-- Adds ticket_approvals table + updates RLS policies
-- =============================================

-- 1. Create ticket_approvals table (if not exists)
CREATE TABLE IF NOT EXISTS ticket_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES feedback_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

ALTER TABLE ticket_approvals ENABLE ROW LEVEL SECURITY;

-- RLS: any authenticated user can insert approvals
DROP POLICY IF EXISTS "Authenticated users can approve tickets" ON ticket_approvals;
CREATE POLICY "Authenticated users can approve tickets"
  ON ticket_approvals FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS: anyone authenticated can view approvals
DROP POLICY IF EXISTS "Anyone can view ticket approvals" ON ticket_approvals;
CREATE POLICY "Anyone can view ticket approvals"
  ON ticket_approvals FOR SELECT USING (auth.role() = 'authenticated');

-- RLS: users can delete their own approvals (un-approve)
DROP POLICY IF EXISTS "Users can delete own approvals" ON ticket_approvals;
CREATE POLICY "Users can delete own approvals"
  ON ticket_approvals FOR DELETE USING ((auth.uid())::text = user_id);

CREATE INDEX IF NOT EXISTS idx_ticket_approvals_ticket ON ticket_approvals(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_approvals_user ON ticket_approvals(user_id);

-- 2. Update feedback_tickets RLS policies
-- Remove old policies
DROP POLICY IF EXISTS "Anyone can create tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Authenticated users can create feedback tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Authenticated users can view all feedback tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Creator or pascal can update feedback tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Admin can delete feedback tickets" ON feedback_tickets;

-- New: any authenticated user can create tickets (creator ID check done in API route)
CREATE POLICY "Authenticated users can create feedback tickets"
  ON feedback_tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- New: any authenticated user can view all tickets (for browse/absegnen tab)
CREATE POLICY "Authenticated users can view all feedback tickets"
  ON feedback_tickets FOR SELECT USING (auth.role() = 'authenticated');

-- New: creator or pascal can update tickets
CREATE POLICY "Creator or pascal can update feedback tickets"
  ON feedback_tickets FOR UPDATE USING (
    (auth.uid())::text = user_id
    OR auth.uid() = '236a110e-0dbe-4500-97db-edf100158e4f'
  );

-- New: only pascal can delete tickets
CREATE POLICY "Admin can delete feedback tickets"
  ON feedback_tickets FOR DELETE USING (auth.uid() = '236a110e-0dbe-4500-97db-edf100158e4f');
