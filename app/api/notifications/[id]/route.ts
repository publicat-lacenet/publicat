import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/notifications/[id] - Marcar notificació com llegida
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id); // RLS extra: assegurar que és del propi usuari

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Notificació marcada com llegida' });
}

// DELETE /api/notifications/[id] - Eliminar notificació
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Notificació eliminada' });
}
