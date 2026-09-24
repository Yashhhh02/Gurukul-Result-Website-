import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ data: data || null });
  } catch (error: any) {
    console.error('Settings Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Fetch existing setting to see if we are updating or inserting
    const { data: existing } = await supabase.from('school_settings').select('id').limit(1).single();

    let result;

    if (existing) {
      // Update
      const { data: updated, error } = await supabase
        .from('school_settings')
        .update({
          school_name: data.school_name,
          school_code: data.school_code,
          affiliation_number: data.affiliation_number,
          index_number: data.index_number || data.school_code || 'J-16.14.086',
          college_type: data.college_type,
          board_name: data.board_name,
          address_line1: data.address_line1,
          address_line2: data.address_line2,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          contact_phone: data.contact_phone,
          contact_email: data.contact_email,
          website: data.website,
          result_issue_place: data.result_issue_place,
          result_issue_date: data.result_issue_date,
          current_session: data.current_session,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();
        
      if (error) throw error;
      result = updated;
    } else {
      // Insert new
      const { data: inserted, error } = await supabase
        .from('school_settings')
        .insert({
          school_name: data.school_name,
          school_code: data.school_code,
          affiliation_number: data.affiliation_number,
          index_number: data.index_number || data.school_code || 'J-16.14.086',
          college_type: data.college_type,
          board_name: data.board_name,
          address_line1: data.address_line1,
          address_line2: data.address_line2,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          contact_phone: data.contact_phone,
          contact_email: data.contact_email,
          website: data.website,
          result_issue_place: data.result_issue_place,
          result_issue_date: data.result_issue_date,
          current_session: data.current_session,
        })
        .select();

      if (error) throw error;
      result = inserted;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Settings Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
