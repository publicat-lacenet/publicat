export const MAX_ANNOUNCEMENT_FRAMES = 30;
export const MAX_ANNOUNCEMENT_FRAME_BYTES = 128 * 1024;
export const ANNOUNCEMENT_FRAMES_BUCKET = 'announcement-frames';

type Profile = { role: string; center_id: string | null; is_active: boolean };
type Video = { type: string; center_id: string | null; uploaded_by_user_id: string | null; is_active: boolean; status: string };

export function canUploadAnnouncementFrames(profile: Profile | null, video: Video, userId: string): boolean {
  if (!profile?.is_active || !video.is_active || video.type !== 'announcement') return false;
  if (profile.role === 'admin_global') return true;
  if (!profile.center_id || profile.center_id !== video.center_id) return false;
  if (profile.role === 'editor_profe') return true;
  return profile.role === 'editor_alumne' && video.uploaded_by_user_id === userId &&
    ['pending_approval', 'needs_revision'].includes(video.status);
}

export async function validateAnnouncementFrames(files: FormDataEntryValue[]): Promise<File[]> {
  if (files.length < 1 || files.length > MAX_ANNOUNCEMENT_FRAMES) {
    throw new Error('Cal enviar entre 1 i 30 captures');
  }
  for (const file of files) {
    if (!(file instanceof File) || file.type !== 'image/jpeg' || file.size < 4 || file.size > MAX_ANNOUNCEMENT_FRAME_BYTES) {
      throw new Error('Cada captura ha de ser JPEG i ocupar com a màxim 128 KiB');
    }
    const signature = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    if (signature[0] !== 0xff || signature[1] !== 0xd8 || signature[2] !== 0xff) {
      throw new Error('La captura no és un JPEG vàlid');
    }
  }
  return files as File[];
}
