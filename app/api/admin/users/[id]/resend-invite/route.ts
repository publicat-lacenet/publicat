import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: userId } = await params

  // Verificar autenticació
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })
  }

  // Verificar que és admin_global
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin_global') {
    return NextResponse.json({ error: 'Permís denegat' }, { status: 403 })
  }

  // Obtenir informació de l'usuari
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('email, onboarding_status, last_invitation_sent_at')
    .eq('id', userId)
    .single()

  if (userError || !targetUser) {
    return NextResponse.json({ error: 'Usuari no trobat' }, { status: 404 })
  }

  // Verificar que l'usuari està en estat 'invited'
  if (targetUser.onboarding_status !== 'invited') {
    return NextResponse.json(
      { error: "Només es pot reenviar invitació a usuaris en estat 'Convidat'" },
      { status: 400 }
    )
  }

  // Cooldown: verificar que han passat almenys 5 minuts des de l'última invitació
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

  // Crear client admin amb service role key
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Reenviar invitació
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    targetUser.email,
    {
      redirectTo: `${request.nextUrl.origin}/auth/confirm`,
    }
  )

  if (inviteError) {
    return NextResponse.json(
      { error: 'Error al reenviar la invitació: ' + inviteError.message },
      { status: 500 }
    )
  }

  // Actualitzar timestamp de l'última invitació
  const { error: updateError } = await supabase
    .from('users')
    .update({ last_invitation_sent_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) {
    console.error('Error actualitzant timestamp:', updateError)
    // No retornem error perquè la invitació s'ha enviat correctament
  }

  return NextResponse.json({
    message: 'Invitació reenviada correctament',
  })
}
