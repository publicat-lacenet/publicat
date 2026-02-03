import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: userId } = await params

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['editor_profe', 'admin_global'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permís denegat' }, { status: 403 })
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

  // Get target user and verify same center
  const { data: targetUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('email, center_id, onboarding_status, last_invitation_sent_at')
    .eq('id', userId)
    .single()

  if (userError || !targetUser) {
    return NextResponse.json({ error: 'Usuari no trobat' }, { status: 404 })
  }

  if (targetUser.center_id !== profile.center_id) {
    return NextResponse.json(
      { error: 'No pots reenviar invitacions a usuaris d\'un altre centre' },
      { status: 403 }
    )
  }

  if (targetUser.onboarding_status !== 'invited') {
    return NextResponse.json(
      { error: "Només es pot reenviar invitació a usuaris en estat 'Convidat'" },
      { status: 400 }
    )
  }

  // Cooldown: 5 minutes
  if (targetUser.last_invitation_sent_at) {
    const lastSent = new Date(targetUser.last_invitation_sent_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSent.getTime()) / 1000 / 60

    if (diffMinutes < 5) {
      const waitMinutes = Math.ceil(5 - diffMinutes)
      return NextResponse.json(
        {
          error: `Has d'esperar ${waitMinutes} minut${waitMinutes > 1 ? 's' : ''} abans de reenviar la invitació`,
        },
        { status: 429 }
      )
    }
  }

  const { error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(targetUser.email, {
      redirectTo: `${request.nextUrl.origin}/auth/confirm`,
    })

  if (inviteError) {
    return NextResponse.json(
      { error: 'Error al reenviar la invitació: ' + inviteError.message },
      { status: 500 }
    )
  }

  // Update last invitation timestamp
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ last_invitation_sent_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) {
    console.error('Error actualitzant timestamp:', updateError)
  }

  return NextResponse.json({
    message: 'Invitació reenviada correctament',
  })
}
