import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parseHashtagInput } from '@/lib/hashtags';

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
    title,
    description,
    type,
    status,
    tag_ids,
    hashtag_names,
    is_shared_with_other_centers,
    frames_urls,
  } = body;

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
