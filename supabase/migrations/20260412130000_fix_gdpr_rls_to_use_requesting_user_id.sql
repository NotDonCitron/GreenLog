-- =============================================
-- Fix GDPR RLS Policies
-- =============================================
-- The GDPR tables (user_consents, gdpr_deletion_requests, gdpr_export_jobs)
-- were using auth.uid() in RLS policies, but with Clerk JWT authentication,
-- auth.uid() returns NULL because Clerk JWTs aren't Supabase Auth tokens.
-- We need to use requesting_user_id() which reads from request.jwt.claims.sub
-- (set by Clerk in the JWT payload).

-- user_consents - Fix RLS to use requesting_user_id()
DROP POLICY IF EXISTS "Users can view own consents" ON user_consents;
DROP POLICY IF EXISTS "Users can manage own consents" ON user_consents;
DROP POLICY IF EXISTS "Users can update own consents" ON user_consents;

CREATE POLICY "Users can view own consents"
  ON user_consents FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can manage own consents"
  ON user_consents FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own consents"
  ON user_consents FOR UPDATE USING (requesting_user_id() = user_id);

-- gdpr_deletion_requests - Fix RLS
DROP POLICY IF EXISTS "Users can view own deletion request" ON gdpr_deletion_requests;
DROP POLICY IF EXISTS "Users can create deletion request" ON gdpr_deletion_requests;

CREATE POLICY "Users can view own deletion request"
  ON gdpr_deletion_requests FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can create deletion request"
  ON gdpr_deletion_requests FOR INSERT WITH CHECK (requesting_user_id() = user_id);

-- gdpr_export_jobs - Fix RLS
DROP POLICY IF EXISTS "Users can view own export jobs" ON gdpr_export_jobs;
DROP POLICY IF EXISTS "Users can create export jobs" ON gdpr_export_jobs;

CREATE POLICY "Users can view own export jobs"
  ON gdpr_export_jobs FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can create export jobs"
  ON gdpr_export_jobs FOR INSERT WITH CHECK (requesting_user_id() = user_id);
