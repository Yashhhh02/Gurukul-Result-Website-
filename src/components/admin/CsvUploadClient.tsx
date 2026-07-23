'use client';

import { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2, Trash2, Info, Printer } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Link from 'next/link';

export default function CsvUploadClient() {
  const [activeTab, setActiveTab] = useState<'admissions' | 'results' | 'college-results'>('admissions');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [streamType, setStreamType] = useState('CS'); // CS, IT-GEO, IT-NONGEO
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; logId: string | null; isDeleting: boolean; error: string | null }>({
    isOpen: false,
    logId: null,
    isDeleting: false,
    error: null
  });

  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/import/logs');
      if (res.ok) {
        const data = await res.json();
        setImportLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
        fetchLogs();
      } else {
        const errorData = await res.json();
        setDeleteModal(prev => ({ ...prev, isDeleting: false, error: errorData.error }));
      }
    } catch (err: any) {
      setDeleteModal(prev => ({ ...prev, isDeleting: false, error: err.message }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type === 'text/csv' || 
        droppedFile.name.endsWith('.csv') ||
        droppedFile.name.endsWith('.xlsx') ||
        droppedFile.name.endsWith('.xls')
      ) {
        setFile(droppedFile);
        setUploadStatus('idle');
      } else {
        setUploadStatus('error');
        setStatusMessage('Please upload a valid CSV or Excel file.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
    }
  };

  const uploadParsedData = async (parsedData: any[]) => {
    try {
      setStatusMessage(`Uploading ${parsedData.length} records...`);
      
      const endpoint = activeTab === 'admissions' 
        ? '/api/admin/import/admissions' 
        : '/api/admin/csv/import';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file!.name,
          data: parsedData
        })
      });

      const resData = await res.json();

      if (res.ok) {
        setUploadStatus('success');
        const successCount = resData.successCount ?? resData.success_count ?? parsedData.length;
        const errorCount   = resData.errorCount   ?? resData.error_count   ?? resData.failed_rows ?? 0;
        setStatusMessage(`Successfully imported ${successCount} students with results.${ errorCount > 0 ? ` Failed: ${errorCount}.` : ''}`);
        fetchLogs();
      } else {
        throw new Error(resData.error || 'Import failed');
      }
    } catch (err: any) {
      setUploadStatus('error');
      setStatusMessage(err.message || 'An unexpected error occurred during import.');
    } finally {
      setIsUploading(false);
    }
  };

  const processFile = () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus('idle');
    setStatusMessage('Parsing file...');

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Convert sheet to JSON, use empty string for missing cells
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          await uploadParsedData(jsonData);
        } catch (error: any) {
          setUploadStatus('error');
          setStatusMessage(`Error parsing Excel: ${error.message}`);
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadStatus('error');
        setStatusMessage('Failed to read the Excel file.');
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // It's a CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await uploadParsedData(results.data);
        },
        error: (error) => {
          setUploadStatus('error');
          setStatusMessage(`Error parsing CSV: ${error.message}`);
          setIsUploading(false);
        }
      });
    }
  };

  const processRawExcel = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus('idle');
    setStatusMessage(`Uploading raw Excel for ${streamType} stream...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('streamType', streamType);

      const res = await fetch('/api/admin/import/college-excel', {
        method: 'POST',
        body: formData
      });

      const resData = await res.json();

      if (res.ok) {
        setUploadStatus('success');
        setStatusMessage(`Successfully imported ${resData.successCount} students for stream ${streamType}.`);
        fetchLogs();
      } else {
        throw new Error(resData.error || 'Import failed');
      }
    } catch (err: any) {
      setUploadStatus('error');
      setStatusMessage(err.message || 'An unexpected error occurred during raw excel import.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Data Import Hub</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Upload CSV or Excel files to securely insert bulk data into the system.</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-800 w-full md:w-max">
        <button
          onClick={() => { setActiveTab('admissions'); setFile(null); setUploadStatus('idle'); }}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'admissions' 
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          Admissions Import
        </button>
        <button
          onClick={() => { setActiveTab('results'); setFile(null); setUploadStatus('idle'); }}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'results' 
              ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' 
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          Exam Results Import
        </button>
        <button
          onClick={() => { setActiveTab('college-results'); setFile(null); setUploadStatus('idle'); }}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'college-results' 
              ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          College Marksheets (CS/IT)
        </button>
      </div>

      {/* Upload Zone */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
        
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {activeTab === 'admissions' && 'Upload Student Admissions'}
            {activeTab === 'results' && 'Upload Student Marks'}
            {activeTab === 'college-results' && 'Upload College Marksheets (CS/IT Excel)'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {activeTab === 'admissions' && 'Use this engine to register new students. The CSV/Excel must contain: Admission_No, Name, DOB, Class, Division, Session.'}
            {activeTab === 'results' && 'Maharashtra HSC format — CSV/Excel must contain: Admission_No, Unique_ID, Roll_No, GR_No, Name, DOB, Class, Division, Subject_Group, Session, and subject marks.'}
            {activeTab === 'college-results' && 'Upload raw complex Excel sheets for CS and IT. The system will automatically parse multiple headers.'}
          </p>
        </div>

        {activeTab === 'college-results' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Select Stream Type
            </label>
            <select
              value={streamType}
              onChange={(e) => setStreamType(e.target.value)}
              className="block w-full max-w-sm rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="CS">Computer Science (CS)</option>
              <option value="IT-GEO">IT (With Geography)</option>
              <option value="IT-NONGEO">IT (Without Geography)</option>
              <option value="PCM">PCM (Physics, Chem, Maths)</option>
              <option value="PCMB">PCMB (Physics, Chem, Maths, Bio)</option>
            </select>
          </div>
        )}

        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            file 
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' 
              : 'border-gray-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50 dark:bg-slate-900/50'
          }`}
        >
          {file ? (
            <div className="flex flex-col items-center">
              <FileType className="w-12 h-12 text-indigo-500 mb-4" />
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{file.name}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
              
              <div className="mt-6 flex gap-4">
                <button 
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  Change File
                </button>
                <button 
                  onClick={activeTab === 'college-results' ? processRawExcel : processFile}
                  disabled={isUploading}
                  className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><UploadCloud className="w-4 h-4" /> Upload & Process</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8 text-gray-400 dark:text-slate-500" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">Drag and drop your file here</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">or click the button below to browse (.csv, .xlsx, .xls)</p>
              
              <label className="cursor-pointer px-6 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                <span>Browse Files</span>
                <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {uploadStatus !== 'idle' && (
          <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border ${
            uploadStatus === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-400'
          }`}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-semibold">{uploadStatus === 'success' ? 'Import Successful' : 'Import Failed'}</h4>
              <p className="text-sm mt-1 opacity-90">{statusMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Import History */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import History</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Review your recent data uploads and easily roll back specific files.</p>
        </div>
        
        {isLoadingLogs ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : importLogs.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No import history found.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">File Name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold text-center">Students</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {importLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {log.file_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {log.import_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {log.success_rows}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-2">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
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
