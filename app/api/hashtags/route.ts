import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/hashtags?centerId=uuid - Llistar hashtags d'un centre
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const centerId = searchParams.get('centerId');

  if (!centerId) {
    return NextResponse.json({ error: 'centerId és obligatori' }, { status: 400 });
  }

  const { data: hashtags, error } = await supabase
    .from('hashtags')
    .select('id, name')
    .eq('center_id', centerId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ hashtags: hashtags || [] });
}
