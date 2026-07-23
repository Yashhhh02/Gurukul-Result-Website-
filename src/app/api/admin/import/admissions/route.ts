import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Use service role key to bypass RLS for administrative bulk imports
const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, data } = await req.json();

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // 0. Create Import Log initially
    const { data: importLog, error: logError } = await adminSupabase.from('csv_import_logs').insert({
      imported_by:      user.id,
      file_name:        fileName || 'Admissions Upload',
      total_rows:       data.length,
      success_rows:     0,
      status:           'processing',
      import_type:      'students',
      academic_session: data[0]?.Academic_Session || '2024-25'
    }).select('id').single();

    if (logError) {
      console.error("Failed to create initial import log", logError);
      return NextResponse.json({ error: 'Failed to initialize import log.' }, { status: 500 });
    }
    const importLogId = importLog?.id;

    // Map CSV rows to DB columns, filtering out totally empty rows
    const studentsToInsert = data.map((row: any) => ({
      admission_number: row.Admission_No || row.admission_number,
      student_name: row.Student_Name || row.name || row.student_name,
      dob: row.DOB ? new Date(row.DOB).toISOString() : new Date().toISOString(),
      gender: row.Gender || 'Other',
      class: row.Class || 'Unknown',
      academic_session: row.Academic_Session || '2024-25',
      import_log_id: importLogId,
      status: 'active'
    })).filter((s: any) => s.admission_number && s.student_name); 

    if (studentsToInsert.length === 0) {
       return NextResponse.json({ error: 'No valid student data found in CSV.' }, { status: 400 });
    }

    // Bulk Upsert (to gracefully handle duplicates)
    const { data: insertedData, error } = await adminSupabase
      .from('students')
      .upsert(studentsToInsert, { onConflict: 'admission_number,academic_session', ignoreDuplicates: false })
      .select();

    if (error) {
        console.error("Supabase Upsert Error:", error);
        throw error;
    }

    const successCount = insertedData ? insertedData.length : 0;

    // Log the import to Import History
    await adminSupabase.from('csv_import_logs').update({
      success_rows: successCount,
      failed_rows: studentsToInsert.length - successCount,
      status: 'completed'
    }).eq('id', importLogId);

    return NextResponse.json({ 
      successCount: successCount,
      errorCount: studentsToInsert.length - successCount
    });

  } catch (error: any) {
    console.error('Import Admissions Error:', error);
    return NextResponse.json({ error: error.message || "Failed to process admissions CSV" }, { status: 500 });
  }
}
