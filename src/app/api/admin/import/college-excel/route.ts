import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

const excelSubjectMap: Record<string, string> = {
  "PHYSICS": "PHYSICS",
  "CHEMISTRY": "CHEMISTRY",
  "MATHS": "MATHEMATICS",
  "MATHEMATICS": "MATHEMATICS",
  "COMPUTER SCIENCE 1": "CS1",
  "COMPUTER SCIENCE 2": "CS2",
  "INFORMATION TECHNOLOGY": "IT",
  "IT": "IT",
  "ENGLISH": "ENGLISH",
  "GEOGRAPHY": "GEOGRAPHY",
  "BIOLOGY": "BIOLOGY",
  "HINDI": "HINDI",
  "MARATHI": "MARATHI",
  "ENVIRONMENTAL STUDIES": "ENVIRONMENTAL_STUDIES",
  "ENVIRONMENTAL\nSTUDIES": "ENVIRONMENTAL_STUDIES",
  "PHYSICAL EDUCATION": "PHYSICAL_EDUCATION",
  "PHYSICAL\nEDUCATION": "PHYSICAL_EDUCATION"
};

function parseDate(dateStr: string) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  let parts = str.split('/');
  if (parts.length !== 3) {
    parts = str.split('-');
  }
  
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  
  return str;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const streamType = formData.get('streamType') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const { data: importLog, error: logError } = await adminSupabase.from('csv_import_logs').insert({
      imported_by: user.id,
      file_name: file.name,
      import_type: 'results',
      status: 'completed',
      total_rows: 0,
      success_rows: 0,
      failed_rows: 0
    }).select('id').single();
    
    if (logError) {
      console.error("Failed to create initial import log", logError);
      return NextResponse.json({ error: 'Failed to initialize import log.' }, { status: 500 });
    }
    const importLogId = importLog?.id;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Always use { header: 1 } for raw 2D array to perfectly preserve column indexes
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    // Ensure subjects exist in DB
    const { data: dbSubjects, error: subErr } = await adminSupabase.from('subjects').select('*');
    if (subErr) throw new Error("Error fetching subjects");

    const subjectIdMap: Record<string, string> = {};
    dbSubjects.forEach(s => {
      subjectIdMap[s.subject_code] = s.id;
    });

    let successCount = 0;

    // DYNAMIC PARSER HELPERS
    const numericMappings: { subjectCode: string; pracKey: number; writtenKey: number }[] = [];
    const gradedMappings: { subjectCode: string; gradeKey: number }[] = [];
    
    // 1. Dynamically find the header row (contains 'student name' or 'name')
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const r = rows[i];
      if (r && r.some(cell => String(cell).toLowerCase().includes('student name') || String(cell).toLowerCase().trim() === 'name')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: 'Could not find header row containing Student Name' }, { status: 400 });
    }

    // 2. Map standard columns dynamically from the header row
    const colMap: Record<string, number> = { name: 1, dob: -1, class: -1, div: -1, uid: -1, roll: -1, gr: -1 };
    const headerRow = rows[headerRowIndex];
    headerRow.forEach((cell, idx) => {
      if (!cell) return;
      const val = String(cell).toLowerCase().trim();
      if (val.includes('name')) colMap['name'] = idx;
      if (val === 'dob' || val.includes('date of birth')) colMap['dob'] = idx;
      if (val === 'class') colMap['class'] = idx;
      if (val.includes('div')) colMap['div'] = idx;
      if (val.includes('uid') || val.includes('unique')) colMap['uid'] = idx;
      if (val.includes('gr no') || val.includes('gr.') || val.includes('admission') || val.includes('gr number')) colMap['gr'] = idx;
      if (val.includes('roll')) colMap['roll'] = idx;
    });

    // 3. Scan for subjects in all rows up to headerRowIndex
    for (let i = 0; i <= headerRowIndex; i++) {
      if (!rows[i]) continue;
      const r = rows[i];
      const nextRow = rows[i + 1] || []; // use next row to identify WRITTEN/PRACTICAL order
      
      r.forEach((cell: any, index: number) => {
        if (!cell) return;
        const normalized = String(cell).trim().toUpperCase().replace(/\s+/g, ' ');
        
        let foundSubjectCode = null;
        for (const [key, code] of Object.entries(excelSubjectMap)) {
          const normalizedKey = key.replace(/\s+/g, ' ');
          if (normalized === normalizedKey) {
            foundSubjectCode = code;
            break;
          }
        }
        
        if (foundSubjectCode) {
          // Check if already mapped to avoid duplicates
          const alreadyMappedNumeric = numericMappings.some(m => m.subjectCode === foundSubjectCode);
          const alreadyMappedGraded = gradedMappings.some(m => m.subjectCode === foundSubjectCode);
          if (alreadyMappedNumeric || alreadyMappedGraded) return;

          if (foundSubjectCode === 'ENVIRONMENTAL_STUDIES' || foundSubjectCode === 'PHYSICAL_EDUCATION') {
             gradedMappings.push({ subjectCode: foundSubjectCode, gradeKey: index });
          } else {
             // Dynamically check next row to see if index is practical or written
             const val0 = String(nextRow[index] || '').toUpperCase();
             const val1 = String(nextRow[index + 1] || '').toUpperCase();
             
             let pracKey = index;
             let writtenKey = index + 1;
             
             if (val0.includes('WRIT') || val0 === 'TH' || val0.includes('THEORY')) {
               writtenKey = index;
               pracKey = index + 1;
             }
             
             numericMappings.push({ subjectCode: foundSubjectCode, pracKey, writtenKey });
          }
        }
      });
    }

    const dataStartIndex = headerRowIndex + 1;

    // Auto-create missing subjects dynamically
    const missingSubjectsToCreate = [];
    let nextDisplayOrder = 20;
    for (const map of [...numericMappings, ...gradedMappings]) {
       if (!subjectIdMap[map.subjectCode]) {
         missingSubjectsToCreate.push({
           subject_name: map.subjectCode.replace(/_/g, ' '),
           subject_code: map.subjectCode,
           display_order: nextDisplayOrder++,
           class_group: '11',
           is_active: true,
           is_graded_only: gradedMappings.some(g => g.subjectCode === map.subjectCode),
           max_i_term: gradedMappings.some(g => g.subjectCode === map.subjectCode) ? 0 : 50,
           max_ii_term: gradedMappings.some(g => g.subjectCode === map.subjectCode) ? 0 : 100,
           max_ut1: gradedMappings.some(g => g.subjectCode === map.subjectCode) ? 0 : 25,
           max_ut2: gradedMappings.some(g => g.subjectCode === map.subjectCode) ? 0 : 25,
           passing_marks: gradedMappings.some(g => g.subjectCode === map.subjectCode) ? 0 : 35
         });
       }
    }

    if (missingSubjectsToCreate.length > 0) {
      const { data: inserted } = await adminSupabase.from('subjects').insert(missingSubjectsToCreate).select();
      if (inserted) {
        inserted.forEach(s => {
          subjectIdMap[s.subject_code] = s.id;
        });
      }
    }

    const dataRows = rows.slice(dataStartIndex);
    
    for (const row of dataRows) {
      const studentName = row[colMap['name']];
      if (!studentName) {
        // Skip empty rows or footer rows (like "Total IT Students")
        continue;
      }

      let uniqueId = '';
      let admissionNumber = '';
      let rollNo = colMap['roll'] !== -1 ? String(row[colMap['roll']] || '').trim() : '';
      let dob = colMap['dob'] !== -1 ? parseDate(row[colMap['dob']]) : null;
      let div = colMap['div'] !== -1 ? String(row[colMap['div']] || 'A').trim() : 'A';
      
      // Clean up "11TH B" to just "B"
      if (div.toUpperCase().includes('11TH ')) {
        div = div.toUpperCase().replace('11TH ', '').trim();
      }

      let uidCell = colMap['uid'] !== -1 ? String(row[colMap['uid']] || '').trim() : '';
      let grCell = colMap['gr'] !== -1 ? String(row[colMap['gr']] || '').trim() : '';

      let baseUniqueId = uidCell || grCell;
      let baseGr = grCell || uidCell;
      
      if (!baseUniqueId && !baseGr) {
        baseUniqueId = `TMP_${Date.now()}`;
        baseGr = baseUniqueId;
      }

      uniqueId = baseUniqueId;
      admissionNumber = baseGr;

      const streamName = streamType.split('-')[0]; // CS, IT, PCM, PCMB

      const studentData = {
        admission_number: admissionNumber,
        unique_id: uniqueId,
        roll_number: rollNo,
        gr_number: admissionNumber,
        student_name: studentName,
        dob: dob,
        class: '11TH',
        division: div,
        subject_group: streamName,
        academic_session: '2025-2026',
        import_log_id: importLogId || null,
        status: 'active'
      };

      const { data: student, error: studErr } = await adminSupabase
        .from('students')
        .upsert(studentData, { onConflict: 'admission_number, academic_session' })
        .select('id')
        .single();

      if (studErr) {
        console.error("Student Upsert Error for", studentName, "Data:", studentData, "Error:", studErr);
        continue;
      }

      const studentId = student.id;
      const resultsToUpsert = [];
      
      let total_marks = 0;
      let hasFailed = false;

      // Add numeric results
      for (const mapping of numericMappings) {
        const subId = subjectIdMap[mapping.subjectCode];
        if (!subId) continue;
        
        const pracMarks = parseFloat(row[mapping.pracKey]) || 0;
        const writtenMarks = parseFloat(row[mapping.writtenKey]) || 0;
        const subjectTotal = pracMarks + writtenMarks;
        
        total_marks += subjectTotal;
        if (subjectTotal < 35) {
          hasFailed = true;
        }
        
        resultsToUpsert.push({
          student_id: studentId,
          subject_id: subId,
          i_term_marks: pracMarks,
          ii_term_marks: writtenMarks,
          unit_test_1: 0,
          unit_test_2: 0,
          is_graded_only: false
        });
      }

      // Add graded results
      for (const mapping of gradedMappings) {
        const subId = subjectIdMap[mapping.subjectCode];
        if (!subId) continue;
        
        resultsToUpsert.push({
          student_id: studentId,
          subject_id: subId,
          grade: row[mapping.gradeKey] || 'A',
          is_graded_only: true,
          i_term_marks: 0,
          ii_term_marks: 0
        });
      }

      await adminSupabase.from('student_results').upsert(resultsToUpsert, { onConflict: 'student_id, subject_id' });
      
      // Calculate and Upsert Summary
      const max_marks = numericMappings.length * 100;
      const percentage = max_marks > 0 ? (total_marks / max_marks) * 100 : 0;
      const result_status = hasFailed ? 'fail' : 'pass';

      const summaryToUpsert = {
        result_id: `RES-${admissionNumber}-${Date.now().toString().slice(-6)}`,
        student_id: studentId,
        total_marks,
        max_marks,
        percentage: parseFloat(percentage.toFixed(2)),
        overall_grade: 'A', 
        result_status,
        progress_remark: result_status === 'pass' ? 'SATISFACTORY' : 'NEEDS IMPROVEMENT',
        is_published: true
      };

      await adminSupabase.from('result_summary').upsert(summaryToUpsert, { onConflict: 'student_id' });

      successCount++;
    }

    if (importLogId) {
      await adminSupabase.from('csv_import_logs').update({
        total_rows: rows.length,
        success_rows: successCount,
      }).eq('id', importLogId);
    }

    return NextResponse.json({ success: true, successCount });

  } catch (error: any) {
    console.error('Raw Excel Import error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
