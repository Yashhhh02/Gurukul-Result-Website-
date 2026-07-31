import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import QRCode from 'react-qr-code';
import PrintButton from '@/components/admin/PrintButton';

const SUBJECT_ORDER = [
  'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY',
  'CS1', 'CS2', 'COMPUTER_SCIENCE_I', 'COMPUTER_SCIENCE_II',
  'IT', 'INFORMATION_TECHNOLOGY', 'GEOGRAPHY', 'MARATHI', 'HINDI',
  'ENVSTUDIES', 'ENVIRONMENTAL_STUDIES', 'PE', 'PHYSICAL_EDUCATION'
];

function sortSubjects(results: any[]): any[] {
  return [...results].sort((a, b) => {
    const codeA = a.subjects?.subject_code || '';
    const codeB = b.subjects?.subject_code || '';
    const ia = SUBJECT_ORDER.indexOf(codeA);
    const ib = SUBJECT_ORDER.indexOf(codeB);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function formatDOB(dob: string): string {
  if (!dob) return '';
  const d = new Date(dob);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default async function PrintBatchPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const logId = params.id;

  const supabase = await createSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all students for this import_log_id
  const { data: students } = await adminSupabase
    .from('students')
    .select('*')
    .eq('import_log_id', logId)
    .order('student_name', { ascending: true });

  if (!students || students.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">No Students Found</h1>
        <p className="text-gray-500">There are no students associated with this specific import log.</p>
        <p className="text-sm mt-2">Log ID: {logId}</p>
      </div>
    );
  }

  const studentIds = students.map(s => s.id);

  const [summaryRes, resultsRes, settingsRes, sigsRes] = await Promise.all([
    adminSupabase.from('result_summary').select('*').in('student_id', studentIds),
    adminSupabase.from('student_results').select(`
      *,
      subjects (
        subject_name, subject_code,
        max_i_term, max_ii_term, max_ut1, max_ut2,
        passing_marks, is_graded_only, display_order
      )
    `).in('student_id', studentIds),
    adminSupabase.from('school_settings').select('*').eq('is_active', true).single(),
    adminSupabase.from('school_signatures').select('*').eq('is_active', true)
  ]);

  const allSummaries = summaryRes.data || [];
  const allResults = resultsRes.data || [];
  const schoolSettings = settingsRes.data || {};
  const signatures = sigsRes.data || [];

  const collegeReopensOn = schoolSettings.college_reopens_on
    ? new Date(schoolSettings.college_reopens_on).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '——';

  const principalSig    = signatures.find(s => s.signature_type === 'principal');
  const examInchargeSig = signatures.find(s => s.signature_type === 'exam_incharge');
  const classTeacherSig = signatures.find(s => s.signature_type === 'class_teacher');
  const schoolSeal      = signatures.find(s => s.signature_type === 'school_seal');

  const getSubjectName = (code: string, name: string) => {
    const map: Record<string, string> = {
      'CS1': 'COMPUTER SCIENCE - I',
      'CS2': 'COMPUTER SCIENCE - II',
      'ENVSTUDIES': 'ENVIRONMENTAL STUDIES',
      'PE': 'PHYSICAL EDUCATION',
      'MATHS': 'MATHEMATICS',
      'IT': 'INFORMATION TECHNOLOGY'
    };
    return map[code?.toUpperCase()] || name;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 py-4 px-2 print:p-0 flex flex-col items-center">
      
      {/* Top action bar - hidden during print */}
      <div className="w-full max-w-4xl bg-white dark:bg-slate-800 shadow-md rounded-xl p-4 mb-8 flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Batch Printing</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Showing {students.length} marksheets for import log {logId.substring(0, 8)}...</p>
        </div>
        <PrintButton />
      </div>

      {/* Render each student's marksheet */}
      <div className="w-full flex flex-col items-center gap-12 print:gap-0 print:block">
        {students.map((student, idx) => {
          const summaryData = allSummaries.find(s => s.student_id === student.id) || {};
          const subjectsData = allResults.filter(r => r.student_id === student.id);
          
          const sortedSubjects = sortSubjects(subjectsData);
          const numericSubjects = sortedSubjects.filter(s => !(s.is_graded_only || s.subjects?.is_graded_only));
          const gradedSubjects  = sortedSubjects.filter(s => s.is_graded_only || s.subjects?.is_graded_only);

          const is12th = student.class?.includes('12') || student.class?.toUpperCase().includes('XII');
          const isCSOrIT = student.subject_group === 'CS' || student.subject_group === 'IT';
          
          const grandTotal = numericSubjects.reduce((sum, s) => sum + (Number(s.grand_total) || 0), 0);
          const grandTotalPercentage = summaryData.percentage || 0;
          
          const maxPerSubject = isCSOrIT ? 100 : (is12th ? 100 : 200);
          const maxMarksTotal = numericSubjects.length * maxPerSubject;

          const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://result-portal-one.vercel.app'}/verify/${summaryData.result_id}`;

          return (
            <div 
              key={student.id} 
              className="relative w-full bg-white shadow-xl print:shadow-none print:w-full overflow-hidden print:break-after-page"
              style={{
                maxWidth: '210mm',
                maxHeight: '292mm',
                pageBreakAfter: 'always',
                pageBreakInside: 'avoid',
                border: '2px solid #8B0000',
                fontFamily: 'Arial, Helvetica, sans-serif', 
                fontSize: '10px'
              }}
            >
              {/* --- CENTER LOGO WATERMARK --- */}
              {schoolSettings.logo_url && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.06]">
                  <img src={schoolSettings.logo_url} alt="Watermark Logo" className="w-[400px] h-[400px] object-contain grayscale" />
                </div>
              )}
              {/* ------------------ */}

              {/* ═══════════════════════════════════════════════════
                  HEADER
              ═══════════════════════════════════════════════════ */}
              <div style={{ borderBottom: '1.5px solid #8B0000', padding: '6px 12px 5px' }}>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    {schoolSettings.logo_url ? (
                      <img src={schoolSettings.logo_url} alt="College Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                    ) : (
                      <div
                        style={{
                          width: '70px', height: '70px', borderRadius: '50%',
                          background: 'radial-gradient(circle, #FCD34D 0%, #F59E0B 40%, #B45309 70%, #8B0000 100%)',
                          border: '2px solid #8B0000',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: '1.2', padding: '6px'
                        }}
                      >
                        <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#000', textAlign: 'center' }}>
                          GURUKUL<br/>VIDYAPEETH
                        </span>
                      </div>
                    )}
                    <p style={{ fontSize: '8px', color: '#8B0000', fontWeight: '700', textAlign: 'center', marginTop: '4px' }}>
                      ॥ {schoolSettings.tagline} ॥
                    </p>
                  </div>

                  <div className="flex-1 text-center flex flex-col justify-center">
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#8B0000', marginBottom: '2px', fontStyle: 'italic', letterSpacing: '0.5px' }}>
                      {schoolSettings.trust_name}
                    </p>
                    <h1 style={{ 
                      fontSize: '34px', 
                      fontWeight: '900', 
                      color: '#8B0000', 
                      lineHeight: 1.1, 
                      marginBottom: '4px', 
                      letterSpacing: '8px',
                      fontFamily: '"Times New Roman", Times, serif',
                      textTransform: 'uppercase',
                      width: '100%',
                      textAlign: 'center'
                    }}>
                      {schoolSettings.school_name}
                    </h1>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#8B0000', marginBottom: '2px', letterSpacing: '4px', width: '100%', textAlign: 'center' }}>
                      ENGLISH HIGH SCHOOL &amp; JR. COLLEGE
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#8B0000', margin: '0', letterSpacing: '2px' }}>
                      {schoolSettings.board_name}
                    </p>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div style={{ padding: '3px', border: '1px solid #ccc', borderRadius: '4px', display: 'inline-block' }}>
                      <QRCode value={verifyUrl} size={52} />
                    </div>
                    <p style={{ fontSize: '7px', color: '#555', letterSpacing: '0.5px', textAlign: 'center', fontWeight: '700' }}>SCAN TO VERIFY</p>
                  </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', justifyItems: 'center', justifyContent: 'center', alignItems: 'center', marginTop: '2px', paddingTop: '2px', borderTop: '1px solid #8B0000' }}>
                  <p style={{ fontSize: '9px', fontWeight: '700', color: '#000', textAlign: 'center' }}>
                    {schoolSettings.college_type} / {schoolSettings.affiliation_number}
                  </p>
                  <p style={{ position: 'absolute', right: '0', fontSize: '9px', fontWeight: '800', color: '#8B0000' }}>
                    INDEX NO. {schoolSettings.index_number}
                  </p>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2px', paddingTop: '2px', borderTop: '1px solid #ccc' }}>
                  <p style={{ fontSize: '8px', color: '#222', fontWeight: '600' }}>
                    {schoolSettings.address_line1}, {schoolSettings.city}-{schoolSettings.pincode}.&nbsp;Mob.: {schoolSettings.contact_phone}
                  </p>
                  <p style={{ fontSize: '8px', color: '#222' }}>
                    Email: {schoolSettings.contact_email}&nbsp;&nbsp;Website: {schoolSettings.website}
                  </p>
                </div>
              </div>

              {/* ── MARK SHEET title ── */}
              <div style={{ textAlign: 'center', padding: '3px 0', borderBottom: '1.5px solid #8B0000' }}>
                <p style={{ fontSize: '12px', fontWeight: '900', color: '#8B0000', letterSpacing: '3px', textTransform: 'uppercase' }}>
                  MARK SHEET
                </p>
                <p style={{ fontSize: '10px', fontWeight: '700', color: '#000' }}>
                  {schoolSettings.current_session || student.academic_session}
                </p>
              </div>

              {/* ═══════════════════════════════════════════════════
                  STUDENT INFO TABLE
              ═══════════════════════════════════════════════════ */}
              <div style={{ padding: '0 8px', marginTop: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ border: '1px solid #555', padding: '2px 4px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>UNIQUE ID</th>
                      <th style={{ border: '1px solid #555', padding: '2px 4px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>STD - DIV</th>
                      <th style={{ border: '1px solid #555', padding: '2px 4px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>STREAM</th>
                      <th style={{ border: '1px solid #555', padding: '2px 4px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>ROLL NO</th>
                      <th style={{ border: '1px solid #555', padding: '2px 4px', textAlign: 'center', fontWeight: '700' }}>STUDENT'S NAME</th>
                      <th style={{ border: '1px solid #555', padding: '2px 4px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>DATE OF BIRTH</th>
                      <th style={{ border: '1px solid #555', padding: '2px 4px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>GR NO.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'center', fontWeight: '600' }}>{student.unique_id || '—'}</td>
                      <td style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'center', fontWeight: '600' }}>{student.class} {student.division}</td>
                      <td style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'center', fontWeight: '600' }}>{student.subject_group || '—'}</td>
                      <td style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'center', fontWeight: '600' }}>{student.roll_number || '—'}</td>
                      <td style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase' }}>{student.student_name}</td>
                      <td style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'center', fontWeight: '600' }}>{formatDOB(student.dob)}</td>
                      <td style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'center', fontWeight: '600' }}>{student.gr_number || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ═══════════════════════════════════════════════════
                  MARKS TABLE
              ═══════════════════════════════════════════════════ */}
              <div style={{ padding: '4px 8px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                      <th rowSpan={isCSOrIT ? 1 : 2} style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'left', fontWeight: '700', minWidth: '110px' }}>SUBJECTS</th>
                      {isCSOrIT ? (
                        <>
                          <th rowSpan={1} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '15%' }}>PRACTICAL<br/>(30/20/50)</th>
                          <th rowSpan={1} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '15%' }}>WRITTEN<br/>(70/50/80)</th>
                          <th rowSpan={1} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '15%' }}>TOTAL<br/>(100)</th>
                          <th rowSpan={1} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '15%' }}>COND.<br/>MARKS</th>
                        </>
                      ) : (
                        <>
                          <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '44px' }}>I TERM<br/>(A)</th>
                          {!is12th && <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '50px' }}>II TERM<br/>(B)</th>}
                          <th colSpan={2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700' }}>UNIT TESTS</th>
                          <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '44px' }}>TOTAL (C)<br/>(50)</th>
                          <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '50px' }}>{is12th ? 'GRAND TOTAL (100)' : 'GRAND TOTAL (A+B+C)'}</th>
                          {!is12th && <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '44px' }}>AVG<br/>(÷2)</th>}
                          <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '50px' }}>COND.<br/>MARKS</th>
                        </>
                      )}
                    </tr>
                    {!isCSOrIT && (
                      <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '36px' }}>I (25)</th>
                        <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', width: '36px' }}>II (25)</th>
                      </tr>
                    )}
                    <tr style={{ backgroundColor: '#fafafa' }}>
                      <td style={{ border: '1px solid #555', padding: '2px 4px', fontWeight: '700', fontSize: '8px', textAlign: 'right', color: '#555' }}>MAX. MARKS →</td>
                      {isCSOrIT ? (
                        <>
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>—</td>
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>—</td>
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>100</td>
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>—</td>
                        </>
                      ) : (
                        <>
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>50</td>
                          {!is12th && <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>100</td>}
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>25</td>
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>25</td>
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>50</td>
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>{is12th ? '100' : '200'}</td>
                          {!is12th && <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>100</td>}
                          <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', fontSize: '8px' }}>—</td>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {numericSubjects.map((subject: any, idx: number) => {
                      const sub = subject.subjects;
                      const iTermA    = subject.i_term_marks;
                      const iiTermB   = subject.ii_term_marks;
                      const ut1       = subject.unit_test_1;
                      const ut2       = subject.unit_test_2;
                      const totalC    = subject.total_c ?? (Number(ut1 || 0) + Number(ut2 || 0));
                      const grandTotR = subject.grand_total ?? (Number(iTermA || 0) + Number(iiTermB || 0) + Number(totalC));
                      const avgMarks  = subject.avg_marks ?? (grandTotR / 2);
                      const cond      = subject.condonation_marks;

                      const isAbsent = subject.is_absent;
                      const disp = (val: any) => isAbsent ? 'AB' : (val !== null && val !== undefined ? val : '—');

                      return (
                        <tr key={`numeric-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                          <td style={{ border: '1px solid #555', padding: '2px 4px', fontWeight: '600', textTransform: 'uppercase' }}>
                            {getSubjectName(sub?.subject_code, sub?.subject_name)}
                          </td>
                          {isCSOrIT ? (
                            <>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{disp(iTermA)}</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{disp(iiTermB)}</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700' }}>{disp(Number(iTermA||0) + Number(iiTermB||0))}</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{cond ?? '–'}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{disp(iTermA)}</td>
                              {!is12th && <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{disp(iiTermB)}</td>}
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{disp(ut1)}</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{disp(ut2)}</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{disp(totalC)}</td>
                              {is12th ? (
                                <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700' }}>{disp(Number(iTermA||0) + Number(totalC||0))}</td>
                              ) : (
                                <>
                                  <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700' }}>{disp(grandTotR)}</td>
                                  <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700' }}>{isAbsent ? 'AB' : avgMarks}</td>
                                </>
                              )}
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center' }}>{cond ?? '–'}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {gradedSubjects.map((subject: any, idx: number) => {
                      const sub   = subject.subjects;
                      const grade = subject.grade || 'A';
                      return (
                        <tr key={`graded-${idx}`} style={{ backgroundColor: (numericSubjects.length + idx) % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                          <td style={{ border: '1px solid #555', padding: '2px 4px', fontWeight: '600', textTransform: 'uppercase' }}>
                            {getSubjectName(sub?.subject_code, sub?.subject_name)}
                          </td>
                          {isCSOrIT ? (
                            <>
                              <td colSpan={2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '800', color: '#000', fontSize: '11px' }}>{grade}</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>
                            </>
                          ) : (
                            <>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>
                              {!is12th && <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>}
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>
                              {is12th ? (
                                <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '800', color: '#000', fontSize: '11px' }}>{grade}</td>
                              ) : (
                                <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>
                              )}
                              {!is12th && <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '800', color: '#000', fontSize: '11px' }}>{grade}</td>}
                              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', color: '#888' }}>–</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', fontWeight: '800' }}>
                      <td style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'right' }}>GRAND TOTAL</td>
                      {isCSOrIT ? (
                        <>
                          <td colSpan={2} style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center' }}></td>
                          <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center', fontSize: '11px' }}>
                            <strong>{grandTotal}</strong> / {maxMarksTotal}
                          </td>
                          <td style={{ border: '1px solid #555' }}></td>
                        </>
                      ) : (
                        <>
                          <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center' }}></td>
                          {!is12th && <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center' }}></td>}
                          <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center' }}></td>
                          <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center' }}></td>
                          <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center' }}></td>
                          {is12th ? (
                            <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center', fontSize: '11px' }}>
                              <strong>{grandTotal}</strong> / {maxMarksTotal}
                            </td>
                          ) : (
                            <>
                              <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center', fontSize: '11px' }}>
                                <strong>{grandTotal}</strong> / {maxMarksTotal}
                              </td>
                              <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center' }}></td>
                            </>
                          )}
                          <td style={{ border: '1px solid #555' }}></td>
                        </>
                      )}
                    </tr>
                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', fontWeight: '800' }}>
                      <td colSpan={isCSOrIT ? 3 : (is12th ? 5 : 6)} style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'right', fontWeight: '800', fontSize: '9px', textTransform: 'uppercase' }}>
                        PERCENTAGE (%)
                      </td>
                      <td style={{ border: '1px solid #555', padding: '3px 3px', textAlign: 'center', fontWeight: '900', fontSize: '10px' }}>
                        {grandTotalPercentage}%
                      </td>
                      <td colSpan={isCSOrIT ? 1 : (is12th ? 1 : 2)} style={{ border: '1px solid #555', padding: '3px 4px', textAlign: 'center' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ═══════════════════════════════════════════════════
                  PROGRESS / RESULT / COLLEGE REOPENS ROW
              ═══════════════════════════════════════════════════ */}
              <div style={{ padding: '0 8px', marginTop: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #555', padding: '3px 6px', fontWeight: '800', width: '33%' }}>
                        PROGRESS :– <span style={{ color: '#8B0000' }}>{summaryData.result_status === 'fail' ? 'NEED IMPROVEMENT' : (summaryData.progress_remark || 'PASS')}</span>
                      </td>
                      <td style={{ border: '1px solid #555', padding: '3px 6px', fontWeight: '800', textAlign: 'center', width: '34%' }}>
                        RESULT :–{' '}
                        {(() => {
                          const pct = parseFloat(summaryData.percentage || '0');
                          const status = summaryData.result_status;
                          const isPassed = status === 'pass' || (status !== 'fail' && pct >= 35);
                          return (
                            <span style={{ color: isPassed ? '#166534' : '#991b1b', fontWeight: '900' }}>
                              {isPassed ? (is12th ? 'PASSED' : 'PASSED & PROMOTED TO STD XII') : 'FAIL'}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ border: '1px solid #555', padding: '3px 6px', fontWeight: '800', textAlign: 'right', width: '33%' }}>
                        COLLEGE REOPENS ON :– <span style={{ color: '#8B0000' }}>{collegeReopensOn}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ═══════════════════════════════════════════════════
                  FOOTER — Signatures + Seal + QR
              ═══════════════════════════════════════════════════ */}
              <div style={{ padding: '6px 14px 10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '8px', color: '#444' }}>Place : {schoolSettings.result_issue_place || 'Thane'}</p>
                    <p style={{ fontSize: '8px', color: '#444' }}>
                      Date : {schoolSettings.result_issue_date 
                        ? new Date(schoolSettings.result_issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                        : summaryData.issue_date
                          ? new Date(summaryData.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                          : '—'}
                    </p>
                  </div>
                  <div style={{ fontSize: '8px', color: '#555' }}>
                    * In front of marks indicates FAILURE, AB- ABSENT
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', textAlign: 'center', alignItems: 'end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {classTeacherSig?.image_url && (
                      <img src={classTeacherSig.image_url} alt="Coordinator Signature" style={{ height: '50px', objectFit: 'contain', margin: '0 auto 2px' }} />
                    )}
                    <div style={{ borderTop: '1px solid #000', paddingTop: '3px', marginTop: classTeacherSig?.image_url ? '0' : '40px', width: '100%' }}>
                      <p style={{ fontSize: '9px', fontWeight: '700' }}>Coordinator</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {schoolSeal?.image_url ? (
                      <img src={schoolSeal.image_url} alt="College Stamp" style={{ height: '50px', objectFit: 'contain', margin: '0 auto 2px' }} />
                    ) : (
                      <div style={{ height: '50px', width: '100%', margin: '0 auto 2px' }}></div>
                    )}
                    <div style={{ borderTop: '1px solid #000', paddingTop: '3px', width: '100%' }}>
                      <p style={{ fontSize: '9px', fontWeight: '700' }}>College Stamp</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {examInchargeSig?.image_url && (
                      <img src={examInchargeSig.image_url} alt="Chairperson Signature" style={{ height: '45px', objectFit: 'contain', margin: '0 auto 2px' }} />
                    )}
                    <div style={{ borderTop: '1px solid #000', paddingTop: '3px', marginTop: examInchargeSig?.image_url ? '0' : '40px', width: '100%' }}>
                      <p style={{ fontSize: '9px', fontWeight: '700' }}>Chairperson</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {principalSig?.image_url && (
                      <img src={principalSig.image_url} alt="Principal Signature" style={{ height: '50px', objectFit: 'contain', margin: '0 auto 2px' }} />
                    )}
                    <div style={{ borderTop: '1px solid #000', paddingTop: '3px', marginTop: principalSig?.image_url ? '0' : '40px', width: '100%' }}>
                      <p style={{ fontSize: '9px', fontWeight: '700' }}>I/C Principal</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="no-print" style={{ textAlign: 'center', padding: '12px 0', borderTop: '1px dashed #e2e8f0', marginTop: '10px' }}>
                <p style={{ fontSize: '11px', color: '#999' }}>
                  Ref: {summaryData.result_id} &nbsp;|&nbsp; © {new Date().getFullYear()} Gurukul Vidyapeeth
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
