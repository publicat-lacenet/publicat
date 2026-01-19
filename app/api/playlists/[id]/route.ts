import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/playlists/[id] - Obtenir detalls d'una llista amb els seus vídeos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .select(`
      *,
      centers (
        id,
        name,
        zones (
          id,
          name
        )
      ),
      created_by:created_by_user_id (
        id,
        full_name
      )
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (playlistError || !playlist) {
    return NextResponse.json(
      { error: 'Llista no trobada' },
      { status: 404 }
    );
  }

  // Verificar accés: l'usuari pot veure la llista si:
  // - És admin_global
  // - La llista és del seu centre
  // - La llista és global (center_id = null)
  const canAccess =
    role === 'admin_global' ||
    playlist.center_id === userCenterId ||
    playlist.center_id === null;

  if (!canAccess) {
    return NextResponse.json(
      { error: 'No tens accés a aquesta llista' },
      { status: 403 }
    );
  }

  // Obtenir els items de la llista amb els vídeos
  const { data: items, error: itemsError } = await supabase
    .from('playlist_items')
    .select(`
      *,
      video:videos (
        id,
        title,
        description,
        thumbnail_url,
        duration_seconds,
        type,
        status,
        vimeo_url,
        centers (
          id,
          name,
          zones (
            id,
            name
          )
        ),
        video_tags (
          tags (
            id,
            name
          )
        )
      ),
      added_by:added_by_user_id (
        id,
        full_name
      )
    `)
    .eq('playlist_id', id)
    .order('position', { ascending: true });

  if (itemsError) {
    console.error('Error fetching playlist items:', itemsError);
    return NextResponse.json(
      { error: itemsError.message },
      { status: 500 }
    );
  }

  // Filtrar items amb vídeos actius i publicats
  const filteredItems = (items || []).filter(
    (item) => item.video && item.video.status === 'published'
  );

  return NextResponse.json({
    playlist,
    items: filteredItems,
  });
}

// PATCH /api/playlists/[id] - Actualitzar metadades de la llista
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // editor_alumne NO pot editar metadades de llistes
  if (role === 'editor_alumne') {
    return NextResponse.json(
      { error: 'No tens permisos per editar aquesta llista' },
      { status: 403 }
    );
  }

  // Obtenir la llista actual
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (playlistError || !playlist) {
    return NextResponse.json(
      { error: 'Llista no trobada' },
      { status: 404 }
    );
  }

  // Verificar permisos
  const canEdit =
    role === 'admin_global' ||
    (role === 'editor_profe' && playlist.center_id === userCenterId);

  if (!canEdit) {
    return NextResponse.json(
      { error: 'No tens permisos per editar aquesta llista' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, is_student_editable } = body;

  // Construir objecte d'actualització
  const updates: any = {};
  if (name !== undefined && name.trim() !== '') {
    updates.name = name.trim();
  }
  if (is_student_editable !== undefined) {
    updates.is_student_editable = is_student_editable;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No hi ha res a actualitzar' },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data: updatedPlaylist, error: updateError } = await supabase
    .from('playlists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating playlist:', updateError);
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    playlist: updatedPlaylist,
    message: 'Llista actualitzada correctament',
  });
}

// DELETE /api/playlists/[id] - Eliminar llista personalitzada
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // editor_alumne NO pot eliminar llistes
  if (role === 'editor_alumne') {
    return NextResponse.json(
      { error: 'No tens permisos per eliminar llistes' },
      { status: 403 }
    );
  }

  // Obtenir la llista
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (playlistError || !playlist) {
    return NextResponse.json(
      { error: 'Llista no trobada' },
      { status: 404 }
    );
  }

  // Verificar que la llista es pot eliminar
  if (!playlist.is_deletable) {
    return NextResponse.json(
      { error: 'Aquesta llista no es pot eliminar' },
      { status: 400 }
    );
  }

  // Verificar permisos
  const canDelete =
    role === 'admin_global' ||
    (role === 'editor_profe' && playlist.center_id === userCenterId);

  if (!canDelete) {
    return NextResponse.json(
      { error: 'No tens permisos per eliminar aquesta llista' },
      { status: 403 }
    );
  }

  // Soft delete: marcar com inactiva
  const { error: deleteError } = await supabase
    .from('playlists')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting playlist:', deleteError);
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Llista eliminada correctament',
  });
}
