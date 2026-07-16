import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Marksheet | Gurukul Vidyapeeth',
  description: 'Official marksheet verification portal for Gurukul Vidyapeeth',
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col font-sans">
      <main className="flex-grow flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} Gurukul Vidyapeeth. All Rights Reserved.
      </footer>
    </div>
  );
}
