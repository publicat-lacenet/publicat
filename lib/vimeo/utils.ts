/**
 * Extreu l'ID del vídeo d'una URL de Vimeo
 */
export function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extreu l'ID i el hash d'una URL de Vimeo (per vídeos unlisted)
 * URL format: https://vimeo.com/1156841645/d354baa5d1
 */
export function extractVimeoIdAndHash(url: string): { id: string; hash: string | null } | null {
  // Pattern per URLs amb hash: vimeo.com/ID/HASH
  const hashPattern = /vimeo\.com\/(\d+)\/([a-zA-Z0-9]+)/;
  const hashMatch = url.match(hashPattern);

  if (hashMatch) {
    return {
      id: hashMatch[1],
      hash: hashMatch[2],
    };
  }

  // Fallback: només ID sense hash
  const id = extractVimeoId(url);
  if (id) {
    return {
      id,
      hash: null,
    };
  }

  return null;
}

/**
 * Valida si una URL és de Vimeo
 */
export function isValidVimeoUrl(url: string): boolean {
  return extractVimeoId(url) !== null;
}

/**
 * Formata la durada en segons a format MM:SS
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Obté la URL del thumbnail d'un vídeo de Vimeo sense API
 * Utilitza l'endpoint oEmbed públic de Vimeo
 */
export async function getVimeoThumbnail(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch {
    return null;
  }
}
