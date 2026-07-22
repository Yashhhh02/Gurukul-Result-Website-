import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, User, BookOpen } from 'lucide-react';
import Link from 'next/link';
import AntiInspect from '@/components/AntiInspect';
import { notFound } from 'next/navigation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function VerifyPage({ params }: { params: Promise<{ result_id: string }> }) {
  const supabase = supabaseAdmin;
  const { result_id } = await params;

  // 1. Fetch result summary
  const { data: summary, error: summaryError } = await supabase
    .from('result_summary')
    .select(`
      *,
      students (
        student_name,
        gr_number,
        roll_number,
        class,
        division,
        academic_session
      )
    `)
    .eq('result_id', result_id)
    .single();

  if (summaryError || !summary) {
    // If not found, show error state
    return <ErrorState message="Invalid or Fake Marksheet. No records found for this scan." />;
  }

  // If not published, also show error (or specific not-published message)
  if (!summary.is_published) {
    return <ErrorState message="This marksheet has not been officially published yet." />;
  }

  const student = summary.students as any;

  // Formatting variables
  const isPassed = summary.result_status === 'pass';
  const statusColor = isPassed ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';
  const statusIcon = isPassed ? <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /> : <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />;
  const statusText = isPassed ? 'PASSED & PROMOTED TO STD XII' : 'FAIL';

  return (
    <>
      <AntiInspect />
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800">
      
      {/* Header Banner */}
      <div className="bg-indigo-600 px-6 py-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShieldCheck className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <ShieldCheck className="w-12 h-12 text-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Verified Marksheet</h1>
          <p className="text-indigo-100 text-sm mt-1">Official Document Authentication</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6 text-center">
        
        {/* Status Section */}
        <div className="border-b border-gray-100 dark:border-slate-800 pb-6">
          {statusIcon}
          <div className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-bold tracking-wide ${statusColor}`}>
            {statusText}
          </div>
        </div>

        {/* Student Details */}
        <div className="text-left space-y-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Name</p>
              <p className="text-base font-bold text-gray-900 dark:text-white leading-tight mt-0.5">{student.student_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GR Number</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{student.gr_number}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seat Number</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{student.roll_number}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class / Div</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{student.class} {student.division && `/ ${student.division}`}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Academic Yr</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{student.academic_session}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Marks</p>
              <p className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mt-0.5">
                {summary.total_marks} / {summary.max_marks}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Percentage</p>
              <p className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mt-0.5">
                {summary.percentage.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-slate-950 p-4 border-t border-gray-100 dark:border-slate-800 text-center">
        <p className="text-xs text-gray-500">
          This result was officially issued and verified by <br/><strong className="text-gray-900 dark:text-gray-300">Gurukul Vidyapeeth English High School & Jr. College</strong>.
        </p>
      </div>

    </div>
    </>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-red-100 dark:border-red-900/30 text-center">
      <div className="bg-red-50 dark:bg-red-900/20 px-6 py-8">
        <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-400">Verification Failed</h1>
      </div>
      <div className="p-6">
        <p className="text-gray-700 dark:text-gray-300 text-base">{message}</p>
        <div className="mt-8">
          <Link href="/" className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors text-sm">
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
