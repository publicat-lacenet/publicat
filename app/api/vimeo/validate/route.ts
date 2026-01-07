import { NextRequest, NextResponse } from 'next/server';
import { extractVimeoId, getVimeoVideoData } from '@/lib/vimeo';

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
    
    // Obtenir metadades de Vimeo
    const data = await getVimeoVideoData(videoId);
    
    if (!data.isAccessible) {
      return NextResponse.json(
        { error: 'Aquest vídeo no és accessible públicament a Vimeo' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      videoId,
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
      description: data.description,
    });
    
  } catch (error: any) {
    console.error('Error validating Vimeo URL:', error);
    
    if (error.message === 'VIDEO_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Vídeo no trobat a Vimeo' },
        { status: 404 }
      );
    }
    
    if (error.message === 'VIDEO_PRIVATE') {
      return NextResponse.json(
        { error: 'Aquest vídeo és privat o té contrasenya' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error de connexió amb Vimeo' },
      { status: 500 }
    );
  }
}
