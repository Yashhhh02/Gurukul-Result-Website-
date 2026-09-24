'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Save, Building2, MapPin, Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type SettingsForm = {
  school_name: string;
  school_code: string;
  index_number: string;
  affiliation_number: string;
  college_type: string;
  board_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  contact_phone: string;
  contact_email: string;
  website: string;
  result_issue_place: string;
  result_issue_date: string;
  current_session: string;
};

export default function SettingsClient({ initialData }: { initialData: any }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SettingsForm>({
    defaultValues: initialData || {
      school_name: 'Gurukul Vidyapeeth',
      board_name: 'CBSE',
    }
  });

  // Always fetch fresh data from API on mount (bypasses Next.js cache)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            reset(json.data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch settings', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to save settings');
      toast.success('School settings updated successfully!');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">School Settings</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Configure global details that appear on the marksheets.</p>
        </div>
        <button 
          onClick={handleSubmit(onSubmit)}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-70 w-full md:w-auto"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Basic Info Section */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">School Name *</label>
              <input 
                type="text" 
                {...register('school_name', { required: 'School Name is required' })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
              {errors.school_name && <p className="text-xs text-red-500 mt-1">{errors.school_name.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Board Name</label>
              <input 
                type="text" 
                {...register('board_name')}
                placeholder="e.g. CBSE, ICSE, State Board"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Affiliation Number</label>
              <input 
                type="text" 
                {...register('affiliation_number')}
                placeholder="e.g. 28993-97/Dt.15/11/2016"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Index No</label>
              <input 
                type="text" 
                {...register('index_number')}
                placeholder="e.g. J-16.14.086"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                College Type <span className="text-gray-400 font-normal">(Appears before affiliation on marksheet)</span>
              </label>
              <input 
                type="text" 
                {...register('college_type')}
                placeholder="e.g. Higher Secondary / Self Finance / 16-17 / 2016"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Marksheet shows: <em>[College Type] / [Affiliation Number]</em></p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Current Academic Session</label>
              <input 
                type="text" 
                {...register('current_session')}
                placeholder="e.g. 2024-2025"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Location Details</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Address Line 1</label>
              <input 
                type="text" 
                {...register('address_line1')}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">City</label>
                <input 
                  type="text" 
                  {...register('city')}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">State</label>
                <input 
                  type="text" 
                  {...register('state')}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">PIN Code</label>
                <input 
                  type="text" 
                  {...register('pincode')}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-12">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Contact & Web</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Official Email</label>
              <input 
                type="email" 
                {...register('contact_email')}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Phone Number</label>
              <input 
                type="text" 
                {...register('contact_phone')}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">School Website</label>
              <input 
                type="url" 
                {...register('website')}
                placeholder="https://..."
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Result Issue Settings */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-12">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Result Issue Settings (Bottom Left on Marksheet)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Result Issue Place</label>
              <input 
                type="text" 
                {...register('result_issue_place')}
                placeholder="e.g. Thane"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Appears as "Place : [Value]" on the marksheet.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Result Issue Date</label>
              <input 
                type="date" 
                {...register('result_issue_date')}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Appears as "Date : [Value]" on the marksheet. Will override CSV date if set.</p>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
