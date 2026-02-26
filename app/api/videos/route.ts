import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { extractVimeoId } from '@/lib/vimeo/utils';
import { parseHashtagInput } from '@/lib/hashtags';

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

  // SIEMPRE buscar en la tabla users - priorizar ese valor sobre metadata
  const { data: dbUser } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single();
  
  // Priorizar rol y center_id de DB, luego metadata
  const role = dbUser?.role || user.user_metadata?.role || user.app_metadata?.role;
  const userCenterId = dbUser?.center_id || user.user_metadata?.center_id || user.app_metadata?.center_id;

  console.log('🔍 [GET /api/videos] User:', user.email, 'Role:', role, 'Center:', userCenterId);

  // Obtenir paràmetres de query
  const { searchParams } = new URL(request.url);
  const centerId = searchParams.get('centerId') || userCenterId;
  const zoneId = searchParams.get('zoneId');
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean);
  const hashtagIds = searchParams.get('hashtagIds')?.split(',').filter(Boolean);
  const includeShared = searchParams.get('includeShared') === 'true';
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '24');

  // Pre-filtrar per tags/hashtags a nivell de BD (obtenir IDs de vídeos que coincideixen)
  let tagVideoIds: string[] | null = null;
  let hashtagVideoIds: string[] | null = null;

  if (tagIds && tagIds.length > 0) {
    const { data: matchingVT } = await supabase
      .from('video_tags')
      .select('video_id')
      .in('tag_id', tagIds);
    tagVideoIds = [...new Set(matchingVT?.map(vt => vt.video_id) || [])];
  }

  if (hashtagIds && hashtagIds.length > 0) {
    const { data: matchingVH } = await supabase
      .from('video_hashtags')
      .select('video_id')
      .in('hashtag_id', hashtagIds);
    hashtagVideoIds = [...new Set(matchingVH?.map(vh => vh.video_id) || [])];
  }

  // Intersectar IDs si ambdós filtres estan actius
  let filteredVideoIds: string[] | null = null;
  if (tagVideoIds !== null && hashtagVideoIds !== null) {
    const hashtagSet = new Set(hashtagVideoIds);
    filteredVideoIds = tagVideoIds.filter(id => hashtagSet.has(id));
  } else if (tagVideoIds !== null) {
    filteredVideoIds = tagVideoIds;
  } else if (hashtagVideoIds !== null) {
    filteredVideoIds = hashtagVideoIds;
  }

  // Si el filtre retorna 0 resultats, retornar directament
  if (filteredVideoIds !== null && filteredVideoIds.length === 0) {
    return NextResponse.json({ videos: [], total: 0, page, totalPages: 0 });
  }

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
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Aplicar filtre de tags/hashtags a nivell de query
  if (filteredVideoIds !== null) {
    query = query.in('id', filteredVideoIds);
  }

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

  // Filtre per status
  if (status && status !== 'all') {
    if (status === 'pending') {
      query = query.eq('status', 'pending_approval');
    } else {
      query = query.eq('status', status);
    }
  } else {
    // Lògica per defecte segons el rol:
    // - editor_profe i admin_global: veuen tots els vídeos (publicats + pendents)
    // - editor_alumne: veu els seus vídeos pendents + tots els publicats
    // - altres rols: només vídeos publicats
    if (role === 'editor_profe' || role === 'admin_global') {
      // Veuen tots els estats
      query = query.in('status', ['published', 'pending_approval']);
    } else if (role === 'editor_alumne') {
      // Veuen: (status='published') O (status='pending_approval' I uploaded_by=user_id)
      // Important: Aquesta consulta no es pot fer amb .or() directament perquè no suporta condicions complexes
      // Solució: Filtrar al backend després de la consulta
      query = query.in('status', ['published', 'pending_approval']);
    } else {
      // Altres rols només veuen publicats
      query = query.eq('status', 'published');
    }
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

  console.log(`📹 [GET /api/videos] Loaded ${videos?.length || 0} videos from DB`);

  // Filtrar vídeos per editor_alumne (només els seus pendents + tots els publicats)
  let filteredVideos = videos || [];
  if (role === 'editor_alumne') {
    const beforeFilter = filteredVideos.length;
    filteredVideos = filteredVideos.filter(video => {
      // Veure vídeos publicats O vídeos pendents propis
      return video.status === 'published' || 
             (video.status === 'pending_approval' && video.uploaded_by_user_id === user.id);
    });
    console.log(`🎓 [editor_alumne] Filtered: ${beforeFilter} -> ${filteredVideos.length} videos`);
    console.log(`🎓 [editor_alumne] User ID: ${user.id}`);
  }

  // Nota: El filtratge per tags/hashtags es fa a nivell de BD (pre-query amb .in('id', ...))
  // ja no cal filtrar client-side

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

  console.log('📊 User metadata:', user.user_metadata);
  console.log('📊 User app_metadata:', user.app_metadata);

  // SIEMPRE buscar en la tabla users - priorizar ese valor sobre metadata
  const { data: dbUser } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single();
  
  // Priorizar rol de DB, luego metadata
  let role = dbUser?.role || user.user_metadata?.role || user.app_metadata?.role;
  let centerId = dbUser?.center_id || user.user_metadata?.center_id || user.app_metadata?.center_id;

  console.log('📊 Role from DB:', dbUser?.role);
  console.log('📊 Final role:', role, 'centerId:', centerId);

  // Permetre crear vídeos a editor_alumne, editor_profe i admin_global
  if (role !== 'editor_profe' && role !== 'admin_global' && role !== 'editor_alumne') {
    return NextResponse.json(
      { error: 'No tens permisos per crear vídeos' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    vimeo_url,
    vimeo_hash,
    title,
    description,
    type,
    tag_ids,
    hashtag_names,
    is_shared_with_other_centers,
    thumbnail_url,
    duration_seconds,
    frames_urls,
    center_id: bodyCenterId, // Permet especificar centre des del body (per admin_global)
  } = body;

  // Determinar el centre a utilitzar
  let finalCenterId = centerId;
  
  // Si és admin_global i no té center_id, utilitzar el del body o buscar "Lacenet"
  if (role === 'admin_global' && !centerId) {
    if (bodyCenterId) {
      finalCenterId = bodyCenterId;
    } else {
      // Buscar el centre "Lacenet" per defecte
      const { data: defaultCenter } = await supabase
        .from('centers')
        .select('id')
        .ilike('name', '%lacenet%')
        .limit(1)
        .single();
      
      if (defaultCenter) {
        finalCenterId = defaultCenter.id;
      } else {
        // Si no hi ha Lacenet, agafar el primer centre actiu
        const { data: anyCenter } = await supabase
          .from('centers')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single();
        
        if (anyCenter) {
          finalCenterId = anyCenter.id;
        }
      }
    }
  }

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

  if (!finalCenterId) {
    return NextResponse.json(
      { error: 'No s\'ha pogut determinar el centre' },
      { status: 400 }
    );
  }

  // Obtenir zone_id del centre (ja no fallarà)
  const { data: center } = await supabase
    .from('centers')
    .select('zone_id')
    .eq('id', finalCenterId)
    .single();

  if (!center) {
    return NextResponse.json(
      { error: 'Centre no trobat' },
      { status: 404 }
    );
  }

  try {
    // Extreure vimeo_id de vimeo_url
    const vimeo_id = extractVimeoId(vimeo_url);

    // Determinar l'estat segons el rol
    // - editor_alumne: pending_approval (requereix aprovació del professor)
    // - editor_profe i admin_global: published (aprovats automàticament)
    const videoStatus = role === 'editor_alumne' ? 'pending_approval' : 'published';

    console.log(`📹 [POST /api/videos] Creating video with status: ${videoStatus} for role: ${role}`);

    // Determinar si es pot compartir amb altres centres
    // - editor_alumne: NO pot compartir (sempre false)
    // - editor_profe i admin_global: poden compartir si ho especifiquen
    const canShare = role !== 'editor_alumne' && is_shared_with_other_centers === true;

    // Crear vídeo
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        center_id: finalCenterId,
        title,
        description: description || null,
        type: type || 'content',
        status: videoStatus,
        vimeo_url,
        vimeo_id: vimeo_id || null,
        vimeo_hash: vimeo_hash || null,
        thumbnail_url: thumbnail_url || null,
        duration_seconds: duration_seconds || null,
        frames_urls: Array.isArray(frames_urls) ? frames_urls : [],
        uploaded_by_user_id: user.id,
        is_shared_with_other_centers: canShare,
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

    console.log(`✅ [POST /api/videos] Video created successfully:`, {
      id: video.id,
      title: video.title,
      status: video.status,
      uploaded_by: video.uploaded_by_user_id,
      center_id: video.center_id
    });

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
      const hashtags = parseHashtagInput(hashtag_names);

      if (hashtags.length > 0) {
        // Obtenir hashtags existents
        const { data: existingHashtags } = await supabase
          .from('hashtags')
          .select('id, name')
          .eq('center_id', finalCenterId)
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
                center_id: finalCenterId,
                is_active: true,
              }))
            );
        }

        // Obtenir tots els IDs
        const { data: allHashtags } = await supabase
          .from('hashtags')
          .select('id')
          .eq('center_id', finalCenterId)
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
