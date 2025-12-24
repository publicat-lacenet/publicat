import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const { id } = await params;
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Verificar que l'usuari és admin_global
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin_global') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Obtenir dades del body
  const body = await request.json();
  const { name, zone_id, is_active } = body;

  const updates: any = {};
  
  if (name !== undefined) {
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nom del centre ha de tenir almenys 2 caràcters' },
        { status: 400 }
      );
    }
    updates.name = name.trim();
  }
  
  if (zone_id !== undefined) {
    if (!zone_id) {
      return NextResponse.json(
        { error: 'Cal seleccionar una zona' },
        { status: 400 }
      );
    }
    updates.zone_id = zone_id;
  }
  
  if (is_active !== undefined) {
    updates.is_active = is_active;
  }

  // Actualitzar centre
  const { data: center, error } = await supabase
    .from('centers')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      zones (
        id,
        name
      )
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ja existeix un centre amb aquest nom' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'La zona seleccionada no existeix' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!center) {
    return NextResponse.json({ error: 'Centre no trobat' }, { status: 404 });
  }

  return NextResponse.json({ center });
}
