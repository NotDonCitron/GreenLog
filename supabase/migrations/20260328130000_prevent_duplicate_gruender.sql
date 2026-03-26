-- Prevent duplicate gründer memberships
-- This is a DB-level safeguard to prevent a user from being Gründer of more than one organization
CREATE OR REPLACE FUNCTION prevent_duplicate_gruender()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'gründer' AND EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = NEW.user_id AND role = 'gründer'
  ) THEN
    RAISE EXCEPTION 'User is already Gründer of another community';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_gruender
  BEFORE INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_gruender();
