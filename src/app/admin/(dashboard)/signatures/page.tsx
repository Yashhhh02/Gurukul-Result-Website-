import { createClient } from '@/lib/supabase/server';
import SignaturesClient from '@/components/admin/SignaturesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SignaturesPage() {
  const supabase = await createClient();

  // Fetch the current active signatures
  const { data: signatures, error } = await supabase
    .from('school_signatures')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error("Error fetching signatures:", error);
  }

  return (
    <div className="py-2">
      <SignaturesClient initialSignatures={signatures || []} />
    </div>
  );
}
