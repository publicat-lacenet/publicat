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

  // Only return hashtags that have at least 1 video linked
  const { data: hashtags, error } = await supabase
    .from('hashtags')
    .select('id, name, video_hashtags(video_id)')
    .eq('center_id', centerId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const used = (hashtags || [])
    .filter((h: any) => h.video_hashtags && h.video_hashtags.length > 0)
    .map(({ id, name }: any) => ({ id, name }));

  return NextResponse.json({ hashtags: used });
}
