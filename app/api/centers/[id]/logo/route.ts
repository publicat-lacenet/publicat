import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { validateCenterLogo } from '@/lib/center-logo'
import { createClient } from '@/utils/supabase/server'

const LOGOS_BUCKET = 'center-logos'

function storagePathFromUrl(url: string | null) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${LOGOS_BUCKET}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : url.slice(index + marker.length)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: centerId } = await params
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single()

  const canEdit = profile?.role === 'admin_global' || (profile?.role === 'editor_profe' && profile.center_id === centerId)
  if (!canEdit) return NextResponse.json({ error: 'No tens permisos per modificar el logo d’aquest centre' }, { status: 403 })

  const formData = await request.formData()
  const logo = formData.get('logo')
  if (!(logo instanceof File)) return NextResponse.json({ error: 'Cal seleccionar un logo' }, { status: 400 })

  try {
    const { extension } = await validateCenterLogo(logo)
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .select('logo_url')
      .eq('id', centerId)
      .single()

    if (centerError || !center) return NextResponse.json({ error: 'Centre no trobat' }, { status: 404 })

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const path = `${centerId}/logo-${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await admin.storage.from(LOGOS_BUCKET).upload(path, logo, {
      contentType: logo.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw new Error('No s’ha pogut pujar el logo')

    const { data: publicUrl } = admin.storage.from(LOGOS_BUCKET).getPublicUrl(path)
    const { data: updatedCenter, error: updateError } = await admin
      .from('centers')
      .update({ logo_url: publicUrl.publicUrl })
      .eq('id', centerId)
      .select('id, name, logo_url')
      .single()

    if (updateError || !updatedCenter) {
      await admin.storage.from(LOGOS_BUCKET).remove([path])
      throw new Error('No s’ha pogut desar el logo del centre')
    }

    const oldPath = storagePathFromUrl(center.logo_url)
    if (oldPath) await admin.storage.from(LOGOS_BUCKET).remove([oldPath])

    return NextResponse.json({ center: updatedCenter })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error pujant el logo' }, { status: 400 })
  }
}
