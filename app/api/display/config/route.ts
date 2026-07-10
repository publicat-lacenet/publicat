import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Mapeig de dies de la setmana a noms en català
const WEEKDAY_NAMES: Record<number, string> = {
  0: 'Diumenge',
  1: 'Dilluns',
  2: 'Dimarts',
  3: 'Dimecres',
  4: 'Dijous',
  5: 'Divendres',
  6: 'Dissabte',
};

type PlaylistWithCount = {
  id: string;
  name: string;
  kind: string;
  is_active?: boolean;
  playlist_items?: { count: number }[];
};

// GET /api/display/config - Obtenir configuració completa de display
export async function GET(request: NextRequest) {
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

  // Verificar permisos (display, editor_profe, editor_alumne, admin_global)
  if (!['display', 'editor_profe', 'editor_alumne', 'admin_global'].includes(role)) {
    return NextResponse.json(
      { error: 'No tens permisos per accedir a la configuració de display' },
      { status: 403 }
    );
  }

  // Obtenir paràmetres de query
  const { searchParams } = new URL(request.url);
  const centerId = role === 'admin_global'
    ? searchParams.get('centerId') || userCenterId
    : userCenterId;
  const playlistOverride = searchParams.get('playlist');

  if (!centerId) {
    return NextResponse.json(
      { error: 'No s\'ha pogut determinar el centre' },
      { status: 400 }
    );
  }

  try {
    const summarizePlaylist = (playlist: PlaylistWithCount) => ({
      id: playlist.id,
      name: playlist.name,
      kind: playlist.kind,
      video_count: playlist.playlist_items?.[0]?.count || 0,
    });

    // 1. Obtenir informació del centre
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .select('id, name, logo_url')
      .eq('id', centerId)
      .single();

    if (centerError || !center) {
      return NextResponse.json(
        { error: 'Centre no trobat' },
        { status: 404 }
      );
    }

    // 2. Obtenir configuració de display
    const { data: displaySettings } = await supabase
      .from('display_settings')
      .select('*')
      .eq('center_id', centerId)
      .single();

    const display_settings = {
      show_header: true,
      show_clock: true,
      show_ticker: false,
      ticker_speed: 50,
      default_playlist_mode: 'permanent',
      standby_message: 'Pròximament...',
      announcement_volume: 0,
      announcement_mode: 'video',
      ...(displaySettings || {}),
    };

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayName = isWeekend ? WEEKDAY_NAMES[5] : WEEKDAY_NAMES[dayOfWeek]; // Divendres per caps de setmana

    const { data: weekdayPlaylistForToday } = await supabase
      .from('playlists')
      .select(`
        id,
        name,
        kind,
        playlist_items (count)
      `)
      .eq('center_id', centerId)
      .eq('kind', 'weekday')
      .eq('name', dayName)
      .eq('is_active', true)
      .single();

    const tickerPlaylistId =
      display_settings.default_playlist_mode === 'weekday' && weekdayPlaylistForToday
        ? weekdayPlaylistForToday.id
        : null;

    // 3. Determinar la playlist actual
    let currentPlaylist = null;

    if (playlistOverride) {
      // Override manual amb UUID específic
      const { data: overridePlaylist } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          kind,
          playlist_items (count)
        `)
        .eq('id', playlistOverride)
        .eq('center_id', centerId)
        .eq('is_active', true)
        .single();

      if (overridePlaylist) {
        currentPlaylist = summarizePlaylist(overridePlaylist);
      }
    }

    if (!currentPlaylist) {
      // Prioritat 1: schedule_overrides per la data d'avui
      const { data: scheduleOverride } = await supabase
        .from('schedule_overrides')
        .select(`
          playlist_id,
          playlists (
            id,
            name,
            kind,
            is_active,
            playlist_items (count)
          )
        `)
        .eq('center_id', centerId)
        .eq('date', todayStr)
        .single();

      if (scheduleOverride?.playlists) {
        const schedulePlaylist = scheduleOverride.playlists as unknown as PlaylistWithCount;
        if (schedulePlaylist.is_active) {
          currentPlaylist = summarizePlaylist(schedulePlaylist);
        }
      }

      // Prioritat 2: mode habitual del centre
      if (!currentPlaylist) {
        if (display_settings.default_playlist_mode === 'weekday') {
          if (weekdayPlaylistForToday) {
            currentPlaylist = summarizePlaylist(weekdayPlaylistForToday);
          }
        } else {
          const { data: permanentPlaylist } = await supabase
            .from('playlists')
            .select(`
              id,
              name,
              kind,
              playlist_items (count)
            `)
            .eq('center_id', centerId)
            .eq('kind', 'permanent')
            .eq('is_active', true)
            .single();

          if (permanentPlaylist) {
            currentPlaylist = summarizePlaylist(permanentPlaylist);
          }
        }
      }
    }

    // 4. Obtenir playlist d'anuncis
    let announcementsPlaylist = null;
    const { data: announcements } = await supabase
      .from('playlists')
      .select(`
        id,
        name,
        playlist_items (count)
      `)
      .eq('center_id', centerId)
      .eq('kind', 'announcements')
      .eq('is_active', true)
      .single();

    if (announcements) {
      announcementsPlaylist = {
        id: announcements.id,
        name: announcements.name,
        video_count: announcements.playlist_items?.[0]?.count || 0,
      };
    }

    // 5. Obtenir configuració RSS
    const { data: rssSettings } = await supabase
      .from('rss_center_settings')
      .select('seconds_per_item, seconds_per_feed, image_height_percent')
      .eq('center_id', centerId)
      .single();

    const rss_settings = rssSettings || {
      seconds_per_item: 15,
      seconds_per_feed: 120,
      image_height_percent: 50,
    };

    return NextResponse.json({
      center: {
        id: center.id,
        name: center.name,
        logo_url: center.logo_url,
      },
      current_playlist: currentPlaylist,
      announcements_playlist: announcementsPlaylist,
      rss_settings,
      display_settings,
      ticker_playlist_id: tickerPlaylistId,
    });
  } catch (error: unknown) {
    console.error('Error fetching display config:', error);
    return NextResponse.json(
      { error: 'Error obtenint la configuració de display' },
      { status: 500 }
    );
  }
}
