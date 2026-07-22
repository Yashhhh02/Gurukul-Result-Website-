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
    
    const scanHeaderForSubjects = (headerRow: any[]) => {
      if (!headerRow) return;
      headerRow.forEach((cell, index) => {
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
          // Check if already mapped to avoid duplicates (sometimes names repeat)
          const alreadyMappedNumeric = numericMappings.some(m => m.subjectCode === foundSubjectCode);
          const alreadyMappedGraded = gradedMappings.some(m => m.subjectCode === foundSubjectCode);
          if (alreadyMappedNumeric || alreadyMappedGraded) return;

          if (foundSubjectCode === 'ENVIRONMENTAL_STUDIES' || foundSubjectCode === 'PHYSICAL_EDUCATION') {
             gradedMappings.push({ subjectCode: foundSubjectCode, gradeKey: index });
          } else {
             // For numeric subjects, Practical is at `index`, Written is at `index + 1`
             numericMappings.push({ subjectCode: foundSubjectCode, pracKey: index, writtenKey: index + 1 });
          }
        }
      });
    }

    // Identify rows and scan headers based on stream
    let dataStartIndex = 0;
    
    if (streamType === 'CS') {
      // CS has numeric subjects in row 0, graded in row 1
      scanHeaderForSubjects(rows[0]);
      scanHeaderForSubjects(rows[1]);
      dataStartIndex = 2;
    } else {
      // IT, PCM, PCMB all have their subjects in row 1
      scanHeaderForSubjects(rows[1]);
      dataStartIndex = 3;
    }

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
      const studentName = streamType === 'CS' ? row[1] : row[1];
      if (!studentName) continue;

      let uniqueId = '';
      let admissionNumber = '';
      let rollNo = '';
      let dob = null;
      let div = 'A';
      
      if (streamType === 'CS') {
        dob = parseDate(row[4]);
        uniqueId = String(row[5] || '').trim();
        rollNo = String(row[6] || '').trim();
        admissionNumber = String(row[7] || '').trim() || uniqueId || `TMP_${Date.now()}`;
        div = String(row[3] || 'A').trim();
      } else {
        // IT, PCM, PCMB
        dob = parseDate(row[2]);
        const baseUniqueId = String(row[3] || '').trim();
        const prefix = streamType.split('-')[0] + '-'; // e.g. IT-, PCM-, PCMB-
        uniqueId = streamType === 'IT-GEO' ? 'GEO-' + baseUniqueId : (streamType === 'IT-NONGEO' ? 'NONGEO-' + baseUniqueId : prefix + baseUniqueId);
        admissionNumber = uniqueId;
        rollNo = String(row[4] || '').trim();
        div = 'A'; // Defaults for non-CS
      }

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
        status: 'active'
      };

      const { data: student, error: studErr } = await adminSupabase
        .from('students')
        .upsert(studentData, { onConflict: 'admission_number, academic_session' })
        .select('id')
        .single();

      if (studErr) continue;

      const studentId = student.id;
      const resultsToUpsert = [];

      // Add numeric results
      for (const mapping of numericMappings) {
        const subId = subjectIdMap[mapping.subjectCode];
        if (!subId) continue;
        
        resultsToUpsert.push({
          student_id: studentId,
          subject_id: subId,
          i_term_marks: parseFloat(row[mapping.pracKey]) || 0,
          ii_term_marks: parseFloat(row[mapping.writtenKey]) || 0,
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
      successCount++;
    }

    return NextResponse.json({ success: true, successCount });

  } catch (error: any) {
    console.error('Raw Excel Import error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
