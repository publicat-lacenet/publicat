import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET /api/center/users - Llistar usuaris del centre de l'usuari autenticat
export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['editor_profe', 'admin_global'].includes(profile.role)) {
    return NextResponse.json(
      { error: 'Només editor_profe o admin_global poden accedir a aquesta ruta' },
      { status: 403 }
    )
  }

  if (!profile.center_id) {
    return NextResponse.json(
      { error: 'Usuari sense centre assignat' },
      { status: 400 }
    )
  }

  const { searchParams } = new URL(request.url)
  const roleFilter = searchParams.get('role')
  const statusFilter = searchParams.get('is_active')
  const search = searchParams.get('search')

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabaseAdmin
    .from('users')
    .select('*')
    .eq('center_id', profile.center_id)
    .order('created_at', { ascending: false })

  if (roleFilter) {
    query = query.eq('role', roleFilter)
  }

  if (statusFilter !== null && statusFilter !== undefined) {
    const isActive = statusFilter === 'true'
    query = query.eq('is_active', isActive)
  }

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data: users, error } = await query

  if (error) {
    console.error('Error fetching center users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users }, { status: 200 })
}

// POST /api/center/users - Crear usuari al centre i enviar invitació
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['editor_profe', 'admin_global'].includes(profile.role)) {
    return NextResponse.json(
      { error: 'Només editor_profe o admin_global poden crear usuaris' },
      { status: 403 }
    )
  }

  if (!profile.center_id) {
    return NextResponse.json(
      { error: 'Usuari sense centre assignat' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const { email, full_name, role } = body

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Email vàlid és obligatori' },
      { status: 400 }
    )
  }

  if (!role || !['editor_profe', 'editor_alumne', 'display'].includes(role)) {
    return NextResponse.json(
      { error: 'Rol vàlid és obligatori (editor_profe, editor_alumne, display)' },
      { status: 400 }
    )
  }

  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          role,
          center_id: profile.center_id,
        },
      })

    if (authError) {
      console.error('Error inviting user:', authError)

      if (authError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Aquest email ja està registrat' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user?.id,
        email,
        full_name: full_name || null,
        role,
        center_id: profile.center_id,
        is_active: true,
        onboarding_status: 'invited',
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Error creating user profile:', insertError)

      // Cleanup: delete auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user?.id || '')

      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperat al crear usuari' },
      { status: 500 }
    )
  }
}
