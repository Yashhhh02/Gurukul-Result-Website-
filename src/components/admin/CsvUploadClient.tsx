'use client';

import { useState } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function CsvUploadClient() {
  const [activeTab, setActiveTab] = useState<'admissions' | 'results'>('admissions');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

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
      </div>

      {/* Upload Zone */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
        
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {activeTab === 'admissions' ? 'Upload Student Admissions' : 'Upload Student Marks'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {activeTab === 'admissions' 
              ? 'Use this engine to register new students. The CSV/Excel must contain: Admission_No, Name, DOB, Class, Division, Session.' 
              : 'Maharashtra HSC format — CSV/Excel must contain: Admission_No, Unique_ID, Roll_No, GR_No, Name, DOB, Class, Division, Subject_Group, Session, and subject marks.'}
          </p>
        </div>

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
                  onClick={processFile}
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

    </div>
  );
}
