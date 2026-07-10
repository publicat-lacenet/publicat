import { createClient as createAdminClient } from '@supabase/supabase-js';
import { deleteVimeoVideo } from '@/lib/vimeo/api';

type MediaCleanupJob = {
  id: string;
  video_id: string;
  resource_type: 'vimeo_video' | 'announcement_frame';
  resource_identifier: string;
  attempts: number;
};

export type MediaCleanupResult = {
  processed: number;
  completed: number;
  pending: number;
  errors: string[];
};

type ProcessOptions = {
  limit?: number;
  videoId?: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('La configuració de Supabase del servidor no està disponible');
  }

  return createAdminClient(url, key);
}

function nextAttemptAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

/** Processa treballs pendents de forma idempotent. */
export async function processMediaCleanupJobs(
  options: ProcessOptions = {}
): Promise<MediaCleanupResult> {
  const admin = getAdminClient();
  const limit = options.limit ?? 20;
  let query = admin
    .from('media_cleanup_jobs')
    .select('id, video_id, resource_type, resource_identifier, attempts')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(limit);

  if (options.videoId) {
    query = query.eq('video_id', options.videoId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`No s'han pogut obtenir les neteges pendents: ${error.message}`);
  }

  const result: MediaCleanupResult = {
    processed: 0,
    completed: 0,
    pending: 0,
    errors: [],
  };

  for (const job of (data || []) as MediaCleanupJob[]) {
    result.processed++;

    try {
      if (job.resource_type === 'vimeo_video') {
        await deleteVimeoVideo(job.resource_identifier);
      } else {
        const { error: storageError } = await admin.storage
          .from('announcement-frames')
          .remove([job.resource_identifier]);

        if (storageError) {
          throw new Error(`No s'ha pogut eliminar el fotograma: ${storageError.message}`);
        }
      }

      const { error: completeError } = await admin
        .from('media_cleanup_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', job.id);

      if (completeError) {
        throw new Error(`No s'ha pogut confirmar la neteja: ${completeError.message}`);
      }

      result.completed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconegut';
      result.errors.push(message);
      result.pending++;

      const { error: retryError } = await admin
        .from('media_cleanup_jobs')
        .update({
          attempts: job.attempts + 1,
          last_error: message,
          next_attempt_at: nextAttemptAt(),
        })
        .eq('id', job.id);

      if (retryError) {
        console.error('[media-cleanup] No s\'ha pogut programar el reintent:', retryError.message);
      }
    }
  }

  let remainingQuery = admin
    .from('media_cleanup_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (options.videoId) {
    remainingQuery = remainingQuery.eq('video_id', options.videoId);
  }

  const { count, error: remainingError } = await remainingQuery;
  if (remainingError) {
    throw new Error(`No s'ha pogut comprovar la neteja pendent: ${remainingError.message}`);
  }

  result.pending = count || 0;

  return result;
}
