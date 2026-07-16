import { createClient } from '@/lib/supabase/server';
import ImportHistoryClient from '@/components/admin/ImportHistoryClient';

export default async function ImportHistoryPage() {
  const supabase = await createClient();

  // Fetch the import logs
  const { data: logs, error } = await supabase
    .from('csv_import_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100); // Fetch latest 100 logs

  if (error) {
    console.error("Error fetching import logs:", error);
  }

  return (
    <div className="py-2">
      <ImportHistoryClient logs={logs || []} />
    </div>
  );
}
