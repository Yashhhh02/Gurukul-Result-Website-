// scripts/import-it-results.mjs
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import xlsx from 'xlsx';
import path from 'path';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const excelSubjectMap = {
  "PHYSICS": "PHYSICS",
  "CHEMISTRY": "CHEMISTRY",
  "MATHS": "MATHEMATICS",
  "INFORMATION TECHNOLOGY": "IT",
  "ENGLISH": "ENGLISH",
  "GEOGRAPHY": "GEOGRAPHY",
  "BIOLOGY": "BIOLOGY",
  "ENVIRONMENTAL STUDIES": "ENVIRONMENTAL_STUDIES",
  "PHYSICAL EDUCATION": "PHYSICAL_EDUCATION"
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  // handle both DD/MM/YYYY and DD-MM-YYYY
  let parts = str.split('/');
  if (parts.length !== 3) {
    parts = str.split('-');
  }
  
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  
  return str;
}

async function processFile(filename, isGeography) {
  console.log(`\n===========================================`);
  console.log(`Processing file: ${filename}`);
  const filePath = path.resolve(`public/${filename}`);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

  // Both v2 files have their first data row at index 3 (0-based)
  const dataStartIndex = 3;
  const dataRows = rows.slice(dataStartIndex);
  
  console.log(`Found ${dataRows.length} student records.`);

  const { data: dbSubjects, error: subErr } = await supabase.from('subjects').select('*');
  if (subErr) {
    console.error("Error fetching subjects:", subErr);
    return;
  }
  const subjectIdMap = {};
  dbSubjects.forEach(s => {
    subjectIdMap[s.subject_code] = s.id;
  });

  // Check and add missing IT, GEOGRAPHY, BIOLOGY
  const missingSubjects = [];
  if (!subjectIdMap['IT']) {
    missingSubjects.push({ subject_name: 'INFORMATION TECHNOLOGY', subject_code: 'IT', display_order: 10 });
  }
  if (!subjectIdMap['GEOGRAPHY']) {
    missingSubjects.push({ subject_name: 'GEOGRAPHY', subject_code: 'GEOGRAPHY', display_order: 11 });
  }
  if (!subjectIdMap['BIOLOGY']) {
    missingSubjects.push({ subject_name: 'BIOLOGY', subject_code: 'BIOLOGY', display_order: 5 });
  }

  if (missingSubjects.length > 0) {
    console.log('Adding missing subjects:', missingSubjects.map(s => s.subject_code).join(', '));
    const { data: inserted, error: insertErr } = await supabase.from('subjects').insert(missingSubjects).select();
    if (insertErr) {
      console.error("Failed to insert missing subjects:", insertErr);
    } else if (inserted) {
      inserted.forEach(s => {
        subjectIdMap[s.subject_code] = s.id;
      });
    }
  }

  for (const row of dataRows) {
    const studentName = row[1];
    if (!studentName) continue;

    const baseUniqueId = String(row[3]).trim();
    const prefix = isGeography ? 'GEO-' : 'NONGEO-';
    const uniqueId = prefix + baseUniqueId;
    const admissionNumber = uniqueId;
    const rollNo = String(row[4]).trim();
    
    console.log(`Processing student: ${studentName} (${uniqueId})`);

    const studentData = {
      admission_number: admissionNumber,
      unique_id: uniqueId,
      roll_number: rollNo,
      gr_number: admissionNumber,
      student_name: studentName,
      dob: parseDate(row[2]),
      class: '11TH', 
      division: 'B', // default to B as it was missing in this sheet

      subject_group: 'IT',
      academic_session: '2025-2026',
      status: 'active'
    };

    const { data: student, error: studErr } = await supabase
      .from('students')
      .upsert(studentData, { onConflict: 'admission_number, academic_session' })
      .select('id')
      .single();

    if (studErr) {
      console.error(`Failed to upsert student ${studentName}:`, studErr);
      continue;
    }

    const studentId = student.id;
    const resultsToUpsert = [];

    // Different mappings based on Geography flag
    let subjectMappings = [];
    let evsIndex, peIndex;

    if (isGeography) {
      subjectMappings = [
        { excelKey: 'PHYSICS', pracKey: 5, writtenKey: 6 },
        { excelKey: 'CHEMISTRY', pracKey: 8, writtenKey: 9 },
        { excelKey: 'BIOLOGY', pracKey: 11, writtenKey: 12 },
        { excelKey: 'INFORMATION TECHNOLOGY', pracKey: 14, writtenKey: 15 },
        { excelKey: 'GEOGRAPHY', pracKey: 17, writtenKey: 18 },
        { excelKey: 'ENGLISH', pracKey: 20, writtenKey: 21 },
      ];
      evsIndex = 23;
      peIndex = 24;
    } else {
      subjectMappings = [
        { excelKey: 'PHYSICS', pracKey: 5, writtenKey: 6 },
        { excelKey: 'CHEMISTRY', pracKey: 8, writtenKey: 9 },
        { excelKey: 'BIOLOGY', pracKey: 11, writtenKey: 12 },
        { excelKey: 'INFORMATION TECHNOLOGY', pracKey: 14, writtenKey: 15 },
        { excelKey: 'ENGLISH', pracKey: 17, writtenKey: 18 },
      ];
      evsIndex = 20;
      peIndex = 21;
    }

    for (const mapping of subjectMappings) {
      const subCode = excelSubjectMap[mapping.excelKey];
      const subId = subjectIdMap[subCode];
      if (!subId) {
        console.warn(`Subject ID not found for ${subCode}`);
        continue;
      }
      const pracMarks = parseFloat(row[mapping.pracKey]) || 0;
      const writtenMarks = parseFloat(row[mapping.writtenKey]) || 0;

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

    // EVS and PE
    const evsCode = excelSubjectMap['ENVIRONMENTAL STUDIES'];
    const peCode = excelSubjectMap['PHYSICAL EDUCATION'];

    if (subjectIdMap[evsCode]) {
      resultsToUpsert.push({
        student_id: studentId,
        subject_id: subjectIdMap[evsCode],
        grade: row[evsIndex] || 'A',
        is_graded_only: true,
        i_term_marks: 0,
        ii_term_marks: 0
      });
    }

    if (subjectIdMap[peCode]) {
      resultsToUpsert.push({
        student_id: studentId,
        subject_id: subjectIdMap[peCode],
        grade: row[peIndex] || 'A',
        is_graded_only: true,
        i_term_marks: 0,
        ii_term_marks: 0
      });
    }

    const { error: resErr } = await supabase
      .from('student_results')
      .upsert(resultsToUpsert, { onConflict: 'student_id, subject_id' });

    if (resErr) {
      console.error(`Failed to upsert results for ${studentName}:`, resErr);
    }
  }

  console.log(`Done importing ${filename}!`);
}

async function run() {
  await processFile('IT_Students_WithGeography_v2.xlsx', true);
  await processFile('IT_Students_WithoutGeography_v2.xlsx', false);
}

run();
