import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Check if the user exists in our admin_users table and has the correct role.
    // We use the service role key here to bypass RLS because admin_users is protected.
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: adminUser, error: adminError } = await adminSupabase
      .from('admin_users')
      .select('role, is_active')
      .eq('email', email)
      .single();

    if (adminError || !adminUser || !adminUser.is_active) {
      // Sign out if they aren't an active admin
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Unauthorized access. You must be an active administrator.' },
        { status: 403 }
      );
    }

    // Log audit event
    await adminSupabase.from('audit_logs').insert({
      actor_id: data.user.id,
      actor_type: 'admin',
      action: 'admin.login',
    });

    return NextResponse.json({ success: true, role: adminUser.role }, { status: 200 });

  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
