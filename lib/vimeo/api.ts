export type VimeoDeleteResult = {
  deleted: boolean;
  alreadyMissing: boolean;
};

/**
 * Elimina un vídeo de Vimeo per ID.
 * Un 404 confirma que el recurs ja no existeix; qualsevol altre error es propaga
 * perquè la cua de neteja el pugui reintentar.
 */
export async function deleteVimeoVideo(vimeoId: string): Promise<VimeoDeleteResult> {
  if (!vimeoId) {
    throw new Error('No s\'ha indicat cap identificador de Vimeo');
  }

  if (!process.env.VIMEO_ACCESS_TOKEN) {
    throw new Error('La integració amb Vimeo no està configurada');
  }

  const response = await fetch(
    `https://api.vimeo.com/videos/${encodeURIComponent(vimeoId)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
    }
  );

  if (response.status === 404) {
    return { deleted: false, alreadyMissing: true };
  }

  if (response.status === 204) {
    return { deleted: true, alreadyMissing: false };
  }

  throw new Error(`Vimeo ha retornat HTTP ${response.status} en eliminar el vídeo`);
}

export interface VimeoVideoData {
  title: string;
  description: string | null;
  thumbnail: string;
  duration: number;
  isAccessible: boolean;
  privacy: string;
}

type VimeoApiResponse = {
  pictures?: { sizes?: Array<{ width?: number; link?: string }> };
  privacy?: { view?: string };
  name?: string;
  description?: string | null;
  duration?: number;
};

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
  
  const data = await response.json() as VimeoApiResponse;
  
  // Seleccionar thumbnail de 640px
  const thumbnail = data.pictures?.sizes?.find((s) => s.width === 640)?.link
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
