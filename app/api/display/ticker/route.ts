import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from('users')
    .select('center_id, role')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'Usuari no trobat' }, { status: 404 });
  }

  if (!['display', 'editor_profe', 'editor_alumne', 'admin_global'].includes(userData.role)) {
    return NextResponse.json({ error: 'No tens permisos' }, { status: 403 });
  }

  // Get centerId from query params or user's center
  const searchParams = request.nextUrl.searchParams;
  const requestedCenterId = searchParams.get('centerId');
  const playlistId = searchParams.get('playlistId');
  const fallbackGeneral = searchParams.get('fallbackGeneral') === 'true';

  if (!userData.center_id && userData.role !== 'admin_global') {
    return NextResponse.json({ error: 'Centre no trobat' }, { status: 404 });
  }

  if (requestedCenterId && requestedCenterId !== userData.center_id && userData.role !== 'admin_global') {
    return NextResponse.json({ error: 'No tens permisos per aquest centre' }, { status: 403 });
  }

  const centerId = userData.role === 'admin_global'
    ? requestedCenterId || userData.center_id
    : userData.center_id;

  if (!centerId) {
    return NextResponse.json({ error: 'Centre no trobat' }, { status: 404 });
  }

  if (playlistId) {
    const { data: playlist } = await supabase
      .from('playlists')
      .select('id, center_id, kind, is_active')
      .eq('id', playlistId)
      .single();

    if (!playlist || playlist.center_id !== centerId || playlist.kind !== 'weekday' || !playlist.is_active) {
      return NextResponse.json({ error: 'Llista de dia no trobada' }, { status: 404 });
    }
  }

  let query = supabase
    .from('ticker_messages')
    .select('*')
    .eq('center_id', centerId)
    .eq('is_active', true)
    .order('position', { ascending: true });

  query = playlistId
    ? query.eq('playlist_id', playlistId)
    : query.is('playlist_id', null);

  const { data: scopedMessages, error } = await query;

  if (error) {
    console.error('Error fetching ticker messages:', error);
    return NextResponse.json({ error: 'Error obtenint missatges' }, { status: 500 });
  }

  if (playlistId && fallbackGeneral && (!scopedMessages || scopedMessages.length === 0)) {
    const { data: generalMessages, error: generalError } = await supabase
      .from('ticker_messages')
      .select('*')
      .eq('center_id', centerId)
      .is('playlist_id', null)
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (generalError) {
      console.error('Error fetching fallback ticker messages:', generalError);
      return NextResponse.json({ error: 'Error obtenint missatges' }, { status: 500 });
    }

    return NextResponse.json({ messages: generalMessages || [], source: 'general' });
  }

  return NextResponse.json({ messages: scopedMessages || [], source: playlistId ? 'playlist' : 'general' });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  // Get user data to check role
  const { data: userData } = await supabase
    .from('users')
    .select('center_id, role')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: 'Usuari no trobat' }, { status: 404 });
  }

  // Only editors can create messages
  if (!['editor_profe', 'admin_global'].includes(userData.role)) {
    return NextResponse.json({ error: 'No tens permisos' }, { status: 403 });
  }

  const body = await request.json();
  const { text, centerId, playlistId } = body;

  if (!text || text.trim() === '') {
    return NextResponse.json({ error: 'El text és obligatori' }, { status: 400 });
  }

  // Use provided centerId or user's center
  const targetCenterId = centerId || userData.center_id;

  // Check permission for admin_global accessing other centers
  if (targetCenterId !== userData.center_id && userData.role !== 'admin_global') {
    return NextResponse.json({ error: 'No tens permisos per aquest centre' }, { status: 403 });
  }

  if (playlistId) {
    const { data: playlist } = await supabase
      .from('playlists')
      .select('id, center_id, kind, is_active')
      .eq('id', playlistId)
      .single();

    if (!playlist || playlist.center_id !== targetCenterId || playlist.kind !== 'weekday' || !playlist.is_active) {
      return NextResponse.json({ error: 'Només es pot associar el ticker a llistes de dia del centre' }, { status: 400 });
    }
  }

  let maxPositionQuery = supabase
    .from('ticker_messages')
    .select('position')
    .eq('center_id', targetCenterId)
    .order('position', { ascending: false })
    .limit(1);

  maxPositionQuery = playlistId
    ? maxPositionQuery.eq('playlist_id', playlistId)
    : maxPositionQuery.is('playlist_id', null);

  const { data: maxPositionData } = await maxPositionQuery;
  const newPosition = (maxPositionData?.[0]?.position ?? -1) + 1;

  // Insert new message
  const { data: message, error } = await supabase
    .from('ticker_messages')
    .insert({
      center_id: targetCenterId,
      playlist_id: playlistId || null,
      text: text.trim(),
      position: newPosition,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating ticker message:', error);
    return NextResponse.json({ error: 'Error creant missatge' }, { status: 500 });
  }

  return NextResponse.json({ message }, { status: 201 });
}
