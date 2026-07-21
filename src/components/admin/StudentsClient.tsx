'use client';

import { useState } from 'react';
import { Search, Filter, Plus, UploadCloud, MoreVertical, Edit2, Trash2, Eye, FileDown } from 'lucide-react';
import Link from 'next/link';

export default function StudentsClient({ initialStudents }: { initialStudents: any[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (student: any) => {
    setDownloadingId(student.id);
    try {
      const secret = 'gurukul-pdf-2025';
      const stream = student.subject_group || '';
      const res = await fetch(`/api/admin/student-pdf?id=${student.id}&stream=${encodeURIComponent(stream)}&secret=${secret}`);
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marksheet-${student.roll_number || student.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('PDF generation failed. Try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Extract unique classes for filter dropdown
  const uniqueClasses = ['All', ...Array.from(new Set(initialStudents.map(s => s.class)))].sort();

  // Filter Logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.admission_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'All' || student.class === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Students</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage all student records in the school.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add Student
          </button>
          <Link 
            href="/admin/csv-upload"
            className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-white border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <UploadCloud className="w-5 h-5" /> Bulk Import
          </Link>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
          />
        </div>
        <div className="relative w-full md:w-48 shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select 
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white appearance-none"
          >
            {uniqueClasses.map(cls => (
              <option key={cls} value={cls}>{cls === 'All' ? 'All Classes' : `Class ${cls}`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Admission No.</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">DOB</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{student.student_name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{student.gender}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-slate-300">
                      {student.admission_number}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400">
                        {student.class} {student.division && `- ${student.division}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-slate-400">
                      {new Date(student.dob).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                      }`}>
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownloadPdf(student)}
                          disabled={downloadingId === student.id}
                          className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === student.id
                            ? <span style={{ fontSize: '10px', fontWeight: 700 }}>...</span>
                            : <FileDown className="w-4 h-4" />}
                        </button>
                        <button className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit Student">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal (Placeholder for now) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Student</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                &times;
              </button>
            </div>
            <div className="p-6 text-center text-gray-500 dark:text-slate-400">
              <p className="mb-4">Manual student entry form will go here.</p>
              <p className="text-sm">Includes fields for Name, DOB, Admission No, Class, etc.</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
                Save Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
