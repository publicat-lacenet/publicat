import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/zones - Llistar zones actives (tots els rols autenticats)
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { data: zones, error } = await supabase
    .from('zones')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ zones: zones || [] });
}
