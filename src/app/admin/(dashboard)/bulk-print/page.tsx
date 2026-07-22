export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import QRCode from 'react-qr-code';
import PrintButton from '@/components/admin/PrintButton';
import DownloadPdfButton from '@/components/admin/DownloadPdfButton';
import DownloadSinglePdfButton from '@/components/admin/DownloadSinglePdfButton';

// Subject display order
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

// Renders a single compact marksheet (designed at 210mm width, scaled down externally)
function Marksheet({ studentData, schoolSettings, classTeacherSig, schoolSeal, examInchargeSig, principalSig }: any) {
  const results = studentData.student_results || [];
  const sortedResults = sortSubjects(results);
  const numericSubjects = sortedResults.filter((r: any) => !r.is_graded_only);
  const gradedSubjects = sortedResults.filter((r: any) => r.is_graded_only);

  let grandTotal = 0;
  numericSubjects.forEach((s: any) => {
    const iTerm = Number(s.i_term_marks || 0);
    const iiTerm = Number(s.ii_term_marks || 0);
    const ut1 = Number(s.unit_test_1 || 0);
    const ut2 = Number(s.unit_test_2 || 0);
    const totalC = s.total_c ?? (ut1 + ut2);
    grandTotal += s.grand_total ?? (iTerm + iiTerm + totalC);
  });

  const is12th = studentData.class?.includes('XII') || studentData.class?.includes('12');
  const isCSOrIT = studentData.subject_group === 'CS' || studentData.subject_group === 'IT';
  const maxMarksNumeric = isCSOrIT ? 100 : (is12th ? 100 : 200);
  const maxMarksTotal = numericSubjects.length * maxMarksNumeric;
  const percentage = maxMarksTotal > 0 ? ((grandTotal / maxMarksTotal) * 100).toFixed(2) : '0.00';
  const resultId = studentData.result_summary?.[0]?.result_id || studentData.id;
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://result-portal-one.vercel.app'}/verify/${resultId}`;

  return (
    <div style={{
      width: '210mm',
      backgroundColor: '#fff',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
      color: '#000',
      border: '2px solid #8B0000',
    }}>
      {/* LOGO WATERMARK */}
      {schoolSettings.logo_url && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0, opacity: 0.06 }}>
          <img src={schoolSettings.logo_url} alt="Watermark" style={{ width: '380px', height: '380px', objectFit: 'contain', filter: 'grayscale(100%)' }} />
        </div>
      )}

      {/* HEADER */}
      <div style={{ borderBottom: '1.5px solid #8B0000', padding: '5px 10px 4px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {schoolSettings.logo_url ? (
              <img src={schoolSettings.logo_url} alt="Logo" style={{ width: '62px', height: '62px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '62px', height: '62px', borderRadius: '50%', background: 'radial-gradient(circle, #FCD34D 0%, #F59E0B 40%, #B45309 70%, #8B0000 100%)', border: '2px solid #8B0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#000', textAlign: 'center' }}>GURUKUL<br/>VIDYAPEETH</span>
              </div>
            )}
            <p style={{ fontSize: '7px', color: '#8B0000', fontWeight: '700', textAlign: 'center', margin: '3px 0 0' }}>॥ {schoolSettings.tagline} ॥</p>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#8B0000', margin: '0 0 1px', fontStyle: 'italic' }}>{schoolSettings.trust_name}</p>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#8B0000', lineHeight: 1.1, margin: '0 0 2px', letterSpacing: '6px', fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', textAlign: 'center' }}>{schoolSettings.school_name}</h1>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#8B0000', margin: '0 0 1px', letterSpacing: '3px' }}>ENGLISH HIGH SCHOOL &amp; JR. COLLEGE</p>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#8B0000', margin: 0, letterSpacing: '2px' }}>{schoolSettings.board_name}</p>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ padding: '2px', border: '1px solid #ccc', borderRadius: '3px' }}>
              <QRCode value={verifyUrl} size={44} />
            </div>
            <p style={{ fontSize: '6px', color: '#555', textAlign: 'center', fontWeight: '700' }}>SCAN TO VERIFY</p>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2px', paddingTop: '2px', borderTop: '1px solid #8B0000' }}>
          <p style={{ fontSize: '8px', fontWeight: '700', color: '#000', textAlign: 'center', margin: 0 }}>{schoolSettings.college_type} / {schoolSettings.affiliation_number}</p>
          <p style={{ position: 'absolute', right: 0, fontSize: '8px', fontWeight: '800', color: '#8B0000', margin: 0 }}>INDEX NO. {schoolSettings.index_number}</p>
        </div>
        <div style={{ textAlign: 'center', marginTop: '2px', paddingTop: '2px', borderTop: '1px solid #ccc' }}>
          <p style={{ fontSize: '8px', color: '#000', fontWeight: '700', margin: '0 0 1px' }}>{schoolSettings.address_line1}, {schoolSettings.city}-{schoolSettings.pincode}. <span style={{ color: '#8B0000' }}>Mob.:</span> {schoolSettings.contact_phone}</p>
          <p style={{ fontSize: '8px', color: '#000', fontWeight: '700', margin: 0 }}><span style={{ color: '#8B0000' }}>Email:</span> {schoolSettings.contact_email} &nbsp; <span style={{ color: '#8B0000' }}>Website:</span> {schoolSettings.website}</p>
        </div>
      </div>

      {/* STUDENT INFO */}
      <div style={{ padding: '4px 8px 3px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: '800', margin: 0, color: '#8B0000', textTransform: 'uppercase' }}>STATEMENT OF MARKS</h2>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#222', backgroundColor: '#f0f0f0', padding: '1px 7px', borderRadius: '10px', border: '1px solid #ddd' }}>ACADEMIC SESSION: {studentData.academic_session}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '4px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>UNIQUE ID</th>
              <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>STD - DIV</th>
              <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>STREAM</th>
              <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>ROLL NO</th>
              <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700' }}>STUDENT'S NAME</th>
              <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>DATE OF BIRTH</th>
              <th style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>GR NO.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '600' }}>{studentData.unique_id || '—'}</td>
              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '600' }}>{studentData.class} {studentData.division}</td>
              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '600' }}>{studentData.subject_group || '—'}</td>
              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '600' }}>{studentData.roll_number || '—'}</td>
              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase' }}>{studentData.student_name}</td>
              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '600' }}>{formatDOB(studentData.dob)}</td>
              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'center', fontWeight: '600' }}>{studentData.gr_number || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* MARKS TABLE */}
      <div style={{ padding: '0 8px', position: 'relative', zIndex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th rowSpan={isCSOrIT ? 1 : 2} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'left', fontWeight: '700', minWidth: '100px' }}>SUBJECTS</th>
              {isCSOrIT ? (
                <>
                  <th style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '15%' }}>PRACTICAL<br/>(30/20/50)</th>
                  <th style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '15%' }}>WRITTEN<br/>(70/50/80)</th>
                  <th style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '15%' }}>TOTAL<br/>(100)</th>
                  <th style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '12%' }}>COND.</th>
                </>
              ) : (
                <>
                  <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '10%' }}>I TERM (A)</th>
                  {!is12th && <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '10%' }}>II TERM (B)</th>}
                  <th colSpan={2} style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700' }}>UNIT TESTS</th>
                  <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '10%' }}>TOTAL C (50)</th>
                  <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '12%' }}>{is12th ? 'TOTAL (100)' : 'GRAND TOTAL'}</th>
                  {!is12th && <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '10%' }}>AVG (÷2)</th>}
                  <th rowSpan={2} style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700', width: '10%' }}>COND.</th>
                </>
              )}
            </tr>
            {!isCSOrIT && (
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700' }}>I (25)</th>
                <th style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '700' }}>II (25)</th>
              </tr>
            )}
            <tr style={{ backgroundColor: '#fafafa' }}>
              <td style={{ border: '1px solid #555', padding: '1px 3px', fontWeight: '700', fontSize: '7px', textAlign: 'right', color: '#555' }}>MAX. MARKS →</td>
              {isCSOrIT ? (
                <>
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>—</td>
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>—</td>
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>100</td>
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>—</td>
                </>
              ) : (
                <>
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>50</td>
                  {!is12th && <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>100</td>}
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>25</td>
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>25</td>
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>50</td>
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>{is12th ? '100' : '200'}</td>
                  {!is12th && <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>100</td>}
                  <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700', fontSize: '7px' }}>—</td>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {numericSubjects.map((subject: any, idx: number) => {
              const sub = subject.subjects;
              const iTermA = subject.i_term_marks;
              const iiTermB = subject.ii_term_marks;
              const ut1 = subject.unit_test_1;
              const ut2 = subject.unit_test_2;
              const totalC = subject.total_c ?? (Number(ut1 || 0) + Number(ut2 || 0));
              const grandTotR = subject.grand_total ?? (Number(iTermA || 0) + Number(iiTermB || 0) + Number(totalC));
              const avgMarks = subject.avg_marks ?? (grandTotR / 2);
              const cond = subject.condonation_marks;
              const isAbsent = subject.is_absent;
              const disp = (val: any) => isAbsent ? 'AB' : (val !== null && val !== undefined ? val : '—');
              return (
                <tr key={`n-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                  <td style={{ border: '1px solid #555', padding: '1px 3px', fontWeight: '600', textTransform: 'uppercase', fontSize: '8px' }}>{(sub?.subject_name || '').toUpperCase()}</td>
                  {isCSOrIT ? (
                    <>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{disp(iTermA)}</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{disp(iiTermB)}</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700' }}>{disp(Number(iTermA || 0) + Number(iiTermB || 0))}</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{cond ?? '–'}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{disp(iTermA)}</td>
                      {!is12th && <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{disp(iiTermB)}</td>}
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{disp(ut1)}</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{disp(ut2)}</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{disp(totalC)}</td>
                      {is12th ? (
                        <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700' }}>{disp(Number(iTermA || 0) + Number(totalC || 0))}</td>
                      ) : (
                        <>
                          <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700' }}>{disp(grandTotR)}</td>
                          <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '700' }}>{isAbsent ? 'AB' : avgMarks}</td>
                        </>
                      )}
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center' }}>{cond ?? '–'}</td>
                    </>
                  )}
                </tr>
              );
            })}
            {gradedSubjects.map((subject: any, idx: number) => {
              const sub = subject.subjects;
              const grade = subject.grade || 'A';
              return (
                <tr key={`g-${idx}`} style={{ backgroundColor: (numericSubjects.length + idx) % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                  <td style={{ border: '1px solid #555', padding: '1px 3px', fontWeight: '600', textTransform: 'uppercase', fontSize: '8px' }}>{(sub?.subject_name || '').toUpperCase()}</td>
                  {isCSOrIT ? (
                    <>
                      <td colSpan={2} style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '800' }}>{grade}</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>
                    </>
                  ) : (
                    <>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>
                      {!is12th && <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>}
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>
                      {is12th ? (
                        <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '800' }}>{grade}</td>
                      ) : (
                        <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>
                      )}
                      {!is12th && <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', fontWeight: '800' }}>{grade}</td>}
                      <td style={{ border: '1px solid #555', padding: '1px 2px', textAlign: 'center', color: '#888' }}>–</td>
                    </>
                  )}
                </tr>
              );
            })}
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', fontWeight: '800' }}>
              <td style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'right', fontSize: '8px' }}>GRAND TOTAL</td>
              {isCSOrIT ? (
                <>
                  <td colSpan={2} style={{ border: '1px solid #555' }}></td>
                  <td style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center' }}><strong>{grandTotal}</strong> / {maxMarksTotal}</td>
                  <td style={{ border: '1px solid #555' }}></td>
                </>
              ) : (
                <>
                  <td style={{ border: '1px solid #555' }}></td>
                  {!is12th && <td style={{ border: '1px solid #555' }}></td>}
                  <td style={{ border: '1px solid #555' }}></td>
                  <td style={{ border: '1px solid #555' }}></td>
                  <td style={{ border: '1px solid #555' }}></td>
                  {is12th ? (
                    <td style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center' }}><strong>{grandTotal}</strong> / {maxMarksTotal}</td>
                  ) : (
                    <>
                      <td style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center' }}><strong>{grandTotal}</strong> / {maxMarksTotal}</td>
                      <td style={{ border: '1px solid #555' }}></td>
                    </>
                  )}
                  <td style={{ border: '1px solid #555' }}></td>
                </>
              )}
            </tr>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
              <td colSpan={isCSOrIT ? 3 : (is12th ? 5 : 6)} style={{ border: '1px solid #555', padding: '2px 3px', textAlign: 'right', fontWeight: '800', fontSize: '8px' }}>PERCENTAGE (%)</td>
              <td colSpan={isCSOrIT ? 2 : (is12th ? 2 : 3)} style={{ border: '1px solid #555', padding: '2px 2px', textAlign: 'center', fontWeight: '800' }}>{percentage}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RESULT */}
      <div style={{ padding: '2px 8px 0', position: 'relative', zIndex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
          <tbody>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <td style={{ border: '1px solid #555', padding: '2px 5px', fontWeight: '700', width: '67%' }}>
                RESULT :–{' '}
                <span style={{ color: parseFloat(percentage) >= 35 ? '#166534' : '#991b1b', fontWeight: '900' }}>
                  {parseFloat(percentage) >= 35 ? (is12th ? 'PASSED' : 'PASSED & PROMOTED TO STD XII') : 'FAIL'}
                </span>
              </td>
              <td style={{ border: '1px solid #555', padding: '2px 5px', fontWeight: '800', textAlign: 'right', width: '33%' }}>
                COLLEGE REOPENS ON :– <span style={{ color: '#8B0000' }}>{schoolSettings.college_reopens_on ? new Date(schoolSettings.college_reopens_on).toLocaleDateString('en-IN') : '—'}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div style={{ padding: '4px 12px 8px', marginTop: '2px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <p style={{ fontSize: '7px', color: '#444', margin: '0 0 1px' }}>Place : {schoolSettings.result_issue_place || 'Thane'}</p>
            <p style={{ fontSize: '7px', color: '#444', margin: 0 }}>
              Date : {schoolSettings.result_issue_date ? new Date(schoolSettings.result_issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '—'}
            </p>
          </div>
          <div style={{ fontSize: '7px', color: '#555' }}>* In front of marks indicates FAILURE, AB- ABSENT</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', textAlign: 'center', alignItems: 'end' }}>
          {[
            { sig: classTeacherSig, label: 'Coordinator' },
            { sig: schoolSeal, label: 'College Stamp' },
            { sig: examInchargeSig, label: 'Chairperson' },
            { sig: principalSig, label: 'I/C Principal' },
          ].map(({ sig, label }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {sig?.image_url ? (
                <img src={sig.image_url} alt={label} style={{ height: '40px', objectFit: 'contain', margin: '0 auto 2px' }} />
              ) : (
                <div style={{ height: '40px' }} />
              )}
              <div style={{ borderTop: '1px solid #000', paddingTop: '2px', width: '100%' }}>
                <p style={{ fontSize: '8px', fontWeight: '700', margin: 0 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function BulkPrintPage({ searchParams }: { searchParams: Promise<{ stream?: string; pdf?: string; studentId?: string }> }) {
  const params = await searchParams;
  const stream = params?.stream || '';
  const isPdfMode = params?.pdf === '1';
  const studentId = params?.studentId || '';

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!stream) {
    return (
      <div style={{ padding: '32px', maxWidth: '480px', margin: '40px auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>Bulk Print Marksheets</h1>
        <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>Select a stream to generate <strong>2 marksheets per A4 page</strong> for all active students.</p>
        <form style={{ display: 'flex', gap: '12px' }}>
          <select name="stream" style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
            <option value="">Select Stream</option>
            <option value="CS">Computer Science (CS)</option>
            <option value="IT">Information Technology (IT)</option>
            <option value="PCB">PCB</option>
            <option value="PCM">PCM</option>
            <option value="PCMB">PCMB</option>
          </select>
          <button type="submit" style={{ padding: '8px 20px', background: '#7f1d1d', color: '#fff', borderRadius: '6px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
            Generate
          </button>
        </form>
      </div>
    );
  }

  const { data: settingsData } = await supabaseAdmin.from('school_settings').select('*').eq('is_active', true).single();
  const schoolSettings = settingsData || {};
  const { data: sigs } = await supabaseAdmin.from('school_signatures').select('*');
  const classTeacherSig = sigs?.find((s: any) => s.signature_type === 'class_teacher');
  const schoolSeal = sigs?.find((s: any) => s.signature_type === 'school_seal');
  const examInchargeSig = sigs?.find((s: any) => s.signature_type === 'exam_incharge');
  const principalSig = sigs?.find((s: any) => s.signature_type === 'principal');

  const query = supabaseAdmin
    .from('students')
    .select('*, student_results(*, subjects(*)), result_summary(*)')
    .eq('status', 'active')
    .order('roll_number', { ascending: true });

  if (studentId) {
    query.eq('id', studentId);
  } else {
    query.eq('subject_group', stream);
  }

  const { data: studentsData, error: studErr } = await query;

  if (studErr || !studentsData || studentsData.length === 0) {
    return (
      <div style={{ padding: '32px' }}>
        <h1 style={{ color: '#dc2626', fontWeight: '700', fontSize: '22px' }}>No students found for stream: {stream}</h1>
        <a href="/admin/bulk-print" style={{ color: '#2563eb', textDecoration: 'underline', display: 'inline-block', marginTop: '12px' }}>← Go back</a>
      </div>
    );
  }

  const marksheetProps = { schoolSettings, classTeacherSig, schoolSeal, examInchargeSig, principalSig };

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh' }}>
      {/* ── Top bar (hidden in print and pdf-mode) ── */}
      {!isPdfMode && (
      <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Bulk Print: {stream} — {studentsData.length} students</h1>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>Click "Print All" and select "Save as PDF" to save all marksheets</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/admin/bulk-print" style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', borderRadius: '6px', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>← Back</a>
          <PrintButton />
        </div>
      </div>
      )}

      {/* ── Print CSS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, aside, header { display: none !important; }
          * { box-sizing: border-box !important; }
          
          /* Reset layout containers so they don't clip content during print */
          html, body { height: auto !important; overflow: visible !important; background: white !important; margin: 0 !important; padding: 0 !important; }
          .h-screen, .overflow-hidden, .overflow-y-auto { height: auto !important; overflow: visible !important; }
          main { padding: 0 !important; display: block !important; }

          .marksheet-wrapper {
            width: 210mm;
            height: 296mm;
            overflow: hidden;
            page-break-inside: avoid;
            page-break-after: always;
            break-after: page;
            display: flex;
            align-items: flex-start;
            margin: 0 !important;
            padding: 0 !important;
          }
          .marksheet-wrapper:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .marksheet-page {
            width: 210mm !important;
            transform-origin: top left;
          }
          @page { margin: 0; size: A4 portrait; }
        }
        @media screen {
          .marksheet-wrapper {
            width: 210mm;
            margin: 24px auto;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          }
          .marksheet-page {
            width: 210mm;
            display: block;
          }
        }
      `}} />

      {/* ── One marksheet per student ── */}
      <div style={{ padding: isPdfMode ? '0' : '24px 0', display: 'flex', flexDirection: 'column', gap: isPdfMode ? '0' : '60px' }}>
        {studentsData.map((studentData: any) => (
          <div key={studentData.id} className="marksheet-wrapper" style={{ position: 'relative' }}>
            {!isPdfMode && (
              <DownloadSinglePdfButton 
                studentId={studentData.id} 
                stream={stream} 
                studentName={studentData.student_name}
              />
            )}
            <div className="marksheet-page">
              <Marksheet studentData={studentData} {...marksheetProps} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
