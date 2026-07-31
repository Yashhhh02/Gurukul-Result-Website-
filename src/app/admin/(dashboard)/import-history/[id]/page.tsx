import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import StudentsClient from '@/components/admin/StudentsClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ImportHistoryStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { id } = await params;

  // Fetch log info
  const { data: log } = await adminSupabase
    .from('csv_import_logs')
    .select('file_name, created_at')
    .eq('id', id)
    .single();

  // Fetch all students for this import_log_id
  const { data: students, error } = await adminSupabase
    .from('students')
    .select('*')
    .eq('import_log_id', id)
    .order('student_name', { ascending: true });

  if (error) {
    console.error("Error fetching students for import log:", error);
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/import-history" 
          className="p-2 bg-white dark:bg-slate-800 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Results for: {log?.file_name || 'Import'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Imported on {log?.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown Date'}
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <StudentsClient initialStudents={students || []} />
      </div>
    </div>
  );
}
