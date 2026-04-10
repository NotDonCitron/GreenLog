import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
    const { data, error } = await supabase.from('profiles').select('id, display_name, username, created_at').order('created_at', { ascending: true });
    if (error) {
        console.error("Error fetching profiles:", error);
        process.exit(1);
    }

    console.log("=== Found Profiles ===");
    data.forEach(p => {
        console.log(`ID: ${p.id}`);
        console.log(`Name: ${p.display_name} (Username: ${p.username}) created at: ${p.created_at}`);
        console.log("---");
    });
}

run();
