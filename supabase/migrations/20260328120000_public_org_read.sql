-- Make organizations publicly readable (names, types, etc.)
-- Only status='active' organizations are listed in the app
CREATE POLICY "organizations_public_read" ON organizations FOR SELECT USING (true);