import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  // Get user data to check role
  const { data: userData } = await supabase
    .from('users')
    .select('center_id, role')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'Usuari no trobat' }, { status: 404 });
  }

  // Only editors can update messages
  if (!['editor_profe', 'admin_global'].includes(userData.role)) {
    return NextResponse.json({ error: 'No tens permisos' }, { status: 403 });
  }

  const body = await request.json();
  const { text, position, is_active } = body;

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (text !== undefined) {
    if (!text.trim()) {
      return NextResponse.json({ error: 'El text és obligatori' }, { status: 400 });
    }
    updateData.text = text.trim();
  }
  if (position !== undefined) updateData.position = position;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No hi ha dades per actualitzar' }, { status: 400 });
  }

  const { data: existingMessage } = await supabase
    .from('ticker_messages')
    .select('center_id')
    .eq('id', id)
    .single();

  if (!existingMessage) {
    return NextResponse.json({ error: 'Missatge no trobat' }, { status: 404 });
  }

  if (userData.role !== 'admin_global' && existingMessage.center_id !== userData.center_id) {
    return NextResponse.json({ error: 'No tens permisos per aquest centre' }, { status: 403 });
  }

  // Update message
  const { data: message, error } = await supabase
    .from('ticker_messages')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating ticker message:', error);
    return NextResponse.json({ error: 'Error actualitzant missatge' }, { status: 500 });
  }

  if (!message) {
    return NextResponse.json({ error: 'Missatge no trobat' }, { status: 404 });
  }

  return NextResponse.json({ message });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  // Get user data to check role
  const { data: userData } = await supabase
    .from('users')
    .select('center_id, role')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'Usuari no trobat' }, { status: 404 });
  }

  // Only editors can delete messages
  if (!['editor_profe', 'admin_global'].includes(userData.role)) {
    return NextResponse.json({ error: 'No tens permisos' }, { status: 403 });
  }

  // Get the message to check if it's the first one
  const { data: message } = await supabase
    .from('ticker_messages')
    .select('center_id, playlist_id, position')
    .eq('id', id)
    .single();

  if (!message) {
    return NextResponse.json({ error: 'Missatge no trobat' }, { status: 404 });
  }

  if (userData.role !== 'admin_global' && message.center_id !== userData.center_id) {
    return NextResponse.json({ error: 'No tens permisos per aquest centre' }, { status: 403 });
  }

  let countQuery = supabase
    .from('ticker_messages')
    .select('*', { count: 'exact', head: true })
    .eq('center_id', message.center_id)
    .eq('is_active', true);

  countQuery = message.playlist_id
    ? countQuery.eq('playlist_id', message.playlist_id)
    : countQuery.is('playlist_id', null);

  const { count } = await countQuery;

  // Don't allow deleting the last general fallback message.
  if (!message.playlist_id && count && count <= 1) {
    return NextResponse.json(
      { error: 'No es pot eliminar l\'últim missatge. Sempre ha d\'haver-hi almenys un.' },
      { status: 400 }
    );
  }

  // Delete message
  const { error } = await supabase
    .from('ticker_messages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting ticker message:', error);
    return NextResponse.json({ error: 'Error eliminant missatge' }, { status: 500 });
  }

  // Reorder remaining messages in the same scope
  let remainingQuery = supabase
    .from('ticker_messages')
    .select('id')
    .eq('center_id', message.center_id)
    .eq('is_active', true)
    .order('position', { ascending: true });

  remainingQuery = message.playlist_id
    ? remainingQuery.eq('playlist_id', message.playlist_id)
    : remainingQuery.is('playlist_id', null);

  const { data: remainingMessages } = await remainingQuery;

  if (remainingMessages) {
    for (let i = 0; i < remainingMessages.length; i++) {
      await supabase
        .from('ticker_messages')
        .update({ position: i })
        .eq('id', remainingMessages[i].id);
    }
  }

  return NextResponse.json({ success: true });
}
