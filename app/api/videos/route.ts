import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/videos - Llistar vídeos amb filtres
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Verificar autenticació
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const role = user.user_metadata?.role;
  const userCenterId = user.user_metadata?.center_id;

  // Obtenir paràmetres de query
  const { searchParams } = new URL(request.url);
  const centerId = searchParams.get('centerId') || userCenterId;
  const zoneId = searchParams.get('zoneId');
  const type = searchParams.get('type');
  const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean);
  const hashtagIds = searchParams.get('hashtagIds')?.split(',').filter(Boolean);
  const includeShared = searchParams.get('includeShared') === 'true';
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '24');

  // Query base
  let query = supabase
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
      uploaded_by:uploaded_by_user_id (
        id,
        full_name,
        email
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
    `, { count: 'exact' })
    .eq('status', 'published')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Filtre per centre
  if (centerId && !includeShared) {
    query = query.eq('center_id', centerId);
  } else if (centerId && includeShared) {
    // Vídeos del centre O vídeos compartits d'altres centres
    query = query.or(`center_id.eq.${centerId},is_shared_with_other_centers.eq.true`);
  } else if (includeShared) {
    // Tots els vídeos compartits
    query = query.eq('is_shared_with_other_centers', true);
  }

  // Filtre per zona
  if (zoneId) {
    query = query.eq('zone_id', zoneId);
  }

  // Filtre per tipus
  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  // Cerca per títol o descripció
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Paginació
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: videos, error, count } = await query;

  if (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filtrar per tags si cal (client-side ja que és relació many-to-many)
  let filteredVideos = videos || [];
  if (tagIds && tagIds.length > 0) {
    filteredVideos = filteredVideos.filter(video => {
      const videoTagIds = video.video_tags?.map((vt: any) => vt.tags?.id).filter(Boolean) || [];
      return tagIds.some(tagId => videoTagIds.includes(tagId));
    });
  }

  // Filtrar per hashtags si cal
  if (hashtagIds && hashtagIds.length > 0) {
    filteredVideos = filteredVideos.filter(video => {
      const videoHashtagIds = video.video_hashtags?.map((vh: any) => vh.hashtags?.id).filter(Boolean) || [];
      return hashtagIds.some(hashtagId => videoHashtagIds.includes(hashtagId));
    });
  }

  return NextResponse.json({
    videos: filteredVideos,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// POST /api/videos - Crear vídeo
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verificar autenticació
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  const role = user.user_metadata?.role;
  const centerId = user.user_metadata?.center_id;

  // Només editor_profe i admin_global poden crear vídeos en M3a
  if (role !== 'editor_profe' && role !== 'admin_global') {
    return NextResponse.json(
      { error: 'No tens permisos per crear vídeos' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    vimeo_url,
    title,
    description,
    type,
    tag_ids,
    hashtag_names,
    is_shared_with_other_centers,
    thumbnail_url,
    duration_seconds,
  } = body;

  // Validacions
  if (!vimeo_url || !title) {
    return NextResponse.json(
      { error: 'URL de Vimeo i títol són obligatoris' },
      { status: 400 }
    );
  }

  if (!tag_ids || tag_ids.length === 0) {
    return NextResponse.json(
      { error: 'Cal seleccionar almenys una etiqueta global' },
      { status: 400 }
    );
  }

  // Obtenir zone_id del centre
  const { data: center } = await supabase
    .from('centers')
    .select('zone_id')
    .eq('id', centerId)
    .single();

  if (!center) {
    return NextResponse.json(
      { error: 'Centre no trobat' },
      { status: 404 }
    );
  }

  try {
    // Crear vídeo
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        center_id: centerId,
        title,
        description: description || null,
        type: type || 'content',
        status: 'published', // En M3a tot es publica directament
        vimeo_url,
        thumbnail_url: thumbnail_url || null,
        duration_seconds: duration_seconds || null,
        uploaded_by_user_id: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (videoError) {
      console.error('Error creating video:', videoError);
      return NextResponse.json(
        { error: videoError.message },
        { status: 500 }
      );
    }

    // Assignar tags
    if (tag_ids && tag_ids.length > 0) {
      const { error: tagsError } = await supabase
        .from('video_tags')
        .insert(
          tag_ids.map((tagId: string) => ({
            video_id: video.id,
            tag_id: tagId,
          }))
        );

      if (tagsError) {
        console.error('Error assigning tags:', tagsError);
      }
    }

    // Processar hashtags
    if (hashtag_names) {
      const hashtags = hashtag_names
        .split(',')
        .map((h: string) => h.trim().toLowerCase())
        .filter((h: string) => h.startsWith('#'))
        .map((h: string) => h.slice(1));

      if (hashtags.length > 0) {
        // Obtenir hashtags existents
        const { data: existingHashtags } = await supabase
          .from('hashtags')
          .select('id, name')
          .eq('center_id', centerId)
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
                center_id: centerId,
                is_active: true,
              }))
            );
        }

        // Obtenir tots els IDs
        const { data: allHashtags } = await supabase
          .from('hashtags')
          .select('id')
          .eq('center_id', centerId)
          .in('name', hashtags);

        // Assignar hashtags al vídeo
        if (allHashtags && allHashtags.length > 0) {
          await supabase
            .from('video_hashtags')
            .insert(
              allHashtags.map((h: { id: string }) => ({
                video_id: video.id,
                hashtag_id: h.id,
              }))
            );
        }
      }
    }

    return NextResponse.json({
      video,
      message: 'Vídeo pujat correctament',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperat al crear el vídeo' },
      { status: 500 }
    );
  }
}
