export interface VimeoVideoData {
  title: string;
  description: string | null;
  thumbnail: string;
  duration: number;
  isAccessible: boolean;
  privacy: string;
}

/**
 * Obté les metadades d'un vídeo de Vimeo
 */
export async function getVimeoVideoData(
  videoId: string
): Promise<VimeoVideoData> {
  const response = await fetch(
    `https://api.vimeo.com/videos/${videoId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
      next: { revalidate: 3600 }, // Cache 1 hora
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('VIDEO_NOT_FOUND');
    }
    if (response.status === 403) {
      throw new Error('VIDEO_PRIVATE');
    }
    throw new Error('VIMEO_API_ERROR');
  }
  
  const data = await response.json();
  
  // Seleccionar thumbnail de 640px
  const thumbnail = data.pictures?.sizes?.find((s: any) => s.width === 640)?.link 
    || data.pictures?.sizes?.[0]?.link
    || '';
  
  // Acceptar vídeos públics (anybody) i ocults (unlisted)
  // Rebutjar vídeos amb contrasenya (password) o privats (disable)
  const privacy = data.privacy?.view || 'unknown';
  const isAccessible = privacy === 'anybody' || privacy === 'unlisted';

  return {
    title: data.name || '',
    description: data.description || null,
    thumbnail,
    duration: data.duration || 0,
    isAccessible,
    privacy,
  };
}
