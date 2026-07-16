import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { giNo, rollNo, fullName } = await req.json();

    if (!giNo || !rollNo || !fullName) {
      return NextResponse.json(
        { error: 'GR No, Roll No, and Full Name are required' },
        { status: 400 }
      );
    }

    // Find student by GR Number, Roll Number, and Name (case-insensitive)
    const { data: student, error } = await supabase
      .from('students')
      .select('id, student_name, gr_number, roll_number, admission_number, class, status')
      .eq('gr_number', giNo)
      .eq('roll_number', rollNo)
      .ilike('student_name', fullName)
      .single();

    if (error || !student) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please verify your details.' },
        { status: 401 }
      );
    }

    if (student.status !== 'active') {
      return NextResponse.json(
        { error: 'Student account is not active. Please contact administration.' },
        { status: 403 }
      );
    }

    // Check if a published result exists
    const { data: result } = await supabase
      .from('result_summary')
      .select('id, is_published')
      .eq('student_id', student.id)
      .single();

    // In production, enforce published check:
    // if (!result || !result.is_published) {
    //   return NextResponse.json({ error: 'Result has not been published yet.' }, { status: 403 });
    // }

    // Create encrypted session
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const sessionToken = await encrypt({
      studentId:       student.id,
      admissionNumber: student.admission_number
    });

    const cookieStore = await cookies();
    cookieStore.set('student_session', sessionToken, {
      expires,
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_type:  'student',
      action:      'student.login',
      entity_type: 'student',
      entity_id:   student.id,
      metadata:    { admissionNumber: student.admission_number }
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
