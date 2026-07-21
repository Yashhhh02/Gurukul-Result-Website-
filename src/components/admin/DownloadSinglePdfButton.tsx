'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

interface Props {
  studentId: string;
  stream: string;
  studentName: string;
}

export default function DownloadSinglePdfButton({ studentId, stream, studentName }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownload = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const secret = 'gurukul-pdf-2025';
      const url = `/api/admin/student-pdf?id=${studentId}&stream=${encodeURIComponent(stream)}&secret=${secret}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.details || json.error || `HTTP ${res.status}`);
      }

      // Trigger file download
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `marksheet-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating PDF');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="no-print" style={{ position: 'absolute', top: '-40px', right: '0', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {errorMsg && <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 'bold' }}>{errorMsg}</span>}
        <button
          onClick={handleDownload}
          disabled={loading}
          style={{
            padding: '6px 12px',
            background: loading ? '#9ca3af' : '#2563eb',
            color: '#fff',
            borderRadius: '4px',
            fontWeight: '600',
            fontSize: '12px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: '12px', height: '12px', border: '2px solid #fff',
                borderTopColor: 'transparent', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.8s linear infinite',
              }} />
              Generating...
            </>
          ) : (
            <>
              <Download size={14} />
              Download PDF
            </>
          )}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
