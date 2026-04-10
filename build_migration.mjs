import fs from 'fs';
import path from 'path';

// Collect all sql files
const dir = './supabase/migrations';
let files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).map(f => path.join(dir, f));
files.push('./supabase-schema.sql');
files.push('./supabase-rls-policies.sql');

let references = []; // { table, column, on_delete }
let tables = new Set();
let policies = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Identify CREATE TABLE blocks to know table names
  let regexTable = /CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\(([\s\S]*?)\);/g;
  let match;
  while ((match = regexTable.exec(content)) !== null) {
    let tableName = match[1];
    let body = match[2];
    tables.add(tableName);

    let lines = body.split('\n');
    for (let line of lines) {
      if (line.includes('REFERENCES profiles')) {
        let colMatch = line.match(/^\s*(\w+)\s+(?:UUID|TEXT)/);
        if (colMatch) {
          let colName = colMatch[1];
          let onDelete = 'NO ACTION';
          if (line.includes('ON DELETE CASCADE')) onDelete = 'CASCADE';
          if (line.includes('ON DELETE SET NULL')) onDelete = 'SET NULL';
          references.push({ table: tableName, column: colName, onDelete });
        }
      }
    }
  }

  // Identify ALTER TABLE ADD COLUMN ... REFERENCES profiles
  let regexAlter = /ALTER TABLE (\w+) ADD COLUMN (\w+) (?:UUID|TEXT) REFERENCES profiles\(\w+\)(.*);/g;
  while ((match = regexAlter.exec(content)) !== null) {
    let tableName = match[1];
    let colName = match[2];
    let rest = match[3];
    tables.add(tableName);

    let onDelete = 'NO ACTION';
    if (rest.includes('ON DELETE CASCADE')) onDelete = 'CASCADE';
    if (rest.includes('ON DELETE SET NULL')) onDelete = 'SET NULL';

    references.push({ table: tableName, column: colName, onDelete });
  }
}

// Remove duplicates
let uniqueRefs = [];
let seen = new Set();
for (let ref of references) {
  let key = ref.table + "." + ref.column;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueRefs.push(ref);
  }
}

// Unique Policies by NAME and TABLE (keep latest)
let uniquePolsMap = new Map();
let fallbackPols = [];
let allFunctionsMap = new Map();

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/auth\.uid\(\)/g, "requesting_user_id()");
  content = content.replace(/auth\.jwt\(\)/g, "current_setting('request.jwt.claims', true)::jsonb");

  // Also proactively patch known UUID variables for user id
  content = content.replace(/p_user_id UUID/gi, "p_user_id TEXT");
  content = content.replace(/target_user_id UUID/gi, "target_user_id TEXT");
  content = content.replace(/follower_uuid UUID/gi, "follower_uuid TEXT");
  content = content.replace(/following_uuid UUID/gi, "following_uuid TEXT");

  let match;
  let regexPolicy = /CREATE POLICY[^;]+;/g;
  while ((match = regexPolicy.exec(content)) !== null) {
    if (match[0].includes("CREATE POLICY")) {
      policies.push(match[0]);
    }
  }

  let regexFunc = /CREATE(?: OR REPLACE)? FUNCTION\s+([a-zA-Z0-9_]+)[\s\S]*?\$\$(?:[\s\S]*?)\$\$[^;]+;/g;
  while ((match = regexFunc.exec(content)) !== null) {
    let funcName = match[1];
    if (funcName !== 'requesting_user_id') {
      allFunctionsMap.set(funcName, match[0]);
    }
  }
}

for (let pol of policies) {
  let m = pol.match(/CREATE\s+POLICY\s+"([^"]+)"(?:\s+AS\s+\w+)?\s+ON\s+([\w\."]+)/i);
  if (m) {
    let key = m[1] + "||" + m[2];
    uniquePolsMap.set(key, pol);
  } else {
    fallbackPols.push(pol);
  }
}
let uniquePols = Array.from(uniquePolsMap.values()).concat(fallbackPols);

let out = `BEGIN;\n\n`;

out += `-- 1. Create requesting_user_id mapping\n`;
out += `CREATE OR REPLACE FUNCTION requesting_user_id()\n`;
out += `RETURNS TEXT AS $$\n`;
out += `  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::TEXT;\n`;
out += `$$ LANGUAGE SQL STABLE;\n\n`;

out += `-- 1.2 Create current_user_email mapping\n`;
out += `CREATE OR REPLACE FUNCTION current_user_email()\n`;
out += `RETURNS TEXT AS $$\n`;
out += `  SELECT LOWER(COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'email', ''));\n`;
out += `$$ LANGUAGE SQL STABLE;\n\n`;

out += `-- 1.3 Create has_valid_org_invite\n`;
out += `CREATE OR REPLACE FUNCTION has_valid_org_invite(p_organization_id UUID, p_role TEXT)\n`;
out += `RETURNS BOOLEAN AS $$\n`;
out += `  SELECT EXISTS (\n`;
out += `    SELECT 1 FROM organization_invites oi\n`;
out += `    WHERE oi.organization_id = p_organization_id\n`;
out += `      AND LOWER(oi.email) = current_user_email()\n`;
out += `      AND oi.role = p_role\n`;
out += `      AND oi.status = 'pending'\n`;
out += `      AND oi.expires_at > now()\n`;
out += `  );\n`;
out += `$$ LANGUAGE SQL STABLE;\n\n`;

let tableArrayRegexStr = Array.from(tables).map(t => `'${t}'`).join(', ');

out += `-- 1.5 Drop all existing RLS policies on ALL extracted tables\n`;
out += `DO $$ \n`;
out += `DECLARE \n`;
out += `  r RECORD;\n`;
out += `BEGIN\n`;
out += `  FOR r IN (\n`;
out += `    SELECT p.polname, c.relname AS tablename \n`;
out += `    FROM pg_policy p\n`;
out += `    JOIN pg_class c ON p.polrelid = c.oid\n`;
out += `    WHERE c.relname IN (${tableArrayRegexStr})\n`;
out += `  ) LOOP\n`;
out += `    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.polname) || ' ON ' || quote_ident(r.tablename);\n`;
out += `  END LOOP;\n`;
out += `END $$;\n\n`;

out += `-- 2. Drop ALL referring Foreign Keys\n`;
for (let ref of uniqueRefs) {
  if (ref.table !== 'profiles') {
    out += `ALTER TABLE IF EXISTS ${ref.table} DROP CONSTRAINT IF EXISTS ${ref.table}_${ref.column}_fkey;\n`;
  }
}
out += `ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;\n\n`;

out += `-- 3. Drop Views relying on these columns\n`;
out += `DROP VIEW IF EXISTS strain_ratings;\n\n`;

out += `-- 4. Alter columns to TEXT\n`;
out += `ALTER TABLE profiles ALTER COLUMN id TYPE TEXT;\n`;
for (let ref of uniqueRefs) {
  if (ref.table !== 'profiles') {
    out += `ALTER TABLE ${ref.table} ALTER COLUMN ${ref.column} TYPE TEXT;\n`;
  }
}
out += `\n`;

out += `-- 5. Re-add Foreign Key Constraints\n`;
for (let ref of uniqueRefs) {
  if (ref.table !== 'profiles') {
    let cascadeStr = ref.onDelete !== 'NO ACTION' ? ` ON DELETE ${ref.onDelete}` : '';
    out += `ALTER TABLE ${ref.table} ADD CONSTRAINT ${ref.table}_${ref.column}_fkey FOREIGN KEY (${ref.column}) REFERENCES profiles(id)${cascadeStr};\n`;
  }
}
out += `\n`;

out += `-- 6. Recreate View\n`;
out += `CREATE VIEW strain_ratings AS\n`;
out += `SELECT strain_id, COUNT(*) as rating_count, ROUND(AVG(overall_rating), 1) as avg_overall, ROUND(AVG(taste_rating), 1) as avg_taste, ROUND(AVG(effect_rating), 1) as avg_effect, ROUND(AVG(look_rating), 1) as avg_look\n`;
out += `FROM ratings GROUP BY strain_id;\n\n`;

out += `-- 6.5 Rebuild All Parsed Helper Functions mapped to TEXT AFTER columns are altered to avoid Type Errors during Compilation\n`;
out += Array.from(allFunctionsMap.values()).join('\n\n') + '\n\n';

let explicitDrops = [];
for (let pol of uniquePols) {
  let m = pol.match(/CREATE\s+POLICY\s+"([^"]+)"(?:\s+AS\s+\w+)?\s+ON\s+([\w\."]+)/i);
  if (m) {
    explicitDrops.push(`DROP POLICY IF EXISTS "${m[1]}" ON ${m[2]};`);
  }
}

out += `-- 7. Explicitly drop all recreated policies to avoid 'already exists' errors\n`;
out += explicitDrops.join('\n');
out += `\n\n`;

out += `-- 8. Recreate ALL RLS Policies mapped to requesting_user_id()\n\n`;
out += uniquePols.join('\n\n');
out += `\n\nCOMMIT;\n`;

fs.writeFileSync('./supabase/migrations/20260410_clerk_migration.sql', out);
console.log("Found " + uniqueRefs.length + " constraints across " + tables.size + " tables. Migration rewritten.");
