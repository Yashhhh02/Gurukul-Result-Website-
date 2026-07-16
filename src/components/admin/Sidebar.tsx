'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, Upload, History, 
  Settings, FileSignature, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const isActive = (path: string) => pathname === path;

  const NavItem = ({ href, icon: Icon, label, isAction = false }: { href?: string, icon: any, label: string, isAction?: boolean }) => {
    const active = href ? isActive(href) : false;
    
    const content = (
      <>
        <Icon size={20} className="shrink-0" />
        <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}`}>
          {label}
        </span>
      </>
    );

    const baseClass = `flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 mx-3 my-1 overflow-hidden`;
    
    if (isAction) {
      return (
        <button className={`${baseClass} w-[calc(100%-24px)] text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20`}>
          {content}
        </button>
      );
    }

    if (active) {
      return (
        <Link href={href!} className={`${baseClass} bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-medium`}>
          {content}
        </Link>
      );
    }

    return (
      <Link href={href!} className={`${baseClass} text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white`}>
        {content}
      </Link>
    );
  };

  return (
    <aside 
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
      className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col hidden md:flex transition-all duration-300 ease-in-out relative z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      
      {/* Header / Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-200 dark:border-slate-800 shrink-0 overflow-hidden transition-colors duration-300">
        <span className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <span className="w-8 h-8 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-sm">GV</span>
          <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 ml-3'}`}>
            Admin Portal
          </span>
        </span>
      </div>
      
      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-1 overflow-x-hidden">
        <NavItem href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
        
        <div className={`pt-4 pb-2 transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100 px-6'}`}>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Academics</p>
        </div>
        
        <NavItem href="/admin/students" icon={Users} label="Students" />
        <NavItem href="/admin/csv-upload" icon={Upload} label="Import CSV" />
        <NavItem href="/admin/import-history" icon={History} label="Import History" />
        
        <div className={`pt-4 pb-2 transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100 px-6'}`}>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Configuration</p>
        </div>
        
        <NavItem href="/admin/settings" icon={Settings} label="School Settings" />
        <NavItem href="/admin/signatures" icon={FileSignature} label="Signatures" />
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <NavItem icon={LogOut} label="Sign Out" isAction={true} />
      </div>
    </aside>
  );
}
