'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Signature = {
  signature_type: string;
  label: string;
  image_url: string;
};

const REQUIRED_SIGNATURES = [
  { type: 'principal', label: 'Principal Signature' },
  { type: 'exam_incharge', label: 'Exam Incharge Signature' },
  { type: 'class_teacher', label: 'Coordinator Signature' },
  { type: 'school_seal', label: 'College Stamp' },
];

export default function SignaturesClient({ initialSignatures }: { initialSignatures: Signature[] }) {
  const router = useRouter();

  // Convert array to a map for easy lookup
  const initialMap = initialSignatures.reduce((acc, sig) => {
    acc[sig.signature_type] = sig.image_url;
    return acc;
  }, {} as Record<string, string>);

  const [previews, setPreviews] = useState<Record<string, string>>(initialMap);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Always fetch fresh signatures from API on mount (bypasses Next.js cache)
  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        const res = await fetch('/api/admin/signatures', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            const map: Record<string, string> = {};
            json.data.forEach((sig: Signature) => {
              map[sig.signature_type] = sig.image_url;
            });
            setPreviews(map);
          }
        }
      } catch (e) {
        console.error('Failed to fetch signatures', e);
      }
    };
    fetchSignatures();
  }, []);

  const handleFileChange = async (type: string, label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      
      // Update local preview immediately for snappiness
      setPreviews(prev => ({ ...prev, [type]: base64 }));
      
      // Save to database
      setLoading(prev => ({ ...prev, [type]: true }));
      try {
        const res = await fetch('/api/admin/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signature_type: type,
            label,
            image_url: base64
          })
        });

        if (!res.ok) throw new Error('Failed to save signature');
        toast.success(`${label} saved successfully!`);
        router.refresh();
      } catch (error: any) {
        toast.error(error.message);
        // Revert preview on failure
        setPreviews(prev => ({ ...prev, [type]: initialMap[type] || '' }));
      } finally {
        setLoading(prev => ({ ...prev, [type]: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  const removeSignature = async (type: string) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`/api/admin/signatures?type=${type}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove signature');

      setPreviews(prev => {
        const updated = { ...prev };
        delete updated[type];
        return updated;
      });
      
      toast.success('Signature removed successfully!');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Signatures & Seals</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Upload transparent PNGs of signatures and the school seal to be printed on marksheets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {REQUIRED_SIGNATURES.map((item) => {
          const hasImage = !!previews[item.type];
          const isLoading = !!loading[item.type];

          return (
            <div key={item.type} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-64">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{item.label}</h3>
                <div className="flex items-center gap-2">
                  {hasImage && !isLoading && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {isLoading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                  {hasImage && !isLoading && (
                    <button
                      onClick={() => removeSignature(item.type)}
                      className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-lg transition-colors"
                      title="Remove Signature"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl relative flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950/50 transition-colors overflow-hidden group">
                
                {hasImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews[item.type]} alt={item.label} className="max-w-[80%] max-h-[80%] object-contain" />
                    {/* Overlay to upload new */}
                    <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload className="w-6 h-6 mb-2" />
                      <span className="text-xs font-medium">Replace Image</span>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        className="hidden" 
                        onChange={(e) => handleFileChange(item.type, item.label, e)}
                      />
                    </label>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Click to upload</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 mt-1">PNG or JPG (Max 2MB)</span>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(item.type, item.label, e)}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex gap-3">
        <div className="text-amber-600 dark:text-amber-500 shrink-0">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-500">Pro Tip</h4>
          <p className="text-xs text-amber-700 dark:text-amber-600/80 mt-0.5 leading-relaxed">
            For best results on printed marksheets, please upload signatures as <strong>transparent PNGs</strong>. 
            Ensure they are cropped tightly to the signature itself to prevent spacing issues on the final document.
          </p>
        </div>
      </div>

    </div>
  );
}
