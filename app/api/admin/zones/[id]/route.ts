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
  const { name, is_active } = body;

  const updates: any = {};
  if (name !== undefined) {
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nom de la zona ha de tenir almenys 2 caràcters' },
        { status: 400 }
      );
    }
    updates.name = name.trim();
  }
  if (is_active !== undefined) {
    updates.is_active = is_active;
  }

  // Actualitzar zona
  const { data: zone, error } = await supabase
    .from('zones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ja existeix una zona amb aquest nom' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!zone) {
    return NextResponse.json({ error: 'Zona no trobada' }, { status: 404 });
  }

  return NextResponse.json({ zone });
}

export async function DELETE(
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

  // Verificar si hi ha centres associats
  const { count } = await supabase
    .from('centers')
    .select('*', { count: 'exact', head: true })
    .eq('zone_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `No es pot eliminar la zona perquè té ${count} centres associats` },
      { status: 409 }
    );
  }

  // Eliminar zona
  const { error } = await supabase
    .from('zones')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
