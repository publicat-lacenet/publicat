import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  
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

  // Obtenir totes les zones
  const { data: zones, error } = await supabase
    .from('zones')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ zones });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  
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
  const { name, is_active = true } = body;

  // Validació
  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'El nom de la zona ha de tenir almenys 2 caràcters' },
      { status: 400 }
    );
  }

  // Crear zona
  const { data: zone, error } = await supabase
    .from('zones')
    .insert({ name: name.trim(), is_active })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ja existeix una zona amb aquest nom' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ zone }, { status: 201 });
}
