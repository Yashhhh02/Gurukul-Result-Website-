'use client';

import { Printer, Download } from 'lucide-react';

export default function PrintActionBar() {
  return (
    <div className="w-full max-w-4xl flex justify-end gap-3 mb-4 no-print">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2 bg-[#8B0000] border border-[#8B0000] rounded-lg shadow-sm text-sm font-medium text-white hover:bg-[#700000] transition-colors"
      >
        <Download className="w-4 h-4" />
        Download PDF
      </button>
    </div>
  );
}
