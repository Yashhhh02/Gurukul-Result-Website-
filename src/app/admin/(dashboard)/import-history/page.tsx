import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import ImportHistoryClient from '@/components/admin/ImportHistoryClient';

export const dynamic = 'force-dynamic';

export default async function ImportHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the import logs
  const { data: logs, error } = await adminSupabase
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
