import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/rss/rotation - Obtenir ordre de rotació del centre
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
  const centerId = (role === 'admin_global' && searchParams.get('centerId')) || userCenterId;

  if (!centerId) {
    return NextResponse.json(
      { error: "No s'ha pogut determinar el centre" },
      { status: 400 }
    );
  }

  // Obtenir ordre de rotació amb detalls del feed
  const { data: rotation, error } = await supabase
    .from('rss_rotation_order')
    .select(
      `
      feed_id,
      position,
      rss_feeds (
        id,
        name,
        url,
        is_active,
        is_in_rotation,
        error_count,
        last_fetched_at
      )
    `
    )
    .eq('center_id', centerId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching rotation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    rotation: rotation || [],
  });
}

// PATCH /api/rss/rotation - Actualitzar ordre de rotació
export async function PATCH(request: NextRequest) {
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
      { error: "No tens permisos per modificar l'ordre de rotació" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { feeds, center_id: bodyCenterId } = body;

  // Determinar el centre
  const centerId = (role === 'admin_global' && bodyCenterId) || userCenterId;

  if (!centerId) {
    return NextResponse.json(
      { error: "No s'ha pogut determinar el centre" },
      { status: 400 }
    );
  }

  // Validar estructura
  if (!Array.isArray(feeds)) {
    return NextResponse.json(
      { error: 'El format de les dades no és correcte' },
      { status: 400 }
    );
  }

  // Validar que tots els feeds pertanyen al centre
  const feedIds = feeds.map((f: { feed_id: string }) => f.feed_id);
  const { data: validFeeds } = await supabase
    .from('rss_feeds')
    .select('id')
    .eq('center_id', centerId)
    .in('id', feedIds);

  if (!validFeeds || validFeeds.length !== feedIds.length) {
    return NextResponse.json(
      { error: 'Alguns feeds no pertanyen al centre' },
      { status: 400 }
    );
  }

  try {
    // Eliminar ordre actual del centre
    await supabase.from('rss_rotation_order').delete().eq('center_id', centerId);

    // Inserir nou ordre
    if (feeds.length > 0) {
      const rotationData = feeds.map((f: { feed_id: string; position: number }) => ({
        center_id: centerId,
        feed_id: f.feed_id,
        position: f.position,
      }));

      const { error: insertError } = await supabase
        .from('rss_rotation_order')
        .insert(rotationData);

      if (insertError) {
        console.error('Error inserting rotation:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Actualitzar is_in_rotation dels feeds
    // Feeds en rotació
    if (feedIds.length > 0) {
      await supabase
        .from('rss_feeds')
        .update({ is_in_rotation: true })
        .eq('center_id', centerId)
        .in('id', feedIds);
    }

    // Feeds no en rotació
    const { data: allFeeds } = await supabase
      .from('rss_feeds')
      .select('id')
      .eq('center_id', centerId);

    const notInRotationIds = (allFeeds || [])
      .map(f => f.id)
      .filter(id => !feedIds.includes(id));

    if (notInRotationIds.length > 0) {
      await supabase
        .from('rss_feeds')
        .update({ is_in_rotation: false })
        .eq('center_id', centerId)
        .in('id', notInRotationIds);
    }

    return NextResponse.json({
      message: 'Ordre de rotació guardat correctament',
    });
  } catch (error: any) {
    console.error('Error updating rotation:', error);
    return NextResponse.json(
      { error: 'Error actualitzant l\'ordre de rotació' },
      { status: 500 }
    );
  }
}
