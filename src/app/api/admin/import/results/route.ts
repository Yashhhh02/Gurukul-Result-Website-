import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function calculateGrade(percentage: number) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

export async function POST(req: Request) {
  try {
    const { fileName, data } = await req.json();

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Fetch all students to map GI_No to student_id securely
    const { data: students, error: studentError } = await supabase.from('students').select('id, gr_number, roll_number, student_name');
    if (studentError) throw studentError;

    // Create a lookup map O(1) based on GI No (gr_number)
    const studentMap = new Map(students.map(s => [s.gr_number, s]));

    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      const giNo = row.GI_No || row.gi_no;
      const rollNo = row.Roll_No || row.roll_no;
      const fullName = row.Full_Name || row.full_name;

      if (!giNo || !rollNo || !fullName) {
        errorCount++;
        continue;
      }
      
      const student = studentMap.get(giNo);
      
      // Validation: If student doesn't exist or Roll No/Name don't match, row fails.
      if (!student || String(student.roll_number) !== String(rollNo) || student.student_name.toLowerCase() !== fullName.toLowerCase()) {
        errorCount++;
        continue; 
      }

      const studentId = student.id;

      // Sum all theory and practical marks dynamically from CSV columns
      let totalMarks = 0;
      let maxMarks = 0;
      
      for (const [key, value] of Object.entries(row)) {
        if (
          key !== 'GI_No' && 
          key !== 'gi_no' &&
          key !== 'Roll_No' && 
          key !== 'roll_no' && 
          key !== 'Full_Name' && 
          key !== 'full_name' &&
          value !== '' && 
          value !== null
        ) {
          totalMarks += parseFloat(value as string) || 0;
          maxMarks += 100; // Assume each subject component is out of 100 for this dynamic demo
        }
      }

      if (maxMarks === 0) {
        errorCount++; // No valid marks found for this student row
        continue;
      }

      const percentage = (totalMarks / maxMarks) * 100;
      const grade = calculateGrade(percentage);
      const status = percentage >= 33 ? 'pass' : 'fail';
      const resultId = `RES-${new Date().getFullYear()}-${giNo}`;

      // Upsert into result_summary
      const { error: insertError } = await supabase
        .from('result_summary')
        .upsert({
          result_id: resultId,
          student_id: studentId,
          total_marks: totalMarks,
          max_marks: maxMarks,
          percentage: percentage.toFixed(2),
          overall_grade: grade,
          result_status: status,
          is_published: true, // Auto publish on import for demo
          issue_date: new Date().toISOString()
        }, { onConflict: 'student_id' });

      if (insertError) {
          console.error("Result Upsert Error:", insertError);
          errorCount++;
      } else {
          successCount++;
      }
    }

    // Log the import event
    await supabase.from('csv_import_logs').insert({
      file_name: fileName,
      total_rows: data.length,
      success_rows: successCount,
      failed_rows: errorCount,
      status: errorCount === 0 ? 'completed' : 'completed', // Using completed for partial success too for simplicity
      import_type: 'results'
    });

    return NextResponse.json({ successCount, errorCount });

  } catch (error: any) {
    console.error('Import Results Error:', error);
    return NextResponse.json({ error: error.message || "Failed to process results CSV" }, { status: 500 });
  }
}
