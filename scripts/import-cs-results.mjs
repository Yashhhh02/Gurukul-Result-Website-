// scripts/import-cs-results.mjs
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

const FILE_PATH = path.resolve('public/CS_Students_FINAL_FIXED_PERCENTAGE_CORRECTED.xlsx');

const excelSubjectMap = {
  "PHYSICS": "PHYSICS",
  "CHEMISTRY": "CHEMISTRY",
  "MATHS": "MATHEMATICS",
  "COMPUTER SCIENCE 1": "CS1",
  "COMPUTER SCIENCE 2": "CS2",
  "ENGLISH": "ENGLISH",
  "ENVIRONMENTAL STUDIES": "ENVIRONMENTAL_STUDIES",
  "PHYSICAL EDUCATION": "PHYSICAL_EDUCATION"
};

const gradedSubjectsSet = new Set(["ENVIRONMENTAL_STUDIES", "PHYSICAL_EDUCATION"]);

function parseDate(dateStr) {
  if (!dateStr) return null;
  // expects DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

async function run() {
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile(FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // First row is the sub-header row, so we skip it (index 0)
  const dataRows = rows.slice(1);
  console.log(`Found ${dataRows.length} student records.`);

  // 1. Ensure subjects exist
  const { data: dbSubjects, error: subErr } = await supabase.from('subjects').select('*');
  if (subErr) {
    console.error("Error fetching subjects:", subErr);
    return;
  }
  const subjectIdMap = {};
  dbSubjects.forEach(s => {
    subjectIdMap[s.subject_code] = s.id;
  });

  // 2. Process Students
  for (const row of dataRows) {
    const studentName = row['__EMPTY_1'];
    if (!studentName) continue; // skip empty rows

    const admissionNumber = String(row['__EMPTY_7']).trim() || `TMP_${Date.now()}`;
    const uniqueId = String(row['__EMPTY_5']).trim();
    
    console.log(`Processing student: ${studentName} (${admissionNumber})`);

    // UPSERT Student
    const studentData = {
      admission_number: admissionNumber,
      unique_id: uniqueId,
      roll_number: String(row['__EMPTY_6']).trim(),
      gr_number: String(row['__EMPTY_7']).trim(),
      student_name: studentName,
      dob: parseDate(row['__EMPTY_4']),
      class: 'XI', // hardcoded or from row['__EMPTY_2']
      division: String(row['__EMPTY_3']).trim(),
      subject_group: 'CS',
      academic_session: '2024-2025',
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

    // INSERT Results
    const resultsToUpsert = [];

    // Mapping logic based on Excel headers
    const subjectMappings = [
      { excelKey: 'PHYSICS', pracKey: 'PHYSICS', writtenKey: '__EMPTY_11' },
      { excelKey: 'CHEMISTRY', pracKey: 'CHEMISTRY', writtenKey: '__EMPTY_13' },
      { excelKey: 'MATHS', pracKey: 'MATHS', writtenKey: '__EMPTY_15' },
      { excelKey: 'COMPUTER SCIENCE 1', pracKey: 'COMPUTER SCIENCE 1', writtenKey: '__EMPTY_17' },
      { excelKey: 'COMPUTER SCIENCE 2', pracKey: 'COMPUTER SCIENCE 2', writtenKey: '__EMPTY_19' },
      { excelKey: 'ENGLISH', pracKey: 'ENGLISH', writtenKey: '__EMPTY_21' },
    ];

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

    resultsToUpsert.push({
      student_id: studentId,
      subject_id: subjectIdMap[evsCode],
      grade: row['__EMPTY_23'] || 'A',
      is_graded_only: true,
      i_term_marks: 0,
      ii_term_marks: 0
    });

    resultsToUpsert.push({
      student_id: studentId,
      subject_id: subjectIdMap[peCode],
      grade: row['__EMPTY_24'] || 'A',
      is_graded_only: true,
      i_term_marks: 0,
      ii_term_marks: 0
    });

    const { error: resErr } = await supabase
      .from('student_results')
      .upsert(resultsToUpsert, { onConflict: 'student_id, subject_id' });

    if (resErr) {
      console.error(`Failed to upsert results for ${studentName}:`, resErr);
    }
  }

  console.log('Done importing CS results!');
}

run();
