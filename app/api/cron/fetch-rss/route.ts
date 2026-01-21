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

// GET /api/cron/fetch-rss - Cron job per actualitzar feeds RSS
export async function GET(request: NextRequest) {
  // Verificar autorització del cron job
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // En producció, verificar el secret
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
    }
  }

  // Crear client admin amb service role per bypassing RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = {
    processed: 0,
    success: 0,
    errors: 0,
    disabled: 0,
    // Nota: 'skipped' eliminat - amb Vercel Hobby el cron només s'executa 1x/dia
    details: [] as Array<{ feed_id: string; name: string; status: string; items?: number; error?: string }>,
  };

  try {
    // Obtenir tots els feeds actius amb error_count < 5
    const { data: feeds, error: feedsError } = await supabaseAdmin
      .from('rss_feeds')
      .select('id, name, url, center_id, error_count')
      .eq('is_active', true)
      .lt('error_count', 5);

    if (feedsError) {
      console.error('Error fetching feeds:', feedsError);
      return NextResponse.json({ error: feedsError.message }, { status: 500 });
    }

    if (!feeds || feeds.length === 0) {
      return NextResponse.json({
        message: 'No hi ha feeds actius per processar',
        results,
      });
    }

    // Processar tots els feeds
    // Nota: Amb Vercel Hobby, el cron només s'executa 1x/dia (mitjanit UTC)
    // Per tant, processem TOTS els feeds sense comprovar refresh_minutes
    for (const feed of feeds) {
      results.processed++;

      try {
        // Fetch i parse del feed
        const parsedFeed = await parser.parseURL(feed.url);

        if (!parsedFeed.items || parsedFeed.items.length === 0) {
          throw new Error('Feed buit');
        }

        // Processar ítems - UPSERT per guid
        const itemsToUpsert = parsedFeed.items.slice(0, 50).map(item => ({
          feed_id: feed.id,
          guid: item.guid || item.link || item.title || `${Date.now()}-${Math.random()}`,
          title: item.title || 'Sense títol',
          description:
            item.contentSnippet?.substring(0, 1000) ||
            item.content?.substring(0, 1000) ||
            null,
          link: item.link || '',
          pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          image_url: extractImage(item),
          fetched_at: new Date().toISOString(),
        }));

        // Inserir o actualitzar ítems
        for (const item of itemsToUpsert) {
          await supabaseAdmin
            .from('rss_items')
            .upsert(item, { onConflict: 'feed_id,guid' });
        }

        // Eliminar ítems de més de 30 dies
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await supabaseAdmin
          .from('rss_items')
          .delete()
          .eq('feed_id', feed.id)
          .lt('fetched_at', thirtyDaysAgo.toISOString());

        // Actualitzar feed - reset errors
        await supabaseAdmin
          .from('rss_feeds')
          .update({
            error_count: 0,
            last_error: null,
            last_fetched_at: new Date().toISOString(),
          })
          .eq('id', feed.id);

        results.success++;
        results.details.push({
          feed_id: feed.id,
          name: feed.name,
          status: 'success',
          items: itemsToUpsert.length,
        });
      } catch (error: any) {
        console.error(`Error processing feed ${feed.name}:`, error);

        const newErrorCount = (feed.error_count || 0) + 1;
        const shouldDisable = newErrorCount >= 5;

        // Actualitzar feed amb error
        await supabaseAdmin
          .from('rss_feeds')
          .update({
            error_count: newErrorCount,
            last_error: error.message || 'Error desconegut',
            is_active: !shouldDisable,
          })
          .eq('id', feed.id);

        if (shouldDisable) {
          results.disabled++;
        }
        results.errors++;

        results.details.push({
          feed_id: feed.id,
          name: feed.name,
          status: shouldDisable ? 'disabled' : 'error',
          error: error.message || 'Error desconegut',
        });
      }
    }

    return NextResponse.json({
      message: 'Cron job completat',
      results,
    });
  } catch (error: any) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Error inesperat' },
      { status: 500 }
    );
  }
}
