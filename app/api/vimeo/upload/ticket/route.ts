import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'No autenticat' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (
    profile?.role !== 'admin_global' &&
    profile?.role !== 'editor_profe' &&
    profile?.role !== 'editor_alumne'
  ) {
    return NextResponse.json(
      { error: 'No tens permisos per pujar vídeos' },
      { status: 403 }
    );
  }

  if (!process.env.VIMEO_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'La integració amb Vimeo no està configurada' },
      { status: 500 }
    );
  }
  
  try {
    const { file_size, file_name } = await request.json();
    
    if (!file_size || file_size <= 0) {
      return NextResponse.json(
        { error: 'Mida de fitxer invàlida' },
        { status: 400 }
      );
    }
    
    const MAX_SIZE = parseInt(process.env.MAX_VIDEO_SIZE_MB || '2048') * 1024 * 1024;
    if (file_size > MAX_SIZE) {
      return NextResponse.json(
        { error: `El fitxer supera la mida màxima de ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }
    
    // Crear ticket d'upload a Vimeo
    const response = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
      body: JSON.stringify({
        upload: {
          approach: 'tus',
          size: file_size,
        },
        name: file_name || 'Vídeo sense títol',
        description: 'Pujat des de Publicat',
        privacy: {
          view: 'unlisted', // Ocult per defecte
          embed: 'public',
        },
      }),
    });
    
    if (!response.ok) {
      console.error('Error Vimeo API creating upload ticket:', response.status);
      return NextResponse.json(
        { error: 'Error creant upload ticket a Vimeo' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      upload_link: data.upload.upload_link,
      video_uri: data.uri,
      video_id: data.uri.split('/').pop(),
    });
    
  } catch (error) {
    console.error('Error creating Vimeo upload ticket:', error);
    return NextResponse.json(
      { error: 'Error de servidor' },
      { status: 500 }
    );
  }
}
