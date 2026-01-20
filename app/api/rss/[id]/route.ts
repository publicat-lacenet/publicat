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

// GET /api/rss/[id] - Obtenir detalls d'un feed
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

  // Obtenir el feed
  const { data: feed, error } = await supabase
    .from('rss_feeds')
    .select(
      `
      *,
      centers:center_id (
        id,
        name
      ),
      created_by:created_by_user_id (
        id,
        full_name
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !feed) {
    return NextResponse.json({ error: 'Feed no trobat' }, { status: 404 });
  }

  // Obtenir ítems del feed
  const { data: items } = await supabase
    .from('rss_items')
    .select('*')
    .eq('feed_id', id)
    .order('pub_date', { ascending: false })
    .limit(50);

  return NextResponse.json({
    feed,
    items: items || [],
    item_count: items?.length || 0,
  });
}

// PATCH /api/rss/[id] - Actualitzar feed
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

  // Verificar permisos
  if (role !== 'editor_profe' && role !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per modificar feeds RSS' },
      { status: 403 }
    );
  }

  // Obtenir el feed existent
  const { data: existingFeed, error: fetchError } = await supabase
    .from('rss_feeds')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingFeed) {
    return NextResponse.json({ error: 'Feed no trobat' }, { status: 404 });
  }

  // Verificar que l'usuari pot modificar aquest feed
  if (role === 'editor_profe' && existingFeed.center_id !== userCenterId) {
    return NextResponse.json(
      { error: 'No tens permisos per modificar aquest feed' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, url, is_active, is_in_rotation } = body;

  // Preparar actualització
  const updateData: Record<string, any> = {};

  if (name !== undefined) {
    if (name.trim() === '') {
      return NextResponse.json(
        { error: 'El nom del feed no pot estar buit' },
        { status: 400 }
      );
    }
    updateData.name = name.trim();
  }

  if (url !== undefined && url !== existingFeed.url) {
    if (url.trim() === '') {
      return NextResponse.json(
        { error: "L'URL del feed no pot estar buida" },
        { status: 400 }
      );
    }
    // Validar nova URL
    try {
      const feed = await parser.parseURL(url);
      if (!feed.items || feed.items.length === 0) {
        return NextResponse.json(
          { error: 'El feed no conté cap ítem' },
          { status: 400 }
        );
      }
      updateData.url = url.trim();
      updateData.error_count = 0;
      updateData.last_error = null;
    } catch {
      return NextResponse.json(
        { error: "No s'ha pogut validar la nova URL del feed" },
        { status: 400 }
      );
    }
  }

  if (is_active !== undefined) {
    updateData.is_active = is_active;
  }

  if (is_in_rotation !== undefined) {
    updateData.is_in_rotation = is_in_rotation;

    // Gestionar l'ordre de rotació
    if (is_in_rotation && existingFeed.center_id) {
      // Afegir a rotació si no hi és
      const { data: existingRotation } = await supabase
        .from('rss_rotation_order')
        .select('position')
        .eq('center_id', existingFeed.center_id)
        .eq('feed_id', id)
        .single();

      if (!existingRotation) {
        // Trobar la posició màxima actual
        const { data: maxPosition } = await supabase
          .from('rss_rotation_order')
          .select('position')
          .eq('center_id', existingFeed.center_id)
          .order('position', { ascending: false })
          .limit(1)
          .single();

        const newPosition = (maxPosition?.position ?? -1) + 1;

        await supabase.from('rss_rotation_order').insert({
          center_id: existingFeed.center_id,
          feed_id: id,
          position: newPosition,
        });
      }
    } else if (!is_in_rotation && existingFeed.center_id) {
      // Eliminar de rotació
      await supabase
        .from('rss_rotation_order')
        .delete()
        .eq('center_id', existingFeed.center_id)
        .eq('feed_id', id);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No hi ha res a actualitzar' }, { status: 400 });
  }

  const { data: updatedFeed, error: updateError } = await supabase
    .from('rss_feeds')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating feed:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    feed: updatedFeed,
    message: 'Feed actualitzat correctament',
  });
}

// DELETE /api/rss/[id] - Eliminar feed
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

  // Verificar permisos
  if (role !== 'editor_profe' && role !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per eliminar feeds RSS' },
      { status: 403 }
    );
  }

  // Obtenir el feed existent
  const { data: existingFeed, error: fetchError } = await supabase
    .from('rss_feeds')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingFeed) {
    return NextResponse.json({ error: 'Feed no trobat' }, { status: 404 });
  }

  // Verificar que l'usuari pot eliminar aquest feed
  if (role === 'editor_profe' && existingFeed.center_id !== userCenterId) {
    return NextResponse.json(
      { error: 'No tens permisos per eliminar aquest feed' },
      { status: 403 }
    );
  }

  // Eliminar (CASCADE eliminarà els items i rotation_order)
  const { error: deleteError } = await supabase
    .from('rss_feeds')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting feed:', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Feed eliminat correctament',
  });
}
