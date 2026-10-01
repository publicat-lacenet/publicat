import { MAX_ANNOUNCEMENT_FRAMES, MAX_ANNOUNCEMENT_FRAME_BYTES } from './announcementFrames';

/**
 * Extreu fotogrames JPEG d'un fitxer de vídeo local.
 * S'executa al navegador (canvas API).
 */
export async function extractFrames(
  file: File,
  intervalSeconds = 3,
): Promise<Blob[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const metadataTimeout = setTimeout(() => {
      cleanup();
      reject(new Error('El navegador no ha pogut carregar el vídeo per generar captures'));
    }, 15000);
    const cleanup = () => {
      clearTimeout(metadataTimeout);
      video.onerror = null;
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('No s\'ha pogut carregar el vídeo per extreure fotogrames'));
    };

    video.onloadedmetadata = async () => {
      clearTimeout(metadataTimeout);
      const duration = video.duration;
      if (!duration || !isFinite(duration) || duration <= 0) {
        cleanup();
        resolve([]);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        resolve([]);
        return;
      }

      // Calcular timestamps (excloure l'últim segon per evitar frames negres)
      const timestamps: number[] = [];
      for (let t = 0; t < duration - 0.5 && timestamps.length < MAX_ANNOUNCEMENT_FRAMES; t += intervalSeconds) {
        timestamps.push(t);
      }
      if (timestamps.length === 0) {
        timestamps.push(0);
      }

      const blobs: Blob[] = [];

      for (const timestamp of timestamps) {
        try {
          const blob = await seekAndCapture(video, canvas, ctx, timestamp);
          if (blob && blob.size <= MAX_ANNOUNCEMENT_FRAME_BYTES) blobs.push(blob);
        } catch {
          // Ignorar errors en frames individuals
        }
      }

      cleanup();
      if (!blobs.length) reject(new Error('No s’han pogut generar captures JPEG del vídeo'));
      else resolve(blobs);
    };

    video.src = url;
  });
}

function seekAndCapture(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  timestamp: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000);

    video.onseeked = () => {
      clearTimeout(timeout);
      video.onseeked = null;

      try {
        // Escalar a 640×360 mantenint proporcions
        const TARGET_W = 640;
        const TARGET_H = 360;
        const videoW = video.videoWidth || TARGET_W;
        const videoH = video.videoHeight || TARGET_H;

        const scale = Math.min(TARGET_W / videoW, TARGET_H / videoH);
        const drawW = Math.round(videoW * scale);
        const drawH = Math.round(videoH * scale);
        const offsetX = Math.round((TARGET_W - drawW) / 2);
        const offsetY = Math.round((TARGET_H - drawH) / 2);

        canvas.width = TARGET_W;
        canvas.height = TARGET_H;

        // Fons negre
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, TARGET_W, TARGET_H);
        ctx.drawImage(video, offsetX, offsetY, drawW, drawH);

        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          0.75,
        );
      } catch {
        resolve(null);
      }
    };

    // Evitar el seek a 0, que alguns navegadors no notifiquen amb seeked.
    video.currentTime = Math.min(Math.max(timestamp, 0.05), video.duration / 2 + timestamp / 2);
  });
}
