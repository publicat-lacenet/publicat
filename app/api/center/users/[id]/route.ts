import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// PATCH /api/center/users/[id] - Actualitzar usuari del centre
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

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
      { error: 'Només editor_profe o admin_global poden actualitzar usuaris' },
      { status: 403 }
    )
  }

  if (!profile.center_id) {
    return NextResponse.json(
      { error: 'Usuari sense centre assignat' },
      { status: 400 }
    )
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify target user belongs to same center
  const { data: targetUser, error: targetError } = await supabaseAdmin
    .from('users')
    .select('id, role, center_id, is_active')
    .eq('id', id)
    .single()

  if (targetError || !targetUser) {
    return NextResponse.json({ error: 'Usuari no trobat' }, { status: 404 })
  }

  if (targetUser.center_id !== profile.center_id) {
    return NextResponse.json(
      { error: 'No pots modificar usuaris d\'un altre centre' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { role, is_active, full_name } = body

  // Build update object
  const updates: {
    role?: string
    is_active?: boolean
    full_name?: string | null
  } = {}

  if (full_name !== undefined) {
    updates.full_name = full_name || null
  }

  if (role !== undefined) {
    if (!['editor_profe', 'editor_alumne', 'display'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol no vàlid. Rols permesos: editor_profe, editor_alumne, display' },
        { status: 400 }
      )
    }

    // No self role change
    if (user.id === id) {
      return NextResponse.json(
        { error: 'No pots canviar el teu propi rol' },
        { status: 400 }
      )
    }

    // If changing FROM editor_profe, ensure at least 1 active editor_profe remains
    if (targetUser.role === 'editor_profe' && role !== 'editor_profe') {
      const { count } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', profile.center_id)
        .eq('role', 'editor_profe')
        .eq('is_active', true)
        .neq('id', id)

      if (!count || count < 1) {
        return NextResponse.json(
          { error: 'Cal com a mínim un editor_profe actiu al centre' },
          { status: 400 }
        )
      }
    }

    updates.role = role
  }

  if (is_active !== undefined) {
    // No self deactivation
    if (user.id === id && !is_active) {
      return NextResponse.json(
        { error: 'No pots desactivar el teu propi usuari' },
        { status: 400 }
      )
    }

    // If deactivating an editor_profe, ensure at least 1 remains
    if (!is_active && targetUser.role === 'editor_profe' && targetUser.is_active) {
      const { count } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', profile.center_id)
        .eq('role', 'editor_profe')
        .eq('is_active', true)
        .neq('id', id)

      if (!count || count < 1) {
        return NextResponse.json(
          { error: 'Cal com a mínim un editor_profe actiu al centre' },
          { status: 400 }
        )
      }
    }

    updates.is_active = is_active
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No hi ha camps per actualitzar' },
      { status: 400 }
    )
  }

  try {
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sync auth metadata if role changed
    if (updates.role) {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: { role: updates.role },
      })
    }

    return NextResponse.json({ user: updatedUser }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperat al actualitzar usuari' },
      { status: 500 }
    )
  }
}
