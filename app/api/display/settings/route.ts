import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/display/settings - Obtenir configuració de display del centre
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

  // Verificar permisos (lectura)
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

  if (!centerId) {
    return NextResponse.json(
      { error: 'No s\'ha pogut determinar el centre' },
      { status: 400 }
    );
  }

  try {
    const { data: settings } = await supabase
      .from('display_settings')
      .select('*')
      .eq('center_id', centerId)
      .single();

    // Retornar configuració amb valors per defecte si no existeix
    const displaySettings = settings || {
      center_id: centerId,
      show_header: true,
      show_clock: true,
      show_ticker: false,
      ticker_speed: 50,
      standby_message: 'Pròximament...',
      announcement_volume: 0,
      announcement_mode: 'video',
    };

    return NextResponse.json({ settings: displaySettings });
  } catch (error: unknown) {
    console.error('Error fetching display settings:', error);
    return NextResponse.json(
      { error: 'Error obtenint la configuració de display' },
      { status: 500 }
    );
  }
}

// PATCH /api/display/settings - Actualitzar configuració de display
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

  // Verificar permisos (només editors)
  if (role !== 'editor_profe' && role !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per modificar la configuració de display' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { center_id: bodyCenterId, ...updates } = body;

  // Determinar el centre
  const centerId = role === 'admin_global' && bodyCenterId
    ? bodyCenterId
    : userCenterId;

  if (!centerId) {
    return NextResponse.json(
      { error: 'No s\'ha pogut determinar el centre' },
      { status: 400 }
    );
  }

  // Validar els camps
  const allowedFields = [
    'show_header',
    'show_clock',
    'show_ticker',
    'ticker_speed',
    'standby_message',
    'announcement_volume',
    'announcement_mode',
  ];

  const filteredUpdates: Record<string, unknown> = {};

  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  // Validacions específiques
  if ('ticker_speed' in filteredUpdates) {
    const speed = filteredUpdates.ticker_speed as number;
    if (typeof speed !== 'number' || speed < 10 || speed > 200) {
      return NextResponse.json(
        { error: 'La velocitat del ticker ha de ser entre 10 i 200' },
        { status: 400 }
      );
    }
  }

  if ('announcement_volume' in filteredUpdates) {
    const volume = filteredUpdates.announcement_volume as number;
    if (typeof volume !== 'number' || volume < 0 || volume > 100) {
      return NextResponse.json(
        { error: 'El volum dels anuncis ha de ser entre 0 i 100' },
        { status: 400 }
      );
    }
  }

  if ('announcement_mode' in filteredUpdates) {
    const mode = filteredUpdates.announcement_mode as string;
    if (!['video', 'video_360p', 'slideshow', 'none'].includes(mode)) {
      return NextResponse.json(
        { error: 'El mode d\'anuncis ha de ser video, video_360p, slideshow o none' },
        { status: 400 }
      );
    }
  }

  try {
    // Upsert: inserir o actualitzar
    const { data: settings, error } = await supabase
      .from('display_settings')
      .upsert(
        {
          center_id: centerId,
          ...filteredUpdates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'center_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating display settings:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings,
      message: 'Configuració actualitzada correctament',
    });
  } catch (error: unknown) {
    console.error('Error updating display settings:', error);
    return NextResponse.json(
      { error: 'Error actualitzant la configuració de display' },
      { status: 500 }
    );
  }
}
