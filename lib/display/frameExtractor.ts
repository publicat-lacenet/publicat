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
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onerror = () => {
      cleanup();
      reject(new Error('No s\'ha pogut carregar el vídeo per extreure fotogrames'));
    };

    video.onloadedmetadata = async () => {
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
      for (let t = 0; t < duration - 0.5; t += intervalSeconds) {
        timestamps.push(t);
      }
      if (timestamps.length === 0) {
        timestamps.push(0);
      }

      const blobs: Blob[] = [];

      for (const timestamp of timestamps) {
        try {
          const blob = await seekAndCapture(video, canvas, ctx, timestamp);
          if (blob) blobs.push(blob);
        } catch {
          // Ignorar errors en frames individuals
        }
      }

      cleanup();
      resolve(blobs);
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

    video.currentTime = timestamp;
  });
}
