import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

const FILE_PATH = path.resolve('public/CS_Students_FINAL_FIXED.xlsx');

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

function parseDate(dateStr) {
  if (!dateStr) return '2008-01-01';
  const str = String(dateStr).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
}

async function run() {
  console.log('Reading CS Excel file:', FILE_PATH);
  const workbook = xlsx.readFile(FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // Skip subheader row (row index 0)
  const dataRows = rows.slice(1);
  console.log(`Found ${dataRows.length} CS student records in Excel.`);

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

  let importedCount = 0;

  // 2. Process Students
  for (const row of dataRows) {
    const studentName = row['__EMPTY_1'];
    if (!studentName || String(studentName).trim().toLowerCase().includes('total')) continue;

    const grNo = String(row['__EMPTY_7'] || '').trim();
    const uniqueId = String(row['__EMPTY_5'] || '').trim();
    const rollNo = String(row['__EMPTY_6'] || '').trim();
    const dob = parseDate(row['__EMPTY_4']);
    const div = String(row['__EMPTY_3'] || 'A').trim();
    const studentNameClean = String(studentName).trim();

    const admissionNumber = grNo || uniqueId || `CS_${Date.now()}`;

    const studentData = {
      admission_number: admissionNumber,
      unique_id: uniqueId || admissionNumber,
      roll_number: rollNo || admissionNumber,
      gr_number: grNo || admissionNumber,
      student_name: studentNameClean,
      dob: dob,
      class: 'XI',
      division: div,
      subject_group: 'CS',
      academic_session: '2025-2026',
      status: 'active'
    };

    const { data: student, error: studErr } = await supabase
      .from('students')
      .upsert(studentData, { onConflict: 'admission_number, academic_session' })
      .select('id')
      .single();

    if (studErr) {
      console.error(`Failed to upsert CS student ${studentNameClean}:`, studErr);
      continue;
    }

    const studentId = student.id;

    // Build subject results
    const resultsToUpsert = [];
    let totalMarks = 0;
    let hasFailed = false;

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
      if (!subId) continue;

      const pracMarks = parseFloat(row[mapping.pracKey]) || 0;
      const writtenMarks = parseFloat(row[mapping.writtenKey]) || 0;
      const subTotal = pracMarks + writtenMarks;

      totalMarks += subTotal;
      if (subTotal < 35) hasFailed = true;

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
        grade: String(row['__EMPTY_23'] || 'A').trim(),
        is_graded_only: true,
        i_term_marks: 0,
        ii_term_marks: 0
      });
    }

    if (subjectIdMap[peCode]) {
      resultsToUpsert.push({
        student_id: studentId,
        subject_id: subjectIdMap[peCode],
        grade: String(row['__EMPTY_24'] || 'A').trim(),
        is_graded_only: true,
        i_term_marks: 0,
        ii_term_marks: 0
      });
    }

    await supabase.from('student_results').upsert(resultsToUpsert, { onConflict: 'student_id, subject_id' });

    // Calculate Summary
    const maxMarks = 600;
    const percentage = parseFloat((row['__EMPTY_26'] || (totalMarks / 6)).toFixed(2));
    const resultStatus = hasFailed ? 'fail' : 'pass';

    const summaryToUpsert = {
      result_id: `RES-CS-${admissionNumber}`,
      student_id: studentId,
      total_marks: totalMarks,
      max_marks: maxMarks,
      percentage: percentage,
      overall_grade: percentage >= 75 ? 'O' : percentage >= 60 ? 'A' : percentage >= 50 ? 'B' : 'C',
      result_status: resultStatus,
      progress_remark: resultStatus === 'pass' ? 'EXCELLENT' : 'NEEDS IMPROVEMENT',
      is_published: true
    };

    await supabase.from('result_summary').upsert(summaryToUpsert, { onConflict: 'student_id' });

    importedCount++;
  }

  console.log(`Successfully imported ${importedCount} CS students into Supabase!`);
}

run();
