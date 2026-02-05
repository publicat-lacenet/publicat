import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/schedule-overrides?centerId=X&month=YYYY-MM
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single();

  const role = dbUser?.role || user.user_metadata?.role;
  const userCenterId = dbUser?.center_id || user.user_metadata?.center_id;

  const { searchParams } = new URL(request.url);
  const centerId = role === 'admin_global'
    ? searchParams.get('centerId') || userCenterId
    : userCenterId;
  const month = searchParams.get('month'); // YYYY-MM

  if (!centerId) {
    return NextResponse.json(
      { error: 'No s\'ha pogut determinar el centre' },
      { status: 400 }
    );
  }

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: 'Paràmetre month requerit (format: YYYY-MM)' },
      { status: 400 }
    );
  }

  // Calculate date range for the month
  const startDate = `${month}-01`;
  const [year, monthNum] = month.split('-').map(Number);
  const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // last day of month

  try {
    const { data: overrides, error } = await supabase
      .from('schedule_overrides')
      .select(`
        id,
        date,
        playlist_id,
        created_by_user_id,
        created_at,
        playlists (
          id,
          name
        )
      `)
      .eq('center_id', centerId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching schedule overrides:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the response
    const result = (overrides || []).map((o: any) => ({
      id: o.id,
      date: o.date,
      playlist_id: o.playlist_id,
      playlist_name: o.playlists?.name || null,
      created_at: o.created_at,
    }));

    return NextResponse.json({ overrides: result });
  } catch (error) {
    console.error('Error fetching schedule overrides:', error);
    return NextResponse.json(
      { error: 'Error obtenint les programacions' },
      { status: 500 }
    );
  }
}

// POST /api/schedule-overrides — UPSERT overrides for dates
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single();

  const role = dbUser?.role || user.user_metadata?.role;
  const userCenterId = dbUser?.center_id || user.user_metadata?.center_id;

  if (!['editor_profe', 'admin_global'].includes(role)) {
    return NextResponse.json(
      { error: 'No tens permisos per programar llistes' },
      { status: 403 }
    );
  }

  if (!userCenterId) {
    return NextResponse.json(
      { error: 'No s\'ha pogut determinar el centre' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { playlistId, dates } = body;

  if (!playlistId || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json(
      { error: 'playlistId i dates[] són requerits' },
      { status: 400 }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (const d of dates) {
    if (!dateRegex.test(d)) {
      return NextResponse.json(
        { error: `Format de data invàlid: ${d}` },
        { status: 400 }
      );
    }
  }

  // Validate dates are not in the past
  const today = new Date().toISOString().split('T')[0];
  const pastDates = dates.filter((d: string) => d < today);
  if (pastDates.length > 0) {
    return NextResponse.json(
      { error: 'No es poden programar dies passats' },
      { status: 400 }
    );
  }

  // Verify playlist belongs to the user's center (or admin can override)
  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, center_id')
    .eq('id', playlistId)
    .eq('is_active', true)
    .single();

  if (!playlist) {
    return NextResponse.json(
      { error: 'Llista no trobada' },
      { status: 404 }
    );
  }

  if (role !== 'admin_global' && playlist.center_id !== userCenterId) {
    return NextResponse.json(
      { error: 'No tens permisos per programar aquesta llista' },
      { status: 403 }
    );
  }

  const centerId = playlist.center_id;

  try {
    // UPSERT: if a date already has an override for this center, replace it
    const rows = dates.map((date: string) => ({
      center_id: centerId,
      date,
      playlist_id: playlistId,
      created_by_user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('schedule_overrides')
      .upsert(rows, { onConflict: 'center_id,date' })
      .select();

    if (error) {
      console.error('Error upserting schedule overrides:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      overrides: data,
      message: `${dates.length} ${dates.length === 1 ? 'dia programat' : 'dies programats'} correctament`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule overrides:', error);
    return NextResponse.json(
      { error: 'Error programant les dates' },
      { status: 500 }
    );
  }
}
