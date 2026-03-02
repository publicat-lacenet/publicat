import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parseHashtagInput } from '@/lib/hashtags';
import { deleteVimeoVideo } from '@/lib/vimeo/api';

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

  const role = user.user_metadata?.role;
  const centerId = user.user_metadata?.center_id;

  // Llegir role i center_id de la taula users (fallback)
  if (!role || !centerId) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('role, center_id')
      .eq('id', user.id)
      .single();

    if (dbUser?.role && !role) {
      user.user_metadata = user.user_metadata || {};
      user.user_metadata.role = dbUser.role;
    }
    if (dbUser?.center_id && !centerId) {
      user.user_metadata = user.user_metadata || {};
      user.user_metadata.center_id = dbUser.center_id;
    }
  }

  const finalRole = user.user_metadata?.role;
  const finalCenterId = user.user_metadata?.center_id;

  // admin_global no té center_id, buscar centre per defecte
  let effectiveCenterId = finalCenterId;
  if (finalRole === 'admin_global' && !finalCenterId) {
    // Buscar centre Lacenet
    const { data: lacenet } = await supabase
      .from('centers')
      .select('id')
      .ilike('name', '%lacenet%')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (lacenet) {
      effectiveCenterId = lacenet.id;
    } else {
      // Buscar primer centre actiu
      const { data: firstCenter } = await supabase
        .from('centers')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (firstCenter) {
        effectiveCenterId = firstCenter.id;
      }
    }
  }

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
  if (finalRole !== 'admin_global' && video.center_id !== effectiveCenterId) {
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
  } = body;

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
      const revisionUpdates: any = {
        status: 'pending_approval',
        rejection_comment: null,
        rejected_at: null,
        rejected_by_user_id: null,
      };

      if (title !== undefined) revisionUpdates.title = title;
      if (description !== undefined) revisionUpdates.description = description;
      if (type !== undefined) revisionUpdates.type = type;
      if (frames_urls !== undefined) revisionUpdates.frames_urls = Array.isArray(frames_urls) ? frames_urls : [];

      // Si l'alumne ha pujat un vídeo nou, substituir les dades de Vimeo
      if (new_vimeo_id && new_vimeo_id !== video.vimeo_id) {
        // Eliminar el vídeo anterior de Vimeo
        if (video.vimeo_id) {
          await deleteVimeoVideo(video.vimeo_id);
        }
        revisionUpdates.vimeo_url = new_vimeo_url;
        revisionUpdates.vimeo_id = new_vimeo_id;
        revisionUpdates.vimeo_hash = new_vimeo_hash ?? null;
        revisionUpdates.thumbnail_url = new_thumbnail_url ?? null;
        revisionUpdates.duration_seconds = new_duration_seconds ?? null;
        revisionUpdates.frames_urls = Array.isArray(frames_urls) ? frames_urls : [];
      }

      const { error: submitError } = await supabase
        .from('videos')
        .update(revisionUpdates)
        .eq('id', id);

      if (submitError) {
        console.error('Error submitting revision:', submitError);
        return NextResponse.json({ error: submitError.message }, { status: 500 });
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

      return NextResponse.json({ message: 'Correcció enviada correctament' });

    } catch (error: any) {
      console.error('Unexpected error in submit_revision:', error);
      return NextResponse.json({ error: 'Error inesperat enviant la correcció' }, { status: 500 });
    }
  }

  // ============================================================
  // CAS 3: Edició normal (editor_profe / admin_global)
  // ============================================================

  // Validacions
  if (tag_ids && tag_ids.length === 0) {
    return NextResponse.json(
      { error: 'Cal seleccionar almenys una etiqueta global' },
      { status: 400 }
    );
  }

  try {
    // Actualitzar vídeo
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (frames_urls !== undefined) updates.frames_urls = Array.isArray(frames_urls) ? frames_urls : [];

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

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al actualitzar el vídeo' },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id] - Eliminar vídeo
export async function DELETE(
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

  const role = user.user_metadata?.role;
  const centerId = user.user_metadata?.center_id;

  // Llegir role i center_id de la taula users (fallback)
  if (!role || !centerId) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('role, center_id')
      .eq('id', user.id)
      .single();

    if (dbUser?.role && !role) {
      user.user_metadata = user.user_metadata || {};
      user.user_metadata.role = dbUser.role;
    }
    if (dbUser?.center_id && !centerId) {
      user.user_metadata = user.user_metadata || {};
      user.user_metadata.center_id = dbUser.center_id;
    }
  }

  const finalRole = user.user_metadata?.role;
  const finalCenterId = user.user_metadata?.center_id;

  // admin_global no té center_id, buscar centre per defecte
  let effectiveCenterId = finalCenterId;
  if (finalRole === 'admin_global' && !finalCenterId) {
    // Buscar centre Lacenet
    const { data: lacenet } = await supabase
      .from('centers')
      .select('id')
      .ilike('name', '%lacenet%')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (lacenet) {
      effectiveCenterId = lacenet.id;
    } else {
      // Buscar primer centre actiu
      const { data: firstCenter } = await supabase
        .from('centers')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (firstCenter) {
        effectiveCenterId = firstCenter.id;
      }
    }
  }

  // Obtenir vídeo actual (incloent frames_urls per netejar Storage)
  const { data: video } = await supabase
    .from('videos')
    .select('center_id, frames_urls')
    .eq('id', id)
    .single();

  if (!video) {
    return NextResponse.json({ error: 'Vídeo no trobat' }, { status: 404 });
  }

  // Validar permisos
  if (finalRole !== 'admin_global' && video.center_id !== effectiveCenterId) {
    return NextResponse.json(
      { error: 'No tens permisos per eliminar aquest vídeo' },
      { status: 403 }
    );
  }

  try {
    // Eliminar fotogrames de Supabase Storage si n'hi ha
    const framesUrls: string[] = Array.isArray(video.frames_urls) ? video.frames_urls : [];
    if (framesUrls.length > 0) {
      const BUCKET_PREFIX = '/storage/v1/object/public/announcement-frames/';
      const paths = framesUrls
        .map((url: string) => {
          const idx = url.indexOf(BUCKET_PREFIX);
          return idx !== -1 ? url.slice(idx + BUCKET_PREFIX.length) : null;
        })
        .filter((p): p is string => p !== null);

      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('announcement-frames')
          .remove(paths);

        if (storageError) {
          // No bloquejar l'eliminació del vídeo per errors de Storage
          console.warn('[DELETE video] Error eliminant frames de Storage:', storageError.message);
        } else {
          console.log(`[DELETE video] ${paths.length} frames eliminats de Storage`);
        }
      }
    }

    // Eliminar el vídeo (tags i hashtags s'eliminaran amb ON DELETE CASCADE)
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting video:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Vídeo eliminat correctament',
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al eliminar el vídeo' },
      { status: 500 }
    );
  }
}
