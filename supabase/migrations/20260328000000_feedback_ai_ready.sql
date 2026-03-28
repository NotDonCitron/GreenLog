-- =============================================
-- GreenLog Migration: AI-Ready Ticket System
-- Adds ready_for_ai status + auto-transition on 2 approvals
-- =============================================

-- 1. Add ready_for_ai to status enum (if not exists)
-- We need to drop and recreate the check constraint since Postgres doesn't support ALTER TYPE ADD VALUE for check constraints
ALTER TABLE feedback_tickets DROP CONSTRAINT IF EXISTS feedback_tickets_status_check;
ALTER TABLE feedback_tickets ADD CONSTRAINT feedback_tickets_status_check
  CHECK (status IN ('open', 'ready_for_ai', 'in_progress', 'resolved', 'closed'));

-- 2. Function: auto-set ready_for_ai when 2 approvals
CREATE OR REPLACE FUNCTION set_ticket_ready_for_ai()
RETURNS TRIGGER AS $$
DECLARE
  approval_count INTEGER;
  ticket_status TEXT;
BEGIN
  -- Count approvals for the ticket
  SELECT COUNT(*) INTO approval_count
  FROM ticket_approvals
  WHERE ticket_id = COALESCE(NEW.ticket_id, OLD.ticket_id);

  -- Get current ticket status
  SELECT status INTO ticket_status
  FROM feedback_tickets
  WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);

  -- If 2+ approvals and status is 'open', set to ready_for_ai
  IF approval_count >= 2 AND ticket_status = 'open' THEN
    UPDATE feedback_tickets
    SET status = 'ready_for_ai', updated_at = now()
    WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on ticket_approvals after insert
DROP TRIGGER IF EXISTS trigger_set_ticket_ready_for_ai ON ticket_approvals;
CREATE TRIGGER trigger_set_ticket_ready_for_ai
  AFTER INSERT OR DELETE ON ticket_approvals
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_ready_for_ai();

-- 4. Index for AI queries
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_ready_for_ai
  ON feedback_tickets(status)
  WHERE status = 'ready_for_ai';
