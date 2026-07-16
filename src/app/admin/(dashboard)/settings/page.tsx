import { createClient } from '@/lib/supabase/server';
import SettingsClient from '@/components/admin/SettingsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = await createClient();

  // Fetch the current school settings
  const { data: settings, error } = await supabase
    .from('school_settings')
    .select('*')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error("Error fetching school settings:", error);
  }

  return (
    <div className="py-2">
      <SettingsClient initialData={settings} />
    </div>
  );
}
