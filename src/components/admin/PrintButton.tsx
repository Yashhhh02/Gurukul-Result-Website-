'use client';

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="px-6 py-2 bg-red-800 text-white rounded hover:bg-red-900 font-bold"
    >
      Print All
    </button>
  );
}
