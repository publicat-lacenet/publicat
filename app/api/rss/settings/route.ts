import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/rss/settings - Obtenir configuració RSS del centre
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

  // Obtenir settings del centre
  const { data: settings } = await supabase
    .from('rss_center_settings')
    .select('*')
    .eq('center_id', centerId)
    .single();

  // Si no existeix, retornar valors per defecte
  const defaultSettings = {
    center_id: centerId,
    seconds_per_item: 15,
    seconds_per_feed: 120,
    refresh_minutes: 60,
  };

  return NextResponse.json({
    settings: settings || defaultSettings,
  });
}

// PATCH /api/rss/settings - Actualitzar configuració RSS del centre
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
      { error: 'No tens permisos per modificar la configuració RSS' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { seconds_per_item, seconds_per_feed, refresh_minutes, center_id: bodyCenterId } = body;

  // Determinar el centre
  const centerId = (role === 'admin_global' && bodyCenterId) || userCenterId;

  if (!centerId) {
    return NextResponse.json(
      { error: "No s'ha pogut determinar el centre" },
      { status: 400 }
    );
  }

  // Validacions
  const updateData: Record<string, any> = {};

  if (seconds_per_item !== undefined) {
    const value = parseInt(seconds_per_item);
    if (isNaN(value) || value < 5 || value > 30) {
      return NextResponse.json(
        { error: 'El temps per ítem ha de ser entre 5 i 30 segons' },
        { status: 400 }
      );
    }
    updateData.seconds_per_item = value;
  }

  if (seconds_per_feed !== undefined) {
    const value = parseInt(seconds_per_feed);
    if (isNaN(value) || value < 60 || value > 300) {
      return NextResponse.json(
        { error: 'El temps per feed ha de ser entre 60 i 300 segons' },
        { status: 400 }
      );
    }
    updateData.seconds_per_feed = value;
  }

  if (refresh_minutes !== undefined) {
    const value = parseInt(refresh_minutes);
    if (isNaN(value) || value < 15 || value > 180) {
      return NextResponse.json(
        { error: "L'interval d'actualització ha de ser entre 15 i 180 minuts" },
        { status: 400 }
      );
    }
    updateData.refresh_minutes = value;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No hi ha res a actualitzar' }, { status: 400 });
  }

  // Upsert (crear si no existeix, actualitzar si existeix)
  const { data: settings, error } = await supabase
    .from('rss_center_settings')
    .upsert(
      {
        center_id: centerId,
        ...updateData,
      },
      { onConflict: 'center_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings,
    message: 'Configuració guardada correctament',
  });
}
