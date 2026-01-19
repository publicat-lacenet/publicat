import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/playlists - Llistar llistes del centre
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

  // Obtenir paràmetres de query
  const { searchParams } = new URL(request.url);
  const centerId = searchParams.get('centerId') || userCenterId;
  const kind = searchParams.get('kind');
  const includeGlobal = searchParams.get('includeGlobal') === 'true';

  // Query base per llistes del centre
  let query = supabase
    .from('playlists')
    .select(`
      *,
      centers (
        id,
        name
      ),
      created_by:created_by_user_id (
        id,
        full_name
      )
    `)
    .eq('is_active', true)
    .order('kind', { ascending: true })
    .order('name', { ascending: true });

  // Filtrar per centre segons el rol
  if (role === 'admin_global' && centerId) {
    // Admin global pot filtrar per qualsevol centre
    query = query.eq('center_id', centerId);
  } else if (centerId) {
    // Altres rols només veuen el seu centre
    query = query.eq('center_id', centerId);
  }

  // Filtrar per tipus si s'especifica
  if (kind && kind !== 'all') {
    query = query.eq('kind', kind);
  }

  const { data: playlists, error } = await query;

  if (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Obtenir comptadors de vídeos per cada llista
  const playlistsWithCount = await Promise.all(
    (playlists || []).map(async (playlist) => {
      const { count } = await supabase
        .from('playlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', playlist.id);

      return {
        ...playlist,
        video_count: count || 0,
      };
    })
  );

  // Obtenir llistes globals si es demana i no és editor_alumne
  let globalPlaylists: any[] = [];
  if (includeGlobal && role !== 'editor_alumne') {
    const { data: globals } = await supabase
      .from('playlists')
      .select(`
        *,
        created_by:created_by_user_id (
          id,
          full_name
        )
      `)
      .is('center_id', null)
      .eq('kind', 'global')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (globals) {
      globalPlaylists = await Promise.all(
        globals.map(async (playlist) => {
          const { count } = await supabase
            .from('playlist_items')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', playlist.id);

          return {
            ...playlist,
            video_count: count || 0,
          };
        })
      );
    }
  }

  return NextResponse.json({
    playlists: playlistsWithCount,
    global_playlists: globalPlaylists,
  });
}

// POST /api/playlists - Crear llista personalitzada
export async function POST(request: NextRequest) {
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

  // Verificar permisos - editor_alumne NO pot crear llistes
  if (role === 'editor_alumne') {
    return NextResponse.json(
      { error: 'No tens permisos per crear llistes' },
      { status: 403 }
    );
  }

  if (role !== 'editor_profe' && role !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per crear llistes' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, is_student_editable, video_ids, is_global, center_id: bodyCenterId } = body;

  // Validacions
  if (!name || name.trim() === '') {
    return NextResponse.json(
      { error: 'El nom de la llista és obligatori' },
      { status: 400 }
    );
  }

  // Determinar el centre
  let finalCenterId = userCenterId;

  // Admin global pot crear llistes globals (sense centre) o per qualsevol centre
  if (role === 'admin_global') {
    if (is_global) {
      finalCenterId = null;
    } else if (bodyCenterId) {
      finalCenterId = bodyCenterId;
    }
  }

  // Editor profe necessita centre
  if (role === 'editor_profe' && !finalCenterId) {
    return NextResponse.json(
      { error: 'No s\'ha pogut determinar el centre' },
      { status: 400 }
    );
  }

  try {
    // Crear la llista
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert({
        center_id: finalCenterId,
        name: name.trim(),
        kind: is_global ? 'global' : 'custom',
        is_deletable: true,
        is_student_editable: is_student_editable || false,
        created_by_user_id: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (playlistError) {
      console.error('Error creating playlist:', playlistError);
      return NextResponse.json(
        { error: playlistError.message },
        { status: 500 }
      );
    }

    // Si s'han especificat vídeos inicials, afegir-los
    if (video_ids && video_ids.length > 0) {
      const items = video_ids.map((videoId: string, index: number) => ({
        playlist_id: playlist.id,
        video_id: videoId,
        position: index,
        added_by_user_id: user.id,
      }));

      const { error: itemsError } = await supabase
        .from('playlist_items')
        .insert(items);

      if (itemsError) {
        console.error('Error adding videos to playlist:', itemsError);
      }
    }

    return NextResponse.json({
      playlist,
      message: 'Llista creada correctament',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al crear la llista' },
      { status: 500 }
    );
  }
}
