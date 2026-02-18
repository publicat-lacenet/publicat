import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Publicat/1.0 (https://publicat.cat)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
});

function extractImage(item: Parser.Item): string | null {
  const anyItem = item as any;
  if (anyItem.enclosure?.url) return anyItem.enclosure.url;
  if (anyItem['media:content']?.['$']?.url) return anyItem['media:content']['$'].url;
  if (anyItem['media:thumbnail']?.['$']?.url)
    return anyItem['media:thumbnail']['$'].url;
  const content = item.content || item.contentSnippet || '';
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];
  return null;
}

// POST /api/rss/[id]/retry - Reintentar fetch d'un feed amb errors
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Verificar autenticació
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  // Obtenir dades de l'usuari de la BD
  const { data: dbUser } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single();

  const role = dbUser?.role || user.user_metadata?.role;
  const userCenterId = dbUser?.center_id || user.user_metadata?.center_id;

  // Verificar permisos
  if (role !== 'editor_profe' && role !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per gestionar feeds RSS' },
      { status: 403 }
    );
  }

  // Obtenir el feed existent
  const { data: existingFeed, error: fetchError } = await supabase
    .from('rss_feeds')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingFeed) {
    return NextResponse.json({ error: 'Feed no trobat' }, { status: 404 });
  }

  // Verificar que l'usuari pot modificar aquest feed
  if (role === 'editor_profe' && existingFeed.center_id !== userCenterId) {
    return NextResponse.json(
      { error: 'No tens permisos per modificar aquest feed' },
      { status: 403 }
    );
  }

  try {
    // Intentar fetch del feed
    const feed = await parser.parseURL(existingFeed.url);

    if (!feed.items || feed.items.length === 0) {
      return NextResponse.json(
        { error: 'El feed no conté cap ítem' },
        { status: 400 }
      );
    }

    // Processar ítems - UPSERT per guid
    const itemsToUpsert = feed.items.slice(0, 50).map(item => ({
      feed_id: id,
      guid: item.guid || item.link || item.title || `${Date.now()}-${Math.random()}`,
      title: item.title || 'Sense títol',
      description: item.contentSnippet?.substring(0, 1000) || item.content?.substring(0, 1000) || null,
      link: item.link || '',
      pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      image_url: extractImage(item),
      fetched_at: new Date().toISOString(),
    }));

    // Usar admin client per bypassing RLS (rss_items no té INSERT policy per usuaris)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Inserir o actualitzar ítems
    for (const item of itemsToUpsert) {
      await supabaseAdmin
        .from('rss_items')
        .upsert(item, { onConflict: 'feed_id,guid' });
    }

    // Actualitzar el feed - reset errors i marcar com actiu
    const { data: updatedFeed, error: updateError } = await supabaseAdmin
      .from('rss_feeds')
      .update({
        is_active: true,
        error_count: 0,
        last_error: null,
        last_fetched_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating feed:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      feed: updatedFeed,
      items_fetched: itemsToUpsert.length,
      message: 'Feed actualitzat correctament',
    });
  } catch (error: any) {
    console.error('Error retrying feed:', error);

    // Actualitzar l'error però no desactivar (admin client per bypass RLS)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseAdmin
      .from('rss_feeds')
      .update({
        last_error: error.message || 'Error desconegut',
      })
      .eq('id', id);

    return NextResponse.json(
      { error: `Error al obtenir el feed: ${error.message || 'Error desconegut'}` },
      { status: 400 }
    );
  }
}
