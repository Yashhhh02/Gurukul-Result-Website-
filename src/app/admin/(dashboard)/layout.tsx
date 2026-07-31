import { ReactNode } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import { ThemeToggle } from '@/components/admin/ThemeToggle';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen print:h-auto bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-50 overflow-hidden print:overflow-visible font-sans transition-colors duration-300">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 transition-colors duration-300 print:hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Portal Management</h2>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 font-bold flex items-center justify-center border border-indigo-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
              A
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto print:overflow-visible p-6 print:p-0 bg-gray-50/50 dark:bg-slate-950 transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
