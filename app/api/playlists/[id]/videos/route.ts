import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/playlists/[id]/videos - Afegir vídeos a una llista
export async function POST(
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
  // editor_alumne només pot afegir si is_student_editable = true
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
  const { video_ids } = body;

  if (!video_ids || !Array.isArray(video_ids) || video_ids.length === 0) {
    return NextResponse.json(
      { error: 'Cal especificar almenys un vídeo' },
      { status: 400 }
    );
  }

  // Validació especial per llista Anuncis
  if (playlist.kind === 'announcements') {
    // Verificar que tots els vídeos són de tipus 'announcement'
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, type, title')
      .in('id', video_ids);

    if (videosError) {
      return NextResponse.json(
        { error: 'Error al verificar els vídeos' },
        { status: 500 }
      );
    }

    const nonAnnouncementVideos = videos?.filter(v => v.type !== 'announcement') || [];
    if (nonAnnouncementVideos.length > 0) {
      return NextResponse.json(
        {
          error: 'Aquesta llista només accepta vídeos de tipus Anunci',
          invalid_videos: nonAnnouncementVideos.map(v => v.title)
        },
        { status: 400 }
      );
    }
  }

  // Validació especial per llista Global
  if (playlist.kind === 'global') {
    // Verificar que tots els vídeos estan compartits amb altres centres
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, is_shared_with_other_centers, title')
      .in('id', video_ids);

    if (videosError) {
      return NextResponse.json(
        { error: 'Error al verificar els vídeos' },
        { status: 500 }
      );
    }

    const nonSharedVideos = videos?.filter(v => !v.is_shared_with_other_centers) || [];
    if (nonSharedVideos.length > 0) {
      return NextResponse.json(
        {
          error: 'La llista global només accepta vídeos compartits amb altres centres',
          invalid_videos: nonSharedVideos.map(v => v.title)
        },
        { status: 400 }
      );
    }
  }

  // Obtenir la posició màxima actual
  const { data: maxPositionData } = await supabase
    .from('playlist_items')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  let nextPosition = (maxPositionData?.position ?? -1) + 1;

  // Verificar quins vídeos ja estan a la llista
  const { data: existingItems } = await supabase
    .from('playlist_items')
    .select('video_id')
    .eq('playlist_id', playlistId);

  const existingVideoIds = new Set(existingItems?.map(item => item.video_id) || []);
  const newVideoIds = video_ids.filter((id: string) => !existingVideoIds.has(id));

  if (newVideoIds.length === 0) {
    return NextResponse.json({
      added: 0,
      message: 'Tots els vídeos ja estan a la llista',
    });
  }

  // Crear els items
  const items = newVideoIds.map((videoId: string, index: number) => ({
    playlist_id: playlistId,
    video_id: videoId,
    position: nextPosition + index,
    added_by_user_id: user.id,
  }));

  const { error: insertError } = await supabase
    .from('playlist_items')
    .insert(items);

  if (insertError) {
    console.error('Error adding videos to playlist:', insertError);
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  // Actualitzar updated_at de la llista
  await supabase
    .from('playlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', playlistId);

  return NextResponse.json({
    added: newVideoIds.length,
    message: `${newVideoIds.length} vídeo${newVideoIds.length > 1 ? 's' : ''} afegit${newVideoIds.length > 1 ? 's' : ''} correctament`,
  });
}
