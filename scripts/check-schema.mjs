import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  console.log("Students columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data");
  if (error) console.error(error);
}
check();
