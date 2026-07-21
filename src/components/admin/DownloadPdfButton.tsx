'use client';

import { useState } from 'react';

interface Props {
  stream: string;
}

export default function DownloadPdfButton({ stream }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownload = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const secret = 'gurukul-pdf-2025';
      const url = `/api/admin/bulk-pdf?stream=${encodeURIComponent(stream)}&secret=${secret}`;
      
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
      a.download = `marksheets-${stream}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
      setStatus('idle');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unknown error');
      setStatus('error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        onClick={handleDownload}
        disabled={status === 'loading'}
        style={{
          padding: '9px 20px',
          background: status === 'loading' ? '#9ca3af' : '#15803d',
          color: '#fff',
          borderRadius: '6px',
          fontWeight: '700',
          fontSize: '14px',
          border: 'none',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'background 0.2s',
        }}
      >
        {status === 'loading' ? (
          <>
            <span style={{
              width: '14px', height: '14px', border: '2px solid #fff',
              borderTopColor: 'transparent', borderRadius: '50%',
              display: 'inline-block', animation: 'spin 0.8s linear infinite',
            }} />
            Generating PDF… (this may take 1–2 min)
          </>
        ) : (
          <>
            ⬇ Download All as PDF
          </>
        )}
      </button>
      {status === 'error' && (
        <p style={{ fontSize: '11px', color: '#dc2626', margin: 0 }}>
          Error: {errorMsg}
        </p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
