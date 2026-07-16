import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { validateCenterLogo } from '@/lib/center-logo';
import { createClient } from '@/utils/supabase/server';

const LOGOS_BUCKET = 'center-logos';

export async function GET() {
  const supabase = await createClient();

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

  // Obtenir tots els centres amb la seva zona
  const { data: centers, error } = await supabase
    .from('centers')
    .select(`
      *,
      zones (
        id,
        name
      )
    `)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ centers });
}

export async function POST(request: Request) {
  const supabase = await createClient();

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

  // Validar dades
  const formData = await request.formData();
  const name = formData.get('name');
  const zone_id = formData.get('zone_id');
  const logo = formData.get('logo');

  if (typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'El nom del centre ha de tenir almenys 2 caràcters' },
      { status: 400 }
    );
  }

  if (typeof zone_id !== 'string' || !zone_id) {
    return NextResponse.json(
      { error: 'Cal seleccionar una zona' },
      { status: 400 }
    );
  }

  if (!(logo instanceof File)) {
    return NextResponse.json({ error: 'Cal pujar el logo del centre' }, { status: 400 });
  }

  let extension: string;
  try {
    ({ extension } = await validateCenterLogo(logo));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'El logo no és vàlid' },
      { status: 400 }
    );
  }

  // Crear centre
  const { data: center, error } = await supabase
    .from('centers')
    .insert({
      name: name.trim(),
      zone_id,
      is_active: true,
    })
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

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const path = `${center.id}/logo-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage.from(LOGOS_BUCKET).upload(path, logo, {
    contentType: logo.type,
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    await admin.from('centers').delete().eq('id', center.id);
    return NextResponse.json({ error: 'No s’ha pogut pujar el logo. El centre no s’ha creat.' }, { status: 500 });
  }

  const { data: publicUrl } = admin.storage.from(LOGOS_BUCKET).getPublicUrl(path);
  const { data: centerWithLogo, error: logoError } = await admin
    .from('centers')
    .update({ logo_url: publicUrl.publicUrl })
    .eq('id', center.id)
    .select(`
      *,
      zones (
        id,
        name
      )
    `)
    .single();

  if (logoError || !centerWithLogo) {
    await admin.storage.from(LOGOS_BUCKET).remove([path]);
    await admin.from('centers').delete().eq('id', center.id);
    return NextResponse.json({ error: 'No s’ha pogut desar el logo. El centre no s’ha creat.' }, { status: 500 });
  }

  return NextResponse.json({ center: centerWithLogo }, { status: 201 });
}
