import { NextRequest, NextResponse } from 'next/server';
import { extractVimeoId } from '@/lib/vimeo';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    // Validar format URL
    const videoId = extractVimeoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'URL de Vimeo no vàlida' },
        { status: 400 }
      );
    }
    
    // Utilitzar API oEmbed de Vimeo (funciona amb vídeos públics i ocults, sense autenticació)
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Vídeo no trobat a Vimeo' },
          { status: 404 }
        );
      }
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Aquest vídeo és privat o té contrasenya. Si us plau, configura\'l com a "Públic" o "Ocult" (unlisted) a Vimeo.' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Error obtenint metadades de Vimeo' },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      videoId,
      title: data.title || '',
      thumbnail: data.thumbnail_url || '',
      duration: data.duration || 0,
      description: data.description || null,
    });
    
  } catch (error: any) {
    console.error('Error validating Vimeo URL:', error);
    
    return NextResponse.json(
      { error: 'Error de connexió amb Vimeo' },
      { status: 500 }
    );
  }
}
