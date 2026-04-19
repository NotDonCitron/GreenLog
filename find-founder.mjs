import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import fs from 'fs';

const currentDir = process.cwd();
const envPath = join(currentDir, '.env.local');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, role, organizations(name, slug)')
        .eq('role', 'gründer')
        .limit(5);

    if (error) {
        console.error("Error fetching founders:", error);
        process.exit(1);
    }

    console.log("=== Found Founders ===");
    data.forEach(m => {
        console.log(`User ID: ${m.user_id}`);
        console.log(`Role: ${m.role}`);
        console.log(`Organization: ${m.organizations.name} (${m.organizations.slug})`);
        console.log("---");
    });
}

run();
