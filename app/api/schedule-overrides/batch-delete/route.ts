import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/schedule-overrides/batch-delete
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
      { error: 'No tens permisos per eliminar programacions' },
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
  const { dates } = body;

  if (!Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json(
      { error: 'dates[] és requerit' },
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

  try {
    // Delete overrides for the given dates in the user's center
    // RLS will ensure only own center's overrides are affected
    const { error } = await supabase
      .from('schedule_overrides')
      .delete()
      .eq('center_id', userCenterId)
      .in('date', dates);

    if (error) {
      console.error('Error deleting schedule overrides:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `${dates.length} ${dates.length === 1 ? 'programació eliminada' : 'programacions eliminades'} correctament`,
    });
  } catch (error) {
    console.error('Error deleting schedule overrides:', error);
    return NextResponse.json(
      { error: 'Error eliminant les programacions' },
      { status: 500 }
    );
  }
}
