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
  if (text !== undefined) updateData.text = text.trim();
  if (position !== undefined) updateData.position = position;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No hi ha dades per actualitzar' }, { status: 400 });
  }

  // Update message (RLS will ensure user can only update their center's messages)
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
    .select('center_id, position')
    .eq('id', id)
    .single();

  if (!message) {
    return NextResponse.json({ error: 'Missatge no trobat' }, { status: 404 });
  }

  // Count messages for this center
  const { count } = await supabase
    .from('ticker_messages')
    .select('*', { count: 'exact', head: true })
    .eq('center_id', message.center_id);

  // Don't allow deleting if it's the only message
  if (count && count <= 1) {
    return NextResponse.json(
      { error: 'No es pot eliminar l\'últim missatge. Sempre ha d\'haver-hi almenys un.' },
      { status: 400 }
    );
  }

  // Delete message (RLS will ensure user can only delete their center's messages)
  const { error } = await supabase
    .from('ticker_messages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting ticker message:', error);
    return NextResponse.json({ error: 'Error eliminant missatge' }, { status: 500 });
  }

  // Reorder remaining messages
  const { data: remainingMessages } = await supabase
    .from('ticker_messages')
    .select('id')
    .eq('center_id', message.center_id)
    .order('position', { ascending: true });

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
