import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parseHashtagInput } from '@/lib/hashtags';
import { processMediaCleanupJobs } from '@/lib/media-cleanup';
import {
  normalizeVideoRetention,
  VideoRetentionPolicy,
  VideoRetentionValidationError,
} from '@/lib/video-retention';

type UserRole = 'admin_global' | 'editor_profe' | 'editor_alumne' | 'display';

type UserProfile = {
  role: UserRole;
  center_id: string | null;
};

type VideoUpdatePayload = {
  title?: string;
  description?: string | null;
  type?: string;
  status?: 'pending_approval' | 'published' | 'needs_revision';
  rejection_comment?: string | null;
  rejected_at?: string | null;
  rejected_by_user_id?: string | null;
  vimeo_url?: string;
  vimeo_id?: string;
  vimeo_hash?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  frames_urls?: string[];
  is_shared_with_other_centers?: boolean;
  shared_by_user_id?: string;
  shared_at?: string;
  retention_policy?: VideoRetentionPolicy;
  delete_on?: string | null;
};

async function getUserProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', userId)
    .single();

  return data as UserProfile | null;
}

// PATCH /api/videos/[id] - Actualitzar vídeo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Verificar autenticació
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const profile = await getUserProfile(supabase, user.id);

  if (!profile) {
    return NextResponse.json({ error: 'Perfil d\'usuari no trobat' }, { status: 403 });
  }

  const finalRole = profile.role;
  const finalCenterId = profile.center_id;

  // Obtenir vídeo actual
  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (!video) {
    return NextResponse.json({ error: 'Vídeo no trobat' }, { status: 404 });
  }

  // Validar permisos
  if (finalRole !== 'admin_global' && video.center_id !== finalCenterId) {
    return NextResponse.json(
      { error: 'No tens permisos per editar aquest vídeo' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    action,
    title,
    description,
    type,
    status,
    tag_ids,
    hashtag_names,
    is_shared_with_other_centers,
    frames_urls,
    // Camps per request_revision
    rejection_comment,
    // Camps per submit_revision (re-puja de vídeo opcional)
    vimeo_url: new_vimeo_url,
    vimeo_id: new_vimeo_id,
    vimeo_hash: new_vimeo_hash,
    thumbnail_url: new_thumbnail_url,
    duration_seconds: new_duration_seconds,
    retention_policy,
    delete_on,
  } = body;

  let normalizedRetention:
    | ReturnType<typeof normalizeVideoRetention>
    | undefined;

  if (retention_policy !== undefined || delete_on !== undefined) {
    if (retention_policy === undefined) {
      return NextResponse.json(
        { error: 'Cal indicar la política de conservació' },
        { status: 400 }
      );
    }

    try {
      normalizedRetention = normalizeVideoRetention(
        retention_policy,
        delete_on
      );
    } catch (error) {
      if (error instanceof VideoRetentionValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  // ============================================================
  // CAS 1: Demanar revisió (editor_profe / admin_global)
  // ============================================================
  if (action === 'request_revision') {
    if (finalRole !== 'editor_profe' && finalRole !== 'admin_global') {
      return NextResponse.json({ error: 'Sense permisos per demanar revisió' }, { status: 403 });
    }
    if (video.status !== 'pending_approval') {
      return NextResponse.json({ error: 'Només es pot demanar revisió de vídeos pendents' }, { status: 400 });
    }
    if (!rejection_comment || rejection_comment.trim().length < 10) {
      return NextResponse.json({ error: 'El comentari de revisió ha de tenir almenys 10 caràcters' }, { status: 400 });
    }

    const { error: revisionError } = await supabase
      .from('videos')
      .update({
        status: 'needs_revision',
        rejection_comment: rejection_comment.trim(),
        rejected_at: new Date().toISOString(),
        rejected_by_user_id: user.id,
      })
      .eq('id', id);

    if (revisionError) {
      console.error('Error requesting revision:', revisionError);
      return NextResponse.json({ error: revisionError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Revisió sol·licitada correctament' });
  }

  // ============================================================
  // CAS 2: Enviar correcció (editor_alumne)
  // ============================================================
  if (action === 'submit_revision') {
    if (finalRole !== 'editor_alumne') {
      return NextResponse.json({ error: 'Sense permisos per enviar revisió' }, { status: 403 });
    }
    if (video.status !== 'needs_revision') {
      return NextResponse.json({ error: 'Només es pot corregir un vídeo en revisió' }, { status: 400 });
    }
    if (video.uploaded_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Només pots corregir els teus propis vídeos' }, { status: 403 });
    }
    if (tag_ids && tag_ids.length === 0) {
      return NextResponse.json({ error: 'Cal seleccionar almenys una etiqueta global' }, { status: 400 });
    }

    try {
      const revisionUpdates: VideoUpdatePayload = {
        status: 'pending_approval',
        rejection_comment: null,
        rejected_at: null,
        rejected_by_user_id: null,
      };

      if (title !== undefined) revisionUpdates.title = title;
      if (description !== undefined) revisionUpdates.description = description;
      if (type !== undefined) revisionUpdates.type = type;
      if (frames_urls !== undefined) revisionUpdates.frames_urls = Array.isArray(frames_urls) ? frames_urls : [];
      if (normalizedRetention) {
        revisionUpdates.retention_policy = normalizedRetention.retention_policy;
        revisionUpdates.delete_on = normalizedRetention.delete_on;
      }

      // Si l'alumne ha pujat un vídeo nou, l'actualització i l'encuat de
      // recursos antics són atòmics a la BD.
      if (new_vimeo_id && new_vimeo_id !== video.vimeo_id) {
        const { error: replacementError } = await supabase.rpc(
          'replace_revision_vimeo_and_queue_cleanup',
          {
            p_video_id: id,
            p_title: title ?? video.title,
            p_description: description ?? video.description,
            p_type: type ?? video.type,
            p_vimeo_url: new_vimeo_url,
            p_vimeo_id: new_vimeo_id,
            p_vimeo_hash: new_vimeo_hash ?? null,
            p_thumbnail_url: new_thumbnail_url ?? null,
            p_duration_seconds: new_duration_seconds ?? null,
            p_frames_urls: Array.isArray(frames_urls) ? frames_urls : [],
            p_retention_policy:
              normalizedRetention?.retention_policy ?? video.retention_policy,
            p_delete_on:
              normalizedRetention?.delete_on ?? video.delete_on,
          }
        );

        if (replacementError) {
          console.error('Error replacing revision Vimeo asset:', replacementError);
          return NextResponse.json({ error: replacementError.message }, { status: 500 });
        }
      } else {
        const { error: submitError } = await supabase
          .from('videos')
          .update(revisionUpdates)
          .eq('id', id);

        if (submitError) {
          console.error('Error submitting revision:', submitError);
          return NextResponse.json({ error: submitError.message }, { status: 500 });
        }
      }

      // Actualitzar tags si cal
      if (tag_ids) {
        await supabase.from('video_tags').delete().eq('video_id', id);
        if (tag_ids.length > 0) {
          await supabase.from('video_tags').insert(
            tag_ids.map((tagId: string) => ({ video_id: id, tag_id: tagId }))
          );
        }
      }

      // Actualitzar hashtags si cal
      if (hashtag_names !== undefined) {
        await supabase.from('video_hashtags').delete().eq('video_id', id);
        if (hashtag_names) {
          const hashtags = parseHashtagInput(hashtag_names);
          if (hashtags.length > 0) {
            const { data: existingHashtags } = await supabase
              .from('hashtags').select('id, name')
              .eq('center_id', video.center_id).in('name', hashtags);

            const existingNames = existingHashtags?.map((h: { name: string }) => h.name) || [];
            const newHashtags = hashtags.filter((h: string) => !existingNames.includes(h));

            if (newHashtags.length > 0) {
              await supabase.from('hashtags').insert(
                newHashtags.map((name: string) => ({ name, center_id: video.center_id, is_active: true }))
              );
            }

            const { data: allHashtags } = await supabase
              .from('hashtags').select('id').eq('center_id', video.center_id).in('name', hashtags);

            if (allHashtags && allHashtags.length > 0) {
              await supabase.from('video_hashtags').insert(
                allHashtags.map((h: { id: string }) => ({ video_id: id, hashtag_id: h.id }))
              );
            }
          }
        }
      }

      try {
        await processMediaCleanupJobs({ videoId: id, limit: 20 });
      } catch (cleanupError) {
        // La revisió ja s'ha desat; el cron diari reprendrà la neteja pendent.
        console.error('[submit_revision] No s\'ha pogut iniciar la neteja externa:', cleanupError);
      }

      return NextResponse.json({ message: 'Correcció enviada correctament' });

    } catch (error: unknown) {
      console.error('Unexpected error in submit_revision:', error);
      return NextResponse.json({ error: 'Error inesperat enviant la correcció' }, { status: 500 });
    }
  }

  // ============================================================
  // CAS 3: Edició normal (editor_profe / admin_global)
  // ============================================================
  if (finalRole !== 'editor_profe' && finalRole !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per editar aquest vídeo' },
      { status: 403 }
    );
  }

  // Validacions
  if (tag_ids && tag_ids.length === 0) {
    return NextResponse.json(
      { error: 'Cal seleccionar almenys una etiqueta global' },
      { status: 400 }
    );
  }

  try {
    // Actualitzar vídeo
    const updates: VideoUpdatePayload = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (frames_urls !== undefined) updates.frames_urls = Array.isArray(frames_urls) ? frames_urls : [];
    if (normalizedRetention) {
      updates.retention_policy = normalizedRetention.retention_policy;
      updates.delete_on = normalizedRetention.delete_on;
    }

    // Permetre canvi d'estat NOMÉS per editor_profe
    // L'admin_global NO gestiona aprovacions de vídeos pendents
    if (status !== undefined && finalRole === 'editor_profe') {
      updates.status = status;
    }

    if (is_shared_with_other_centers !== undefined) {
      updates.is_shared_with_other_centers = is_shared_with_other_centers;
      if (is_shared_with_other_centers && !video.shared_at) {
        updates.shared_by_user_id = user.id;
        updates.shared_at = new Date().toISOString();
      }
    }

    const { error: updateError } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating video:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Actualitzar tags si cal
    if (tag_ids) {
      // Eliminar tags existents
      await supabase.from('video_tags').delete().eq('video_id', id);

      // Afegir nous tags
      if (tag_ids.length > 0) {
        await supabase
          .from('video_tags')
          .insert(
            tag_ids.map((tagId: string) => ({
              video_id: id,
              tag_id: tagId,
            }))
          );
      }
    }

    // Actualitzar hashtags si cal
    if (hashtag_names !== undefined) {
      // Eliminar hashtags existents
      await supabase.from('video_hashtags').delete().eq('video_id', id);

      if (hashtag_names) {
        const hashtags = parseHashtagInput(hashtag_names);

        if (hashtags.length > 0) {
          // Obtenir hashtags existents
          const { data: existingHashtags } = await supabase
            .from('hashtags')
            .select('id, name')
            .eq('center_id', video.center_id)
            .in('name', hashtags);

          const existingNames = existingHashtags?.map((h: { name: string }) => h.name) || [];
          const newHashtags = hashtags.filter((h: string) => !existingNames.includes(h));

          // Crear nous hashtags
          if (newHashtags.length > 0) {
            await supabase
              .from('hashtags')
              .insert(
                newHashtags.map((name: string) => ({
                  name,
                  center_id: video.center_id,
                  is_active: true,
                }))
              );
          }

          // Obtenir tots els IDs
          const { data: allHashtags } = await supabase
            .from('hashtags')
            .select('id')
            .eq('center_id', video.center_id)
            .in('name', hashtags);

          // Assignar hashtags al vídeo
          if (allHashtags && allHashtags.length > 0) {
            await supabase
              .from('video_hashtags')
              .insert(
                allHashtags.map((h: { id: string }) => ({
                  video_id: id,
                  hashtag_id: h.id,
                }))
              );
          }
        }
      }
    }

    // Retornar vídeo actualitzat amb totes les relacions
    const { data: updatedVideo } = await supabase
      .from('videos')
      .select(`
        *,
        centers (
          id,
          name,
          zones (
            id,
            name
          )
        ),
        video_tags (
          tags (
            id,
            name
          )
        ),
        video_hashtags (
          hashtags (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({
      message: 'Vídeo actualitzat correctament',
      video: updatedVideo,
    });

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al actualitzar el vídeo' },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id] - Eliminar vídeo
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Verificar autenticació
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const profile = await getUserProfile(supabase, user.id);

  if (!profile) {
    return NextResponse.json({ error: 'Perfil d\'usuari no trobat' }, { status: 403 });
  }

  try {
    // Aquesta RPC valida permisos, posa a cua els recursos externs i elimina el
    // vídeo amb les seves cascades en una única transacció.
    const { error: deleteError } = await supabase.rpc('delete_video_and_queue_cleanup', {
      p_video_id: id,
    });

    if (deleteError) {
      const status = deleteError.message === 'Vídeo no trobat'
        ? 404
        : deleteError.message.includes('permisos') || deleteError.message.includes('Perfil')
          ? 403
          : 500;
      console.error('Error deleting video:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status });
    }

    let cleanupPending = false;
    try {
      const cleanup = await processMediaCleanupJobs({ videoId: id, limit: 20 });
      cleanupPending = cleanup.pending > 0;
    } catch (cleanupError) {
      // El vídeo ja s'ha eliminat de forma atòmica; el cron diari reprendrà la neteja.
      cleanupPending = true;
      console.error('[DELETE video] No s\'ha pogut iniciar la neteja externa:', cleanupError);
    }

    return NextResponse.json({
      message: cleanupPending
        ? 'Vídeo eliminat correctament. La neteja de Vimeo o Storage es completarà automàticament.'
        : 'Vídeo eliminat correctament',
      cleanup_pending: cleanupPending,
    });

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al eliminar el vídeo' },
      { status: 500 }
    );
  }
}
