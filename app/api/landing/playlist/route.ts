import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/landing/playlist - Obtenir la llista global per a la landing page (públic)
export async function GET() {
  const supabase = await createClient();

  // Buscar la llista global (kind = 'global', center_id = null)
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('id, name')
    .eq('kind', 'global')
    .is('center_id', null)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (playlistError || !playlist) {
    return NextResponse.json({
      playlist: null,
      videos: [],
      message: 'No hi ha llista global configurada'
    });
  }

  // Obtenir els vídeos de la llista ordenats per posició
  const { data: items, error: itemsError } = await supabase
    .from('playlist_items')
    .select(`
      position,
      videos (
        id,
        title,
        vimeo_url,
        vimeo_id,
        vimeo_hash,
        thumbnail_url,
        duration_seconds
      )
    `)
    .eq('playlist_id', playlist.id)
    .order('position', { ascending: true });

  if (itemsError) {
    console.error('Error fetching playlist items:', itemsError);
    return NextResponse.json({
      playlist,
      videos: [],
      error: 'Error carregant els vídeos'
    });
  }

  // Filtrar vídeos vàlids i formatar
  const videos = (items || [])
    .filter(item => item.videos)
    .map(item => ({
      ...item.videos,
      position: item.position
    }));

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name
    },
    videos
  });
}
