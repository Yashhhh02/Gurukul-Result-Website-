'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, FileType, CheckCircle, AlertCircle, XCircle, Trash2, Loader2, Info, Printer, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ImportHistoryClient({ logs }: { logs: any[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; logId: string | null; isDeleting: boolean; error: string | null }>({
    isOpen: false,
    logId: null,
    isDeleting: false,
    error: null
  });

  const confirmDelete = async () => {
    if (!deleteModal.logId) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      const res = await fetch('/api/admin/import/delete-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteModal.logId })
      });
      if (res.ok) {
        setDeleteModal({ isOpen: false, logId: null, isDeleting: false, error: null });
        router.refresh();
      } else {
        const errorData = await res.json();
        setDeleteModal(prev => ({ ...prev, isDeleting: false, error: errorData.error }));
      }
    } catch (err: any) {
      setDeleteModal(prev => ({ ...prev, isDeleting: false, error: err.message }));
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || log.import_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Import History</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Review the status and logs of all CSV uploads.</p>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by file name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto overflow-hidden shrink-0">
           <button 
             onClick={() => setFilterType('all')}
             className={`flex-1 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             All
           </button>
           <button 
             onClick={() => setFilterType('students')}
             className={`flex-1 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === 'students' ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             Admissions
           </button>
           <button 
             onClick={() => setFilterType('results')}
             className={`flex-1 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === 'results' ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             Results
           </button>
           <button 
             onClick={() => setFilterType('college-excel-IT-GEO')}
             className={`flex-1 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === 'college-excel-IT-GEO' ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             IT-Geo
           </button>
           <button 
             onClick={() => setFilterType('college-excel-IT-NONGEO')}
             className={`flex-1 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === 'college-excel-IT-NONGEO' ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             IT-NonGeo
           </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 uppercase tracking-wider text-xs font-semibold border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">File Details</th>
                <th className="px-6 py-4">Import Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Rows Processed</th>
                <th className="px-6 py-4 text-right">Time</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${log.import_type === 'students' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                          <FileType className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{log.file_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                         log.import_type === 'students' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                       }`}>
                         {log.import_type === 'students' ? 'Admissions' : log.import_type.startsWith('college-excel') ? 'College Excel' : 'Results'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                         log.status === 'completed' 
                           ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                           : log.status === 'failed'
                           ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
                           : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                       }`}>
                         {log.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                         {log.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                         {(log.status === 'pending' || log.status === 'processing') && <AlertCircle className="w-3.5 h-3.5" />}
                         {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="text-emerald-600 dark:text-emerald-400" title="Successfully Imported">
                          {log.success_rows} <span className="text-xs opacity-80">success</span>
                        </span>
                        <span className="text-gray-300 dark:text-slate-600">|</span>
                        <span className="text-red-500 dark:text-red-400" title="Failed to Import">
                          {log.failed_rows} <span className="text-xs opacity-80">failed</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 dark:text-slate-400 text-xs">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          href={`/admin/import-history/${log.id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md transition-colors inline-flex"
                          title="View Imported Students"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {log.import_type !== 'students' && (
                          <Link
                            href={`/admin/print-batch/${log.id}`}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-md transition-colors inline-flex"
                            title="Print Bulk Marksheets"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                        )}
                        <button 
                          onClick={() => setDeleteModal({ isOpen: true, logId: log.id, isDeleting: false, error: null })}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Delete Upload and Associated Students"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500 dark:text-slate-400">
                    <FileType className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-lg">No imports found.</p>
                    <p className="text-sm mt-1">Upload a CSV file to see history here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Import?</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800 dark:text-red-400 font-medium flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>All students, results, and summaries associated with this specific excel file will be permanently erased from the database.</span>
              </p>
            </div>

            {deleteModal.error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800">
                Error: {deleteModal.error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                disabled={deleteModal.isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, logId: null, isDeleting: false, error: null })}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleteModal.isDeleting}
                onClick={confirmDelete}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-red-500/20"
              >
                {deleteModal.isDeleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Confirm Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
