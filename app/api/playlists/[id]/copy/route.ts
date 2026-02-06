import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/playlists/[id]/copy - Copiar una llista global a un centre
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

  // Només admin_global i editor_profe poden copiar llistes globals
  if (role !== 'admin_global' && role !== 'editor_profe') {
    return NextResponse.json(
      { error: 'No tens permisos per copiar llistes' },
      { status: 403 }
    );
  }

  const body = await request.json();
  let { center_id } = body;

  // editor_profe només pot copiar al seu propi centre
  if (role === 'editor_profe') {
    center_id = userCenterId;
  }

  if (!center_id) {
    return NextResponse.json(
      { error: 'Cal especificar el centre destí' },
      { status: 400 }
    );
  }

  // Verificar que el centre existeix
  const { data: center, error: centerError } = await supabase
    .from('centers')
    .select('id, name')
    .eq('id', center_id)
    .eq('is_active', true)
    .single();

  if (centerError || !center) {
    return NextResponse.json(
      { error: 'Centre no trobat' },
      { status: 404 }
    );
  }

  // Obtenir la llista original
  const { data: originalPlaylist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .eq('is_active', true)
    .single();

  if (playlistError || !originalPlaylist) {
    return NextResponse.json(
      { error: 'Llista no trobada' },
      { status: 404 }
    );
  }

  // Verificar que és una llista global
  if (originalPlaylist.center_id !== null || originalPlaylist.kind !== 'global') {
    return NextResponse.json(
      { error: 'Només es poden copiar llistes globals' },
      { status: 400 }
    );
  }

  // Crear la còpia
  const { data: newPlaylist, error: createError } = await supabase
    .from('playlists')
    .insert({
      center_id: center_id,
      name: `${originalPlaylist.name} (Còpia)`,
      kind: 'custom', // Les còpies locals són de tipus custom
      is_deletable: true,
      is_student_editable: false,
      origin_playlist_id: playlistId, // Referència a l'original
      created_by_user_id: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating playlist copy:', createError);
    return NextResponse.json(
      { error: createError.message },
      { status: 500 }
    );
  }

  // Obtenir els items de la llista original
  const { data: originalItems, error: itemsError } = await supabase
    .from('playlist_items')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });

  if (itemsError) {
    console.error('Error fetching original items:', itemsError);
    // La llista s'ha creat, però sense items
    return NextResponse.json({
      playlist: newPlaylist,
      message: 'Llista copiada, però sense vídeos (error al copiar items)',
    }, { status: 201 });
  }

  // Copiar els items
  if (originalItems && originalItems.length > 0) {
    const newItems = originalItems.map((item) => ({
      playlist_id: newPlaylist.id,
      video_id: item.video_id,
      position: item.position,
      added_by_user_id: user.id,
    }));

    const { error: insertError } = await supabase
      .from('playlist_items')
      .insert(newItems);

    if (insertError) {
      console.error('Error copying playlist items:', insertError);
    }
  }

  return NextResponse.json({
    playlist: newPlaylist,
    items_copied: originalItems?.length || 0,
    message: `Llista copiada correctament a ${center.name}`,
  }, { status: 201 });
}
