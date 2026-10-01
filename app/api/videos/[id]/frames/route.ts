import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { ANNOUNCEMENT_FRAMES_BUCKET, canUploadAnnouncementFrames, validateAnnouncementFrames } from '@/lib/display/announcementFrames';

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role, center_id, is_active').eq('id', user.id).single();
  const { data: video } = await supabase.from('videos')
    .select('id, type, center_id, uploaded_by_user_id, is_active, status, vimeo_id, frames_urls')
    .eq('id', id).single();
  if (!video) return NextResponse.json({ error: 'Vídeo no trobat' }, { status: 404 });
  if (!canUploadAnnouncementFrames(profile, video, user.id)) {
    return NextResponse.json({ error: 'No tens permisos per desar captures d’aquest anunci' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length')) > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Les captures superen la mida permesa' }, { status: 413 });
  }
  let files: File[];
  try {
    const form = await request.formData();
    if (!video.vimeo_id || form.get('vimeo_id') !== video.vimeo_id) {
      return NextResponse.json({ error: 'El vídeo ha canviat; torna a carregar l’anunci' }, { status: 409 });
    }
    files = await validateAnnouncementFrames(form.getAll('frames'));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Captures no vàlides' }, { status: 400 });
  }
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const bucket = admin.storage.from(ANNOUNCEMENT_FRAMES_BUCKET);
  const prefix = id + '/' + crypto.randomUUID();
  const paths: string[] = [];
  const urls: string[] = [];
  // Les captures només es fan visibles al vídeo quan s'ha completat tot el lot.
  const oldUrls: string[] = Array.isArray(video.frames_urls) ? video.frames_urls : [];
  async function queueCleanup(cleanupPaths: string[]) {
    if (!cleanupPaths.length) return;
    const { error } = await admin.from('media_cleanup_jobs').upsert(cleanupPaths.map(resource_identifier => ({
      video_id: id, resource_type: 'announcement_frame', resource_identifier,
    })), { onConflict: 'resource_type,resource_identifier', ignoreDuplicates: true });
    if (error) console.error('No s’ha pogut programar la neteja de captures:', error.message);
  }
  try {
    for (let i = 0; i < files.length; i++) {
      const objectPath = prefix + '/frame_' + i + '.jpg';
      const { error } = await bucket.upload(objectPath, files[i], { contentType: 'image/jpeg', upsert: false });
      if (error) throw new Error('No s’han pogut pujar les captures');
      paths.push(objectPath);
      urls.push(bucket.getPublicUrl(objectPath).data.publicUrl);
    }
    const { data: updated, error } = await admin.from('videos').update({ frames_urls: urls })
      .eq('id', id).eq('type', 'announcement').eq('is_active', true).eq('vimeo_id', video.vimeo_id)
      .eq('status', video.status).eq('center_id', video.center_id)
      .eq('frames_urls', JSON.stringify(oldUrls)).select('id').single();
    if (error || !updated) throw new Error('L’anunci ha canviat o no s’han pogut desar les captures');
  } catch (error) {
    if (paths.length) {
      const { error: removeError } = await bucket.remove(paths);
      if (removeError) await queueCleanup(paths);
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error desant captures' }, { status: 500 });
  }
  const marker = '/storage/v1/object/public/' + ANNOUNCEMENT_FRAMES_BUCKET + '/';
  const oldPaths = oldUrls.flatMap(url => {
    const relative = url.split(marker)[1];
    return relative?.startsWith(id + '/') && !relative.includes('..') && /^[a-zA-Z0-9_./-]+$/.test(relative) ? [relative] : [];
  });
  if (oldPaths.length) {
    const { error: removeError } = await bucket.remove(oldPaths);
    if (removeError) await queueCleanup(oldPaths);
  }
  return NextResponse.json({ frames_urls: urls });
}
