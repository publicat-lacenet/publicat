import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/notifications - Llista notificacions de l'usuari actual
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const type = searchParams.get('type');

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (type) {
    query = query.eq('type', type);
  }

  const { data: notifications, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unreadCount = (notifications || []).filter(n => !n.is_read).length;

  return NextResponse.json({
    notifications: notifications || [],
    unread_count: unreadCount,
  });
}
