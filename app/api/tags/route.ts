import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/tags - Llistar tags actius (tots els rols autenticats)
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { data: tags, error } = await supabase
    .from('tags')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tags: tags || [] });
}
