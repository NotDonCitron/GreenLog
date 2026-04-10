import fs from 'fs';

const schemaPath = './supabase-schema.sql';
const rlsPath = './supabase-rls-policies.sql';

let schema = fs.readFileSync(schemaPath, 'utf8');
let rls = fs.existsSync(rlsPath) ? fs.readFileSync(rlsPath, 'utf8') : '';

// 1. User ids from UUID to TEXT
schema = schema.replace(/id UUID PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE/g, "id TEXT PRIMARY KEY");
schema = schema.replace(/created_by UUID REFERENCES profiles\(id\)/g, "created_by TEXT REFERENCES profiles(id)");
schema = schema.replace(/user_id UUID REFERENCES profiles\(id\)/g, "user_id TEXT REFERENCES profiles(id)");
schema = schema.replace(/invited_by UUID REFERENCES profiles\(id\)/g, "invited_by TEXT REFERENCES profiles(id)");
schema = schema.replace(/follower_id UUID REFERENCES profiles\(id\)/g, "follower_id TEXT REFERENCES profiles(id)");
schema = schema.replace(/following_id UUID REFERENCES profiles\(id\)/g, "following_id TEXT REFERENCES profiles(id)");
schema = schema.replace(/requester_id UUID REFERENCES profiles\(id\)/g, "requester_id TEXT REFERENCES profiles(id)");
schema = schema.replace(/target_id UUID REFERENCES profiles\(id\)/g, "target_id TEXT REFERENCES profiles(id)");
schema = schema.replace(/follower_uuid UUID/g, "follower_uuid TEXT");
schema = schema.replace(/following_uuid UUID/g, "following_uuid TEXT");
schema = schema.replace(/RETURNS UUID AS \$\$/g, "RETURNS TEXT AS $$");
schema = schema.replace(/follow_id UUID;/g, "follow_id TEXT;");
schema = schema.replace(/p_user_id UUID/g, "p_user_id TEXT");

// 2. Replace auth.uid() with requesting_user_id()
schema = schema.replace(/auth\.uid\(\)/g, "requesting_user_id()");
rls = rls.replace(/auth\.uid\(\)/g, "requesting_user_id()");

// 3. Add requesting_user_id() function at the top
const requestFunc = `
-- Function to extract Clerk user ID from Supabase custom JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::TEXT;
$$ LANGUAGE SQL STABLE;
`;

if (!schema.includes("CREATE OR REPLACE FUNCTION requesting_user_id()")) {
    schema = schema.replace("-- 0. HELPER FUNCTIONS", "-- 0. HELPER FUNCTIONS" + requestFunc);
}

fs.writeFileSync(schemaPath, schema);
if (fs.existsSync(rlsPath)) fs.writeFileSync(rlsPath, rls);

console.log("Migration script complete.");
