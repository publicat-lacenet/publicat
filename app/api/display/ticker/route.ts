import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  // Get centerId from query params or user's center
  const searchParams = request.nextUrl.searchParams;
  let centerId = searchParams.get('centerId');

  if (!centerId) {
    // Get user's center
    const { data: userData } = await supabase
      .from('users')
      .select('center_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.center_id) {
      return NextResponse.json({ error: 'Centre no trobat' }, { status: 404 });
    }
    centerId = userData.center_id;
  }

  // Get ticker messages ordered by position
  const { data: messages, error } = await supabase
    .from('ticker_messages')
    .select('*')
    .eq('center_id', centerId)
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching ticker messages:', error);
    return NextResponse.json({ error: 'Error obtenint missatges' }, { status: 500 });
  }

  return NextResponse.json({ messages: messages || [] });
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
  const { text, centerId } = body;

  if (!text || text.trim() === '') {
    return NextResponse.json({ error: 'El text és obligatori' }, { status: 400 });
  }

  // Use provided centerId or user's center
  const targetCenterId = centerId || userData.center_id;

  // Check permission for admin_global accessing other centers
  if (targetCenterId !== userData.center_id && userData.role !== 'admin_global') {
    return NextResponse.json({ error: 'No tens permisos per aquest centre' }, { status: 403 });
  }

  // Get max position for this center
  const { data: maxPositionData } = await supabase
    .from('ticker_messages')
    .select('position')
    .eq('center_id', targetCenterId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const newPosition = (maxPositionData?.position ?? -1) + 1;

  // Insert new message
  const { data: message, error } = await supabase
    .from('ticker_messages')
    .insert({
      center_id: targetCenterId,
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
