import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// GET /api/admin/users - Llistar usuaris amb filtres
export async function GET(request: Request) {
  const supabase = await createClient();

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
      { error: 'Només admin_global pot accedir a aquesta ruta' },
      { status: 403 }
    );
  }

  // Obtenir paràmetres de query
  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get('role');
  const centerFilter = searchParams.get('center_id');
  const statusFilter = searchParams.get('is_active');
  const searchEmail = searchParams.get('email');

  // Query base amb relacions
  let query = supabase
    .from('users')
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
    .order('created_at', { ascending: false });

  // Aplicar filtres
  if (roleFilter) {
    query = query.eq('role', roleFilter);
  }

  if (centerFilter) {
    query = query.eq('center_id', centerFilter);
  }

  if (statusFilter !== null && statusFilter !== undefined) {
    const isActive = statusFilter === 'true';
    query = query.eq('is_active', isActive);
  }

  if (searchEmail) {
    query = query.ilike('email', `%${searchEmail}%`);
  }

  const { data: users, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users }, { status: 200 });
}

// POST /api/admin/users - Crear usuari i enviar invitació
export async function POST(request: Request) {
  const supabase = await createClient();

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
      { error: 'Només admin_global pot crear usuaris' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { email, full_name, phone, role, center_id } = body;

  // Validació
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Email vàlid és obligatori' },
      { status: 400 }
    );
  }

  if (!role || !['admin_global', 'editor_profe', 'editor_alumne', 'display'].includes(role)) {
    return NextResponse.json(
      { error: 'Rol vàlid és obligatori' },
      { status: 400 }
    );
  }

  // Si el rol no és admin_global, cal un center_id
  if (role !== 'admin_global' && !center_id) {
    return NextResponse.json(
      { error: 'center_id és obligatori per rols no admin_global' },
      { status: 400 }
    );
  }

  try {
    // Crear client admin amb service role key
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Crear usuari a Supabase Auth i enviar invitació
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        center_id: role === 'admin_global' ? null : center_id,
      },
    });

    if (authError) {
      console.error('Error inviting user:', authError);
      
      // Errors comuns
      if (authError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Aquest email ja està registrat' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    // Crear perfil d'usuari a la taula users
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user?.id,
        email,
        full_name: full_name || null,
        phone: phone || null,
        role,
        center_id: role === 'admin_global' ? null : center_id,
        is_active: true,
        onboarding_status: 'invited',
      })
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

    if (insertError) {
      console.error('Error creating user profile:', insertError);
      
      // Si falla la inserció a users, intentar eliminar l'usuari d'Auth
      await supabase.auth.admin.deleteUser(authData.user?.id || '');
      
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al crear usuari' },
      { status: 500 }
    );
  }
}
