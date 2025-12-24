import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// PATCH /api/admin/users/[id] - Actualitzar usuari
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Verificar que l'usuari és admin_global
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin_global') {
    return NextResponse.json(
      { error: 'Només admin_global pot actualitzar usuaris' },
      { status: 403 }
    );
  }

  // Crear client admin per evitar problemes RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { role, center_id, is_active, full_name, phone } = body;

  // Construir objecte d'actualització
  const updates: {
    role?: string;
    center_id?: string | null;
    is_active?: boolean;
    full_name?: string | null;
    phone?: string | null;
  } = {};

  if (full_name !== undefined) {
    updates.full_name = full_name || null;
  }

  if (phone !== undefined) {
    updates.phone = phone || null;
  }

  if (role !== undefined) {
    if (!['admin_global', 'editor_profe', 'editor_alumne', 'display'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol no vàlid' },
        { status: 400 }
      );
    }
    updates.role = role;

    // Si canviem a admin_global, eliminem center_id
    if (role === 'admin_global') {
      updates.center_id = null;
    }
  }

  if (center_id !== undefined) {
    // Si estem canviant el center_id, validar que si no és admin_global, té center_id
    if (!role) {
      // Necessitem obtenir el rol actual
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', id)
        .maybeSingle();
      
      const currentRole = currentUser?.role;
      
      if (currentRole !== 'admin_global' && !center_id) {
        return NextResponse.json(
          { error: 'center_id és obligatori per rols no admin_global' },
          { status: 400 }
        );
      }
    } else if (role !== 'admin_global' && !center_id) {
      return NextResponse.json(
        { error: 'center_id és obligatori per rols no admin_global' },
        { status: 400 }
      );
    }

    updates.center_id = center_id;
  }

  if (is_active !== undefined) {
    updates.is_active = is_active;
  }

  // Si no hi ha res a actualitzar
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No hi ha camps per actualitzar' },
      { status: 400 }
    );
  }

  try {
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        centers (
          id,
          name,
          zones (
            id,
            name
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error updating user:', error);

      // Foreign key error (center_id no existeix)
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'El centre especificat no existeix' },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al actualitzar usuari' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Eliminar usuari (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Verificar que l'usuari és admin_global
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin_global') {
    return NextResponse.json(
      { error: 'Només admin_global pot eliminar usuaris' },
      { status: 403 }
    );
  }

  // No permetre que un admin s'elimini a si mateix
  if (user.id === id) {
    return NextResponse.json(
      { error: 'No pots eliminar el teu propi usuari' },
      { status: 400 }
    );
  }

  // Crear client admin per evitar problemes RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Soft delete: desactivar usuari
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Usuari desactivat correctament' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al eliminar usuari' },
      { status: 500 }
    );
  }
}
