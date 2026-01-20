import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Publicat/1.0 (https://publicat.cat)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
});

// GET /api/rss - Llistar feeds RSS del centre
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
  const includeItems = searchParams.get('includeItems') === 'true';
  const onlyActive = searchParams.get('onlyActive') === 'true';
  const onlyInRotation = searchParams.get('onlyInRotation') === 'true';

  // Query base per feeds del centre
  let query = supabase
    .from('rss_feeds')
    .select(`
      *,
      centers:center_id (
        id,
        name
      ),
      created_by:created_by_user_id (
        id,
        full_name
      )
    `)
    .order('name', { ascending: true });

  // Filtrar per centre segons el rol
  if (role === 'admin_global' && centerId) {
    query = query.eq('center_id', centerId);
  } else if (centerId) {
    query = query.eq('center_id', centerId);
  }

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  if (onlyInRotation) {
    query = query.eq('is_in_rotation', true);
  }

  const { data: feeds, error } = await query;

  if (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Obtenir comptadors d'ítems per cada feed
  const feedsWithCount = await Promise.all(
    (feeds || []).map(async feed => {
      const { count } = await supabase
        .from('rss_items')
        .select('*', { count: 'exact', head: true })
        .eq('feed_id', feed.id);

      let items = null;
      if (includeItems) {
        const { data: feedItems } = await supabase
          .from('rss_items')
          .select('*')
          .eq('feed_id', feed.id)
          .order('pub_date', { ascending: false })
          .limit(20);
        items = feedItems;
      }

      return {
        ...feed,
        item_count: count || 0,
        items,
      };
    })
  );

  // Obtenir settings del centre
  let settings = null;
  if (centerId) {
    const { data: centerSettings } = await supabase
      .from('rss_center_settings')
      .select('*')
      .eq('center_id', centerId)
      .single();

    settings = centerSettings || {
      seconds_per_item: 15,
      seconds_per_feed: 120,
      refresh_minutes: 60,
    };
  }

  // Obtenir ordre de rotació
  let rotationOrder: any[] = [];
  if (centerId) {
    const { data: rotation } = await supabase
      .from('rss_rotation_order')
      .select('feed_id, position')
      .eq('center_id', centerId)
      .order('position', { ascending: true });
    rotationOrder = rotation || [];
  }

  return NextResponse.json({
    feeds: feedsWithCount,
    settings,
    rotation_order: rotationOrder,
  });
}

// POST /api/rss - Crear feed RSS
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

  // Verificar permisos
  if (role !== 'editor_profe' && role !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per crear feeds RSS' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, url, is_in_rotation, center_id: bodyCenterId, is_global } = body;

  // Validacions
  if (!name || name.trim() === '') {
    return NextResponse.json(
      { error: 'El nom del feed és obligatori' },
      { status: 400 }
    );
  }

  if (!url || url.trim() === '') {
    return NextResponse.json({ error: 'La URL del feed és obligatòria' }, { status: 400 });
  }

  // Determinar el centre
  let finalCenterId = userCenterId;
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
      { error: "No s'ha pogut determinar el centre" },
      { status: 400 }
    );
  }

  // Re-validar el feed abans de guardar
  try {
    const feed = await parser.parseURL(url);
    if (!feed.items || feed.items.length === 0) {
      return NextResponse.json(
        { error: 'El feed no conté cap ítem' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error validating feed:', error);
    return NextResponse.json(
      { error: 'No s\'ha pogut validar el feed. Assegura\'t que l\'URL és correcta.' },
      { status: 400 }
    );
  }

  try {
    // Crear el feed
    const { data: newFeed, error: feedError } = await supabase
      .from('rss_feeds')
      .insert({
        center_id: finalCenterId,
        name: name.trim(),
        url: url.trim(),
        is_active: true,
        is_in_rotation: is_in_rotation !== false,
        error_count: 0,
        created_by_user_id: user.id,
      })
      .select()
      .single();

    if (feedError) {
      console.error('Error creating feed:', feedError);
      return NextResponse.json({ error: feedError.message }, { status: 500 });
    }

    // Afegir a l'ordre de rotació si està en rotació
    if (is_in_rotation !== false && finalCenterId) {
      // Trobar la posició màxima actual
      const { data: maxPosition } = await supabase
        .from('rss_rotation_order')
        .select('position')
        .eq('center_id', finalCenterId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const newPosition = (maxPosition?.position ?? -1) + 1;

      await supabase.from('rss_rotation_order').insert({
        center_id: finalCenterId,
        feed_id: newFeed.id,
        position: newPosition,
      });
    }

    return NextResponse.json(
      {
        feed: newFeed,
        message: 'Feed creat correctament',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al crear el feed' },
      { status: 500 }
    );
  }
}
