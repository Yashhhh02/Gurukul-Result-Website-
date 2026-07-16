import { createClient } from '@/lib/supabase/server';
import { Users, BookOpen, CheckCircle, Clock, FileType, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import DashboardCharts from '@/components/admin/DashboardCharts';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch Stats
  const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: subjectCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
  const { count: publishedCount } = await supabase.from('result_summary').select('*', { count: 'exact', head: true }).eq('is_published', true);
  
  // Fetch Recent Imports
  const { data: recentImports } = await supabase
    .from('csv_import_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch Summary Data for Charts
  const { data: results } = await supabase.from('result_summary').select('result_status, overall_grade');
  
  // Process Pie Chart Data
  let passCount = 0;
  let failCount = 0;
  
  // Process Bar Chart Data
  const gradeCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };

  if (results) {
    results.forEach(r => {
      if (r.result_status === 'pass') passCount++;
      else failCount++;

      if (r.overall_grade && gradeCounts[r.overall_grade] !== undefined) {
        gradeCounts[r.overall_grade]++;
      } else if (r.overall_grade) {
         gradeCounts['F']++; // Default fallback for weird grades
      }
    });
  }

  const pieData = [
    { name: 'Pass', value: passCount },
    { name: 'Fail/Other', value: failCount }
  ];

  const barData = Object.keys(gradeCounts).map(key => ({
    grade: key,
    students: gradeCounts[key]
  }));

  const stats = [
    { label: 'Total Students', value: studentCount || 0, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-900/30' },
    { label: 'Total Subjects', value: subjectCount || 0, icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-900/30' },
    { label: 'Results Published', value: publishedCount || 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Welcome back. Here is an overview of your portal.</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</h3>
                  <p className="text-4xl font-black mt-3 text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform">
                <Icon className="w-32 h-32" />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Dynamic Charts Section */}
      <DashboardCharts pieData={pieData} barData={barData} />
      
      {/* Lower Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Imports */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400 dark:text-slate-400" /> Recent Imports
            </h2>
            <Link href="/admin/import-history" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">View All</Link>
          </div>
          <div className="flex-1 overflow-auto">
            {recentImports && recentImports.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500 dark:text-slate-400">File</th>
                    <th className="px-6 py-3 font-medium text-gray-500 dark:text-slate-400">Rows</th>
                    <th className="px-6 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                    <th className="px-6 py-3 font-medium text-gray-500 dark:text-slate-400 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {recentImports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/70">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <FileType className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <span className="font-medium text-gray-900 dark:text-slate-100">{imp.file_name}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-400">{imp.success_rows} / {imp.total_rows}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          imp.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}>
                          {imp.status.charAt(0).toUpperCase() + imp.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 dark:text-slate-500 text-xs">
                        {formatDistanceToNow(new Date(imp.created_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-slate-500">
                <FileType className="w-8 h-8 mb-2 opacity-50" />
                <p>No imports yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-indigo-950 rounded-2xl border border-transparent dark:border-indigo-800 shadow-sm p-6 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <UploadCloud className="w-32 h-32 text-white dark:text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2 relative z-10 text-white dark:text-indigo-100">Ready for new results?</h2>
            <p className="text-indigo-100 dark:text-indigo-300 text-sm mb-6 relative z-10 leading-relaxed">
              Upload your latest CSV file containing student marks to instantly publish them to the portal.
            </p>
          </div>
          <Link 
            href="/admin/csv-upload" 
            className="w-full bg-white text-indigo-600 hover:bg-gray-50 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500 font-bold py-3 px-4 rounded-xl text-center transition-colors relative z-10 shadow-sm"
          >
            Import New CSV
          </Link>
        </div>
      </div>
    </div>
  );
}
