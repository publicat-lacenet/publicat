import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/playlists/[id]/videos/[videoId] - Eliminar un vídeo de la llista
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const { id: playlistId, videoId } = await params;
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
  // editor_alumne només pot eliminar si is_student_editable = true
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

  // Obtenir l'item a eliminar
  const { data: itemToDelete, error: itemError } = await supabase
    .from('playlist_items')
    .select('*')
    .eq('playlist_id', playlistId)
    .eq('video_id', videoId)
    .single();

  if (itemError || !itemToDelete) {
    return NextResponse.json(
      { error: 'El vídeo no està a la llista' },
      { status: 404 }
    );
  }

  const deletedPosition = itemToDelete.position;

  // Eliminar l'item
  const { error: deleteError } = await supabase
    .from('playlist_items')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('video_id', videoId);

  if (deleteError) {
    console.error('Error removing video from playlist:', deleteError);
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  // Reordenar les posicions dels items restants
  // Els items amb posició > deletedPosition passen a position - 1
  const { error: reorderError } = await supabase.rpc('reorder_playlist_items_after_delete', {
    p_playlist_id: playlistId,
    p_deleted_position: deletedPosition,
  });

  // Si la funció RPC no existeix, fer-ho manualment
  if (reorderError && reorderError.message.includes('function')) {
    const { data: itemsToUpdate } = await supabase
      .from('playlist_items')
      .select('id, position')
      .eq('playlist_id', playlistId)
      .gt('position', deletedPosition)
      .order('position', { ascending: true });

    if (itemsToUpdate && itemsToUpdate.length > 0) {
      for (const item of itemsToUpdate) {
        await supabase
          .from('playlist_items')
          .update({ position: item.position - 1 })
          .eq('id', item.id);
      }
    }
  }

  // Actualitzar updated_at de la llista
  await supabase
    .from('playlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', playlistId);

  return NextResponse.json({
    message: 'Vídeo eliminat de la llista correctament',
  });
}
