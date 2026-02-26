import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { extractVimeoIdAndHash } from '@/lib/vimeo';

// GET /api/display/playlist/[id] - Obtenir vídeos d'una playlist per display
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

  // Verificar permisos (display, editor_profe, editor_alumne, admin_global)
  if (!['display', 'editor_profe', 'editor_alumne', 'admin_global'].includes(role)) {
    return NextResponse.json(
      { error: 'No tens permisos per accedir a aquesta playlist' },
      { status: 403 }
    );
  }

  try {
    // Obtenir la playlist
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, name, kind, center_id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist no trobada' },
        { status: 404 }
      );
    }

    // Obtenir els ítems de la playlist amb els vídeos
    const { data: items, error: itemsError } = await supabase
      .from('playlist_items')
      .select(`
        id,
        position,
        videos:video_id (
          id,
          title,
          vimeo_id,
          vimeo_hash,
          vimeo_url,
          duration_seconds,
          thumbnail_url,
          frames_urls,
          status,
          type
        )
      `)
      .eq('playlist_id', id)
      .order('position', { ascending: true });

    if (itemsError) {
      console.error('Error fetching playlist items:', itemsError);
      return NextResponse.json(
        { error: 'Error obtenint els vídeos de la playlist' },
        { status: 500 }
      );
    }

    // Filtrar només vídeos publicats i amb dades vàlides
    const videos = (items || [])
      .filter((item) => {
        const video = item.videos as unknown as {
          id: string;
          status: string;
          vimeo_id: string;
        } | null;
        return video && video.status === 'published' && video.vimeo_id;
      })
      .map((item) => {
        const video = item.videos as unknown as {
          id: string;
          title: string;
          vimeo_id: string;
          vimeo_hash: string | null;
          vimeo_url: string;
          duration_seconds: number | null;
          thumbnail_url: string | null;
          frames_urls: string[];
          type: string;
        };
        // Extract ID and hash from vimeo_id URL if needed
        const extracted = extractVimeoIdAndHash(video.vimeo_id);
        const vimeoId = extracted?.id || video.vimeo_id;
        // Use stored hash, or extracted hash from URL, or null
        const vimeoHash = video.vimeo_hash || extracted?.hash || null;

        return {
          id: video.id,
          title: video.title,
          vimeo_id: vimeoId,
          vimeo_hash: vimeoHash,
          duration_seconds: video.duration_seconds,
          thumbnail_url: video.thumbnail_url,
          frames_urls: video.frames_urls || [],
          type: video.type,
        };
      });

    return NextResponse.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        kind: playlist.kind,
      },
      videos,
    });
  } catch (error: unknown) {
    console.error('Error fetching display playlist:', error);
    return NextResponse.json(
      { error: 'Error obtenint la playlist' },
      { status: 500 }
    );
  }
}
