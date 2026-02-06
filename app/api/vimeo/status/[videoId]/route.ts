import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  // Verificar autenticació
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticat' }, { status: 401 });
  }

  const { videoId } = await params;

  try {
    const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Vídeo no trobat' },
        { status: 404 }
      );
    }
    
    const data = await response.json();
    
    // Extreure el hash de privacitat de la URL (per vídeos unlisted)
    // Format: https://vimeo.com/123456789/abc123def
    const linkParts = data.link?.split('/') || [];
    const vimeoHash = linkParts.length > 4 ? linkParts[4] : null;
    
    console.log('📊 Vimeo API response for video', videoId, ':', {
      status: data.status,
      link: data.link,
      vimeoHash,
      duration: data.duration,
      pictures: data.pictures?.sizes?.length || 0,
    });
    
    // Seleccionar thumbnail de 640px o el primer disponible
    const thumbnail = data.pictures?.sizes?.find((s: any) => s.width === 640)?.link 
      || data.pictures?.sizes?.[0]?.link
      || '';
    
    // Detectar si és el thumbnail placeholder de Vimeo (conté '/video/default')
    const isPlaceholder = thumbnail.includes('/video/default') || thumbnail.includes('i.vimeocdn.com/video/default');
    const hasRealThumbnail = thumbnail && !isPlaceholder;
    
    return NextResponse.json({
      status: data.status,
      transcode_status: data.transcode?.status || 'unknown',
      is_playable: data.status === 'available',
      link: data.link,
      vimeo_hash: vimeoHash,
      thumbnail,
      has_real_thumbnail: hasRealThumbnail,
      duration: data.duration || 0,
    });
    
  } catch (error) {
    console.error('Error checking Vimeo video status:', error);
    return NextResponse.json(
      { error: 'Error de servidor' },
      { status: 500 }
    );
  }
}
