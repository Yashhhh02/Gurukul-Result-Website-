import { createClient } from '@supabase/supabase-js';
import 'dotenv/config.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'csv_import_logs' }).catch(() => ({}));
  if (error || !data) {
     const res = await supabase.from('csv_import_logs').insert({ imported_by: '2076c113-576e-4e13-8a3e-eff232ddde7c', file_name: 'test', import_type: 'college-excel-CS' });
     console.log("Insert result:", res.error);
  } else {
     console.log(data);
  }
}
check();
