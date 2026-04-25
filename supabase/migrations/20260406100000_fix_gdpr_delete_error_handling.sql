ALTER TABLE gdpr_deletion_requests
ADD COLUMN IF NOT EXISTS auth_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_deletion_error text;