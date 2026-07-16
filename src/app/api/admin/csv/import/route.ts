import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Maharashtra HSC — Progress remark based on percentage
function calculateProgress(percentage: number): string {
  if (percentage >= 75) return 'EXCELLENT';
  if (percentage >= 60) return 'GOOD';
  if (percentage >= 50) return 'SATISFACTORY';
  if (percentage >= 35) return 'PASS';
  return 'FAIL';
}

// Overall grade based on percentage
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'O';
  if (percentage >= 80) return 'A+';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B+';
  if (percentage >= 50) return 'B';
  if (percentage >= 35) return 'C';
  return 'F';
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Service role client to bypass RLS for admin bulk inserts
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: adminUser, error: adminError } = await adminSupabase
      .from('admin_users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser || !adminUser.is_active) {
      return NextResponse.json({ error: 'Unauthorized access. Admins only.' }, { status: 403 });
    }

    const body = await request.json();
    const { data: rows } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data provided or invalid format.' }, { status: 400 });
    }

    const headers = Object.keys(rows[0]);

    // -------------------------------------------------------
    // 1. Detect subjects from headers
    //    Maharashtra HSC format: SubjectName_ITermA, _IITermB, _UT1, _UT2
    //    Graded-only format:     SubjectName_Grade
    // -------------------------------------------------------
    const subjectNamesNumeric = new Set<string>();
    const subjectNamesGraded = new Set<string>();

    headers.forEach(header => {
      if (header.endsWith('_ITermA') || header.endsWith('_IITermB') ||
          header.endsWith('_UT1') || header.endsWith('_UT2')) {
        const name = header
          .replace('_ITermA', '').replace('_IITermB', '')
          .replace('_UT1', '').replace('_UT2', '');
        subjectNamesNumeric.add(name);
      } else if (header.endsWith('_Grade')) {
        const name = header.replace('_Grade', '');
        subjectNamesGraded.add(name);
      }
    });

    if (subjectNamesNumeric.size === 0 && subjectNamesGraded.size === 0) {
      return NextResponse.json({
        error: 'No subject columns found. Use _ITermA, _IITermB, _UT1, _UT2 suffixes for marks and _Grade for graded-only subjects.'
      }, { status: 400 });
    }

    // -------------------------------------------------------
    // 2. Upsert Subjects
    // -------------------------------------------------------
    const formatSubjectName = (name: string) => {
      const map: Record<string, string> = {
        'CS1': 'COMPUTER SCIENCE - I',
        'CS2': 'COMPUTER SCIENCE - II',
        'ENVSTUDIES': 'ENVIRONMENTAL STUDIES',
        'PE': 'PHYSICAL EDUCATION',
        'MATHS': 'MATHEMATICS',
        'IT': 'INFORMATION TECHNOLOGY'
      };
      const upper = name.toUpperCase();
      return map[upper] || name.replace(/_/g, ' ');
    };

    const subjectsToUpsert = [
      ...Array.from(subjectNamesNumeric).map((name, idx) => ({
        subject_name: formatSubjectName(name),
        subject_code: name.toUpperCase(),
        max_i_term: 50,
        max_ii_term: 100,
        max_ut1: 25,
        max_ut2: 25,
        passing_marks: 35,
        is_graded_only: false,
        display_order: idx,
        class_group: '11',
        is_active: true
      })),
      ...Array.from(subjectNamesGraded).map((name, idx) => ({
        subject_name: formatSubjectName(name),
        subject_code: name.toUpperCase(),
        max_i_term: 0,
        max_ii_term: 0,
        max_ut1: 0,
        max_ut2: 0,
        passing_marks: 0,
        is_graded_only: true,
        display_order: subjectNamesNumeric.size + idx,
        class_group: '11',
        is_active: true
      }))
    ];

    const { data: upsertedSubjects, error: subjectsError } = await adminSupabase
      .from('subjects')
      .upsert(subjectsToUpsert, { onConflict: 'subject_code' })
      .select('id, subject_name, subject_code, is_graded_only');

    if (subjectsError) {
      throw new Error(`Failed to upsert subjects: ${subjectsError.message}`);
    }

    const subjectMap = new Map<string, { id: string; isGradedOnly: boolean }>();
    upsertedSubjects.forEach(sub => {
      subjectMap.set(sub.subject_code, { id: sub.id, isGradedOnly: sub.is_graded_only });
    });

    // -------------------------------------------------------
    // 3. Upsert Students
    // -------------------------------------------------------
    const studentsToUpsert = rows.map((row: any) => ({
      admission_number: String(row.Admission_No || row.admission_number || '').trim(),
      unique_id:        String(row.Unique_ID || row.unique_id || '').trim() || null,
      roll_number:      String(row.Roll_No || row.roll_number || '').trim() || null,
      gr_number:        String(row.GR_No || row.gr_number || '').trim() || null,
      student_name:     String(row.Name || row.student_name || '').trim(),
      dob:              row.DOB || row.dob || null,
      class:            String(row.Class || row.class || 'XI').trim(),
      division:         String(row.Division || row.division || 'A').trim(),
      subject_group:    String(row.Subject_Group || row.subject_group || '').trim() || null,
      academic_session: String(row.Session || row.academic_session || '2024-2025').trim(),
      status:           'active'
    })).filter((s: any) => s.admission_number && s.student_name);

    const { data: upsertedStudents, error: studentsError } = await adminSupabase
      .from('students')
      .upsert(studentsToUpsert, { onConflict: 'admission_number, academic_session' })
      .select('id, admission_number, academic_session');

    if (studentsError) {
      throw new Error(`Failed to upsert students: ${studentsError.message}`);
    }

    const studentMap = new Map<string, string>();
    upsertedStudents.forEach(stu => {
      studentMap.set(`${stu.admission_number}_${stu.academic_session}`, stu.id);
    });

    // -------------------------------------------------------
    // 4. Prepare Results & Summaries
    // -------------------------------------------------------
    const resultsToUpsert: any[] = [];
    const summariesToUpsert: any[] = [];

    rows.forEach((row: any) => {
      const admNo = String(row.Admission_No || row.admission_number || '').trim();
      const session = String(row.Session || row.academic_session || '2024-2025').trim();
      const studentId = studentMap.get(`${admNo}_${session}`);
      if (!studentId) return;

      const classStr = String(row.Class || row.class || 'XI').trim();
      const is12th = classStr.includes('12') || classStr.toUpperCase().includes('XII');

      let totalAvgMarks = 0;   // sum of avg_marks across subjects
      let totalMaxAvg = 0;     // sum of max avg per subject (A+B+C)/2 max
      let isFail = false;

      // Numeric subjects
      subjectNamesNumeric.forEach(subName => {
        const subKey = subName.toUpperCase();
        const subInfo = subjectMap.get(subKey);
        if (!subInfo) return;

        const rawITermA = row[`${subName}_ITermA`];
        const rawIITermB = row[`${subName}_IITermB`];
        const rawUT1 = row[`${subName}_UT1`];
        const rawUT2 = row[`${subName}_UT2`];

        // Check if student actually took this subject (ignores if columns are completely empty)
        const hasAnyMarks = 
          (rawITermA !== undefined && String(rawITermA).trim() !== '') ||
          (rawIITermB !== undefined && String(rawIITermB).trim() !== '') ||
          (rawUT1 !== undefined && String(rawUT1).trim() !== '') ||
          (rawUT2 !== undefined && String(rawUT2).trim() !== '');

        if (!hasAnyMarks) return; // Skip if subject is not applicable to this student

        const iTermA  = parseFloat(rawITermA)  || 0;
        const iiTermB = parseFloat(rawIITermB) || 0;
        const ut1     = parseFloat(rawUT1)     || 0;
        const ut2     = parseFloat(rawUT2)     || 0;

        const totalC = ut1 + ut2;
        let grandTotal = 0;
        let avgMarks = 0;
        let maxAvg = 100;

        if (is12th) {
          // 12th: UT1 (25) + Sem1 (50) + UT2 (25) = 100
          grandTotal = iTermA + totalC;
          avgMarks = grandTotal; // out of 100 directly
          maxAvg = 100;
        } else {
          // 11th: UT1(25) + Sem1(50) + UT2(25) + Sem2(100) = 200. Average = GrandTotal / 2 = 100
          grandTotal = iTermA + iiTermB + totalC;
          avgMarks = grandTotal / 2;
          maxAvg = 100;
        }

        totalAvgMarks += avgMarks;
        totalMaxAvg += maxAvg;

        // Check fail condition per subject (Passing marks is usually 35 out of 100)
        const passingMarks = subInfo.passing_marks || 35;
        if (avgMarks < passingMarks || row[`${subName}_ITermA`] === 'AB') {
          isFail = true;
        }
        resultsToUpsert.push({
          student_id:    studentId,
          subject_id:    subInfo.id,
          i_term_marks:  iTermA,
          ii_term_marks: iiTermB,
          unit_test_1:   ut1,
          unit_test_2:   ut2,
          is_graded_only: false,
          is_absent: row[`${subName}_ITermA`] === 'AB'
        });
      });

      // Graded-only subjects (Environmental Studies, Physical Education)
      subjectNamesGraded.forEach(subName => {
        const subKey = subName.toUpperCase();
        const subInfo = subjectMap.get(subKey);
        if (!subInfo) return;

        const grade = String(row[`${subName}_Grade`] || '').trim() || 'A';

        resultsToUpsert.push({
          student_id:    studentId,
          subject_id:    subInfo.id,
          i_term_marks:  null,
          ii_term_marks: null,
          unit_test_1:   null,
          unit_test_2:   null,
          grade:         grade,
          is_graded_only: true,
          is_absent:     false
        });
      });

      // Compute summary
      const percentage = totalMaxAvg > 0 ? (totalAvgMarks / totalMaxAvg) * 100 : 0;
      const overallGrade = calculateGrade(percentage);

      const passThreshold = 35;
      const passedByPercentage = percentage >= passThreshold;
      
      const overallResultStatus = (passedByPercentage && !isFail) ? 'pass' : 'fail';
      const progressRemark = calculateProgress(percentage);

      summariesToUpsert.push({
        result_id:       `GVP-${session.replace('-', '')}-${admNo}`,
        student_id:      studentId,
        total_marks:     parseFloat(totalAvgMarks.toFixed(2)),
        max_marks:       totalMaxAvg,
        percentage:      parseFloat(percentage.toFixed(2)),
        overall_grade:   overallGrade,
        result_status:   overallResultStatus,
        progress_remark: progressRemark,
        is_published:    true
      });
    });

    // Upsert student_results
    if (resultsToUpsert.length > 0) {
      const { error: resultsError } = await adminSupabase
        .from('student_results')
        .upsert(resultsToUpsert, { onConflict: 'student_id, subject_id' });

      if (resultsError) throw new Error(`Failed to upsert results: ${resultsError.message}`);
    }

    // Upsert result_summary
    if (summariesToUpsert.length > 0) {
      const { error: summaryError } = await adminSupabase
        .from('result_summary')
        .upsert(summariesToUpsert, { onConflict: 'student_id' });

      if (summaryError) throw new Error(`Failed to upsert summary: ${summaryError.message}`);
    }

    // Log the import
    await adminSupabase.from('csv_import_logs').insert({
      imported_by:      user.id,
      file_name:        'Admin API Upload',
      total_rows:       rows.length,
      success_rows:     studentsToUpsert.length,
      status:           'completed',
      import_type:      'results',
      academic_session: rows[0]?.Session || rows[0]?.academic_session || '2024-2025'
    });

    return NextResponse.json({
      success:      true,
      successCount: studentsToUpsert.length,
      errorCount:   0,
      message:      `Successfully imported ${studentsToUpsert.length} students with Maharashtra HSC format results.`
    }, { status: 200 });

  } catch (error: any) {
    console.error('CSV Import error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
