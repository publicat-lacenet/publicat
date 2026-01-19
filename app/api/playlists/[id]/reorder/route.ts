import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/playlists/[id]/reorder - Reordenar els vídeos de la llista
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;
  const supabase = await createClient();

  // Verificar autenticació
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  // Obtenir dades de l'usuari de la BD
  const { data: dbUser } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single();

  const role = dbUser?.role || user.user_metadata?.role;
  const userCenterId = dbUser?.center_id || user.user_metadata?.center_id;

  // Obtenir la llista
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .eq('is_active', true)
    .single();

  if (playlistError || !playlist) {
    return NextResponse.json(
      { error: 'Llista no trobada' },
      { status: 404 }
    );
  }

  // Verificar permisos
  // editor_alumne només pot reordenar si is_student_editable = true
  if (role === 'editor_alumne' && !playlist.is_student_editable) {
    return NextResponse.json(
      { error: 'No tens permisos per editar aquesta llista' },
      { status: 403 }
    );
  }

  // editor_profe només pot editar llistes del seu centre
  if (role === 'editor_profe' && playlist.center_id !== userCenterId) {
    return NextResponse.json(
      { error: 'No tens permisos per editar aquesta llista' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: 'Cal especificar els items amb les noves posicions' },
      { status: 400 }
    );
  }

  // Validar que les posicions són consecutives (0, 1, 2, ...)
  const positions = items.map((item: { id: string; position: number }) => item.position).sort((a: number, b: number) => a - b);
  const isConsecutive = positions.every((pos: number, index: number) => pos === index);

  if (!isConsecutive) {
    return NextResponse.json(
      { error: 'Les posicions han de ser consecutives (0, 1, 2, ...)' },
      { status: 400 }
    );
  }

  // Actualitzar les posicions en una transacció
  // Com que Supabase no té transaccions natives via API, fem servir un enfocament de dos passos:
  // 1. Primer posem posicions temporals (negatives) per evitar conflictes de UNIQUE
  // 2. Després posem les posicions definitives

  // Pas 1: Posar posicions temporals negatives
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { error } = await supabase
      .from('playlist_items')
      .update({ position: -(i + 1000) }) // Posició temporal negativa
      .eq('id', item.id)
      .eq('playlist_id', playlistId);

    if (error) {
      console.error('Error updating temporary position:', error);
      // Intentar revertir és complex, així que continuem
    }
  }

  // Pas 2: Posar posicions definitives
  let updateErrors = [];
  for (const item of items) {
    const { error } = await supabase
      .from('playlist_items')
      .update({ position: item.position })
      .eq('id', item.id)
      .eq('playlist_id', playlistId);

    if (error) {
      console.error('Error updating final position:', error);
      updateErrors.push(error.message);
    }
  }

  if (updateErrors.length > 0) {
    return NextResponse.json(
      { error: 'Error al actualitzar algunes posicions', details: updateErrors },
      { status: 500 }
    );
  }

  // Actualitzar updated_at de la llista
  await supabase
    .from('playlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', playlistId);

  return NextResponse.json({
    message: 'Ordre actualitzat correctament',
  });
}
