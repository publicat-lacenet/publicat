import { createClient } from '@/utils/supabase/server';
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
  // Intentar diferents fonts d'imatge
  const anyItem = item as any;
  if (anyItem.enclosure?.url) return anyItem.enclosure.url;
  if (anyItem['media:content']?.['$']?.url) return anyItem['media:content']['$'].url;
  if (anyItem['media:thumbnail']?.['$']?.url)
    return anyItem['media:thumbnail']['$'].url;
  // Extreure del contingut HTML
  const content = item.content || item.contentSnippet || '';
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];
  return null;
}

// POST /api/rss/validate - Validar feed RSS sense guardar-lo
export async function POST(request: NextRequest) {
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
    .select('role')
    .eq('id', user.id)
    .single();

  const role = dbUser?.role || user.user_metadata?.role;

  // Verificar permisos - només editor_profe i admin_global
  if (role !== 'editor_profe' && role !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per gestionar feeds RSS' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json(
      { valid: false, error: 'MISSING_URL', message: 'URL és obligatòria' },
      { status: 400 }
    );
  }

  // Validar format d'URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error('Protocol invalid');
    }
  } catch {
    return NextResponse.json(
      { valid: false, error: 'INVALID_URL', message: 'URL no vàlida' },
      { status: 400 }
    );
  }

  try {
    // Fetch i parse del feed
    const feed = await parser.parseURL(url);

    // Verificar que té ítems
    if (!feed.items || feed.items.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'EMPTY_FEED', message: 'El feed no conté cap ítem' },
        { status: 400 }
      );
    }

    // Generar preview dels 3 primers ítems
    const preview = feed.items.slice(0, 3).map(item => ({
      title: item.title || 'Sense títol',
      description: item.contentSnippet?.substring(0, 200) || item.content?.substring(0, 200) || null,
      link: item.link || null,
      pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      image_url: extractImage(item),
    }));

    return NextResponse.json({
      valid: true,
      feed_title: feed.title || 'Feed sense títol',
      item_count: feed.items.length,
      preview,
    });
  } catch (error: any) {
    console.error('Error parsing RSS feed:', error);

    // Determinar tipus d'error
    let errorType = 'UNKNOWN_ERROR';
    let message = 'Error desconegut al processar el feed';

    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      errorType = 'TIMEOUT';
      message = 'El feed no ha respost a temps (màxim 10 segons)';
    } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      errorType = 'NOT_FOUND';
      message = 'No s\'ha pogut connectar amb el servidor del feed';
    } else if (error.message?.includes('Non-whitespace before first tag') ||
               error.message?.includes('Unexpected close tag') ||
               error.message?.includes('not well-formed')) {
      errorType = 'INVALID_FORMAT';
      message = 'El contingut no és un feed RSS/Atom vàlid';
    } else if (error.statusCode === 404 || error.message?.includes('404')) {
      errorType = 'NOT_FOUND';
      message = 'Feed no trobat (404)';
    } else if (error.statusCode === 403 || error.message?.includes('403')) {
      errorType = 'FORBIDDEN';
      message = 'Accés denegat al feed (403)';
    }

    return NextResponse.json(
      { valid: false, error: errorType, message },
      { status: 400 }
    );
  }
}
