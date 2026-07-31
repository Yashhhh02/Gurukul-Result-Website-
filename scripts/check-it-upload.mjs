import { createClient } from '@supabase/supabase-js';
import 'dotenv/config.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking recent import logs...");
  const { data: logs, error: logsError } = await supabase
    .from('csv_import_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (logsError) console.error(logsError);
  else console.log("Recent logs:", logs);

  console.log("\nChecking recent students (IT)...");
  const { data: students, error: studError } = await supabase
    .from('students')
    .select('id, student_name, admission_number, subject_group, created_at, updated_at')
    .ilike('subject_group', '%IT%')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (studError) console.error(studError);
  else console.log("Recent IT students:", students);
}

check();
