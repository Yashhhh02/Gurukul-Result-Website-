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
      .from('school_signatures')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Signatures Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { signature_type, label, image_url } = await req.json();

    if (!signature_type || !label || !image_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upsert the signature using the unique signature_type constraint
    const { data, error } = await supabase
      .from('school_signatures')
      .upsert({
        signature_type,
        label,
        image_url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'signature_type' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Signature Upsert Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const signature_type = searchParams.get('type');

    if (!signature_type) {
      return NextResponse.json({ error: 'Signature type is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('school_signatures')
      .delete()
      .eq('signature_type', signature_type);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Signature Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
