import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const CACHE_MAX_AGE_SECONDS = 300;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { centers: [], error: 'Configuració del servidor incompleta' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: centers, error } = await supabase
    .from('centers')
    .select('id, name, logo_url')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error carregant els centres de la landing:', error.message);
    return NextResponse.json(
      { centers: [], error: 'No s’han pogut carregar els centres participants' },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    centers: (centers ?? []).map((center) => ({
      id: center.id,
      name: center.name,
      logo_url: center.logo_url || '/logo_videos.png',
    })),
  });

  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=600`
  );

  return response;
}
