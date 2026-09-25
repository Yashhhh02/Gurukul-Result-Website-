'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { 
  Loader2, ShieldCheck, FileText, Lock, Eye, 
  User, Calendar, Shield, GraduationCap, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const loginSchema = z.object({
  giNo: z.string().min(1, 'GR No is required'),
  rollNo: z.string().min(1, 'Roll No is required'),
  fullName: z.string().min(1, 'Full Name is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function StudentLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to login');
      }

      toast.success('Login successful!');
      router.push('/result');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 md:p-8">
      {/* Main Container */}
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* Left Panel */}
        <div className="w-full md:w-[45%] bg-[#002a5c] relative flex flex-col pt-8 pb-6 px-6 md:px-10 z-10 overflow-hidden min-h-[500px]">
          
          {/* Decorative dots/circles top-left */}
          <div className="absolute top-4 left-4 grid grid-cols-4 gap-2 opacity-20">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 bg-white rounded-full"></div>
            ))}
          </div>

          <div className="flex flex-col items-center text-center z-10 mt-2">
            <div className="w-20 h-20 mb-3 relative flex items-center justify-center">
              <Shield className="w-20 h-20 text-yellow-500 absolute" />
              <div className="bg-white p-2 rounded-md z-10 relative mt-1.5 shadow-sm">
                <GraduationCap className="w-6 h-6 text-[#002a5c]" />
              </div>
            </div>
            <p className="text-yellow-500 text-[10px] font-bold tracking-[0.2em] mb-1">— ESTD 2001 —</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 font-serif tracking-wide">GURUKUL</h1>
            <h2 className="text-lg md:text-xl font-bold text-yellow-500 mb-3 tracking-widest uppercase">Vidyapeeth</h2>
            <p className="text-blue-100 text-xs font-medium">Excellence in Education, Integrity in Results</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-3 gap-3 mt-6 z-10">
            <div className="flex flex-col items-center justify-center p-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm transition-colors hover:bg-white/10">
              <ShieldCheck className="w-5 h-5 text-white mb-1.5" />
              <span className="text-[10px] text-center text-white font-medium leading-tight">Secure &<br/>Trusted</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm transition-colors hover:bg-white/10">
              <FileText className="w-5 h-5 text-white mb-1.5" />
              <span className="text-[10px] text-center text-white font-medium leading-tight">Official<br/>Results</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm transition-colors hover:bg-white/10">
              <Lock className="w-5 h-5 text-white mb-1.5" />
              <span className="text-[10px] text-center text-white font-medium leading-tight">Protected<br/>Data</span>
            </div>
          </div>

          {/* School Building Image with Curve */}
          <div className="absolute bottom-0 left-0 w-full h-[60%] md:h-[65%] z-0">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#002a5c] via-[#002a5c]/90 to-transparent z-10" />
            <img src="/school-building.png" alt="Campus" className="w-full h-full object-cover object-top opacity-90" />
            
            {/* The golden curved separator at the very bottom of the building */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-[1px]">
              <svg className="block w-[calc(100%+2px)] h-[50px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,0 C300,120 900,120 1200,0 L1200,120 L0,120 Z" className="fill-[#001f44]"></path>
                <path d="M0,15 C300,135 900,135 1200,15 L1200,120 L0,120 Z" className="fill-yellow-500"></path>
              </svg>
            </div>
          </div>

          {/* Secure Footer on Left */}
          <div className="absolute bottom-6 left-8 flex items-center gap-3 z-20">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold tracking-wide">100% Secure</p>
              <p className="text-blue-200 text-[10px]">Your data is encrypted<br/>and protected</p>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-[55%] bg-white p-6 md:p-10 lg:p-12 flex flex-col justify-center relative">
          
          {/* Decorative dots top-right */}
          <div className="absolute top-6 right-6 grid grid-cols-4 gap-2 opacity-10 hidden md:grid">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            ))}
          </div>

          <div className="flex flex-col items-center text-center mb-5 mt-2 md:mt-0">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center shadow-sm mb-3 border border-blue-100">
              <GraduationCap className="w-7 h-7 text-[#0047FF]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1.5">Result Portal</h2>
            <p className="text-gray-500 text-xs md:text-sm font-medium">Enter your details to view your result</p>
          </div>

          {/* Announcement Box on Right Panel */}
          <div className="mb-5 w-full max-w-md mx-auto bg-amber-50 border border-amber-200 rounded-xl p-3 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <h3 className="text-amber-800 text-xs font-bold flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Important Announcement
            </h3>
            <p className="text-amber-700 text-[11px] leading-relaxed font-medium">
              Final term results for Academic Session 2023-24 have been officially declared. Please enter your GR No., Roll No., and Name as printed on your ID card.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto w-full">
            
            {/* Custom Input 1 - GR No */}
            <div className={`relative flex items-center border rounded-xl overflow-hidden transition-all ${errors.giNo ? 'border-red-400' : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'}`}>
              <div className="w-12 h-full flex flex-col items-center justify-center border-r border-gray-100 bg-gray-50 text-blue-500 py-2 self-stretch">
                <FileText size={18} />
              </div>
              <div className="flex-1 px-4 py-1.5 bg-white">
                <label className="text-[10px] font-bold text-gray-700 tracking-wide">GR No.</label>
                <input
                  type="text"
                  placeholder="Enter GR Number"
                  className="w-full border-none focus:ring-0 p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-transparent mt-0.5 outline-none"
                  {...register('giNo')}
                />
              </div>
            </div>
            {errors.giNo && <p className="text-xs text-red-500 mt-1 ml-1">{errors.giNo.message}</p>}

            {/* Custom Input 2 - Roll No */}
            <div className={`relative flex items-center border rounded-xl overflow-hidden transition-all ${errors.rollNo ? 'border-red-400' : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'}`}>
              <div className="w-12 h-full flex flex-col items-center justify-center border-r border-gray-100 bg-gray-50 text-blue-500 py-2 self-stretch">
                <Shield size={18} />
              </div>
              <div className="flex-1 px-4 py-1.5 bg-white">
                <label className="text-[10px] font-bold text-gray-700 tracking-wide">Roll Number</label>
                <input
                  type="text"
                  placeholder="Enter Roll Number"
                  className="w-full border-none focus:ring-0 p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-transparent mt-0.5 outline-none"
                  {...register('rollNo')}
                />
              </div>
            </div>
            {errors.rollNo && <p className="text-xs text-red-500 mt-1 ml-1">{errors.rollNo.message}</p>}

            {/* Custom Input 3 - Full Name */}
            <div className={`relative flex items-center border rounded-xl overflow-hidden transition-all ${errors.fullName ? 'border-red-400' : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'}`}>
              <div className="w-12 h-full flex flex-col items-center justify-center border-r border-gray-100 bg-gray-50 text-blue-500 py-2 self-stretch">
                <User size={18} />
              </div>
              <div className="flex-1 px-4 py-1.5 bg-white">
                <label className="text-[10px] font-bold text-gray-700 tracking-wide">Full Name (As per ID Card)</label>
                <input
                  type="text"
                  placeholder="Enter Full Name"
                  className="w-full border-none focus:ring-0 p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-transparent mt-0.5 outline-none"
                  {...register('fullName')}
                />
              </div>
            </div>
            {errors.fullName && <p className="text-xs text-red-500 mt-1 ml-1">{errors.fullName.message}</p>}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-[#0047FF] hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] mt-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              View Result
            </Button>

            {/* Notice Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2.5 mt-3">
              <ShieldCheck className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-700">Please ensure you enter correct details.</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Your result will be shown on the next page.</p>
              </div>
            </div>
          </form>

          {/* Trust Badges Bottom */}
          <div className="mt-auto pt-8 flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-6 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                <Lock className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-gray-800">SSL Encrypted</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Secure Connection</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-gray-800">Privacy Focused</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Your Data is Safe</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-gray-800">Trusted by</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Thousands of Students</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Absolute footer outside card */}
      <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none text-gray-400">
        <p className="text-[11px] font-medium">© 2025 Gurukul Vidyapeeth. All Rights Reserved.</p>
      </div>
    </div>
  );
}
