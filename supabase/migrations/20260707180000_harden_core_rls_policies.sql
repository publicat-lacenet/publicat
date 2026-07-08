-- Harden core RLS policies for videos, users and video classification pivots.
--
-- Apply manually in the Supabase SQL Editor for project:
-- tvsafusrasfzubiujavk (publicat_videos)
--
-- Scope:
-- - Replace broad video write policies with operation-specific role policies.
-- - Restrict direct profile updates to personal fields only.
-- - Separate video tag/hashtag visibility from edit capability.
-- - Do not change playlist or playlist_items policies in this migration.

BEGIN;

-- ---------------------------------------------------------------------------
-- users: keep direct self profile edits limited to personal columns.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own personal profile" ON public.users;

REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT UPDATE (full_name, phone) ON public.users TO authenticated;

CREATE POLICY "Users can update own personal profile"
ON public.users
FOR UPDATE
TO authenticated
USING (
  id = (SELECT auth.uid())
)
WITH CHECK (
  id = (SELECT auth.uid())
);

-- ---------------------------------------------------------------------------
-- videos: replace overlapping broad policies with explicit per-operation rules.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Videos are viewable by center or if shared" ON public.videos;
DROP POLICY IF EXISTS "Users can manage videos in their center" ON public.videos;
DROP POLICY IF EXISTS "Editor-alumne can create videos" ON public.videos;
DROP POLICY IF EXISTS "Editor-alumne can update own needs_revision videos" ON public.videos;
DROP POLICY IF EXISTS "Editor-alumne can view videos" ON public.videos;
DROP POLICY IF EXISTS "Editor-profe can approve videos" ON public.videos;
DROP POLICY IF EXISTS "Editor-profe can delete videos" ON public.videos;
DROP POLICY IF EXISTS "Editor-profe can view all center videos" ON public.videos;

CREATE POLICY "Authenticated users can view allowed videos"
ON public.videos
FOR SELECT
TO authenticated
USING (
  private.current_user_role() = 'admin_global'::public.user_role
  OR (
    private.current_user_role() = 'editor_profe'::public.user_role
    AND center_id = private.current_user_center_id()
  )
  OR (
    status = 'published'::public.video_status
    AND (
      center_id = private.current_user_center_id()
      OR is_shared_with_other_centers = true
    )
  )
  OR (
    private.current_user_role() = 'editor_alumne'::public.user_role
    AND center_id = private.current_user_center_id()
    AND uploaded_by_user_id = (SELECT auth.uid())
    AND status IN (
      'pending_approval'::public.video_status,
      'needs_revision'::public.video_status
    )
  )
);

CREATE POLICY "Editors can insert videos"
ON public.videos
FOR INSERT
TO authenticated
WITH CHECK (
  private.current_user_role() = 'admin_global'::public.user_role
  OR (
    private.current_user_role() = 'editor_profe'::public.user_role
    AND center_id = private.current_user_center_id()
    AND uploaded_by_user_id = (SELECT auth.uid())
    AND status = 'published'::public.video_status
  )
  OR (
    private.current_user_role() = 'editor_alumne'::public.user_role
    AND center_id = private.current_user_center_id()
    AND uploaded_by_user_id = (SELECT auth.uid())
    AND status = 'pending_approval'::public.video_status
    AND is_shared_with_other_centers = false
  )
);

CREATE POLICY "Editors can update manageable videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (
  private.current_user_role() = 'admin_global'::public.user_role
  OR (
    private.current_user_role() = 'editor_profe'::public.user_role
    AND center_id = private.current_user_center_id()
  )
  OR (
    private.current_user_role() = 'editor_alumne'::public.user_role
    AND center_id = private.current_user_center_id()
    AND uploaded_by_user_id = (SELECT auth.uid())
    AND status = 'needs_revision'::public.video_status
  )
)
WITH CHECK (
  private.current_user_role() = 'admin_global'::public.user_role
  OR (
    private.current_user_role() = 'editor_profe'::public.user_role
    AND center_id = private.current_user_center_id()
  )
  OR (
    private.current_user_role() = 'editor_alumne'::public.user_role
    AND center_id = private.current_user_center_id()
    AND uploaded_by_user_id = (SELECT auth.uid())
    AND status = 'pending_approval'::public.video_status
    AND is_shared_with_other_centers = false
  )
);

CREATE POLICY "Editors can delete manageable videos"
ON public.videos
FOR DELETE
TO authenticated
USING (
  private.current_user_role() = 'admin_global'::public.user_role
  OR (
    private.current_user_role() = 'editor_profe'::public.user_role
    AND center_id = private.current_user_center_id()
  )
);

-- ---------------------------------------------------------------------------
-- video_tags: users can view tags for visible videos, but can only write tags
-- for videos they can actually manage.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Video tags are manageable by anyone who can manage the video" ON public.video_tags;
DROP POLICY IF EXISTS "Video tags are viewable by anyone who can see the video" ON public.video_tags;

CREATE POLICY "Video tags are viewable for visible videos"
ON public.video_tags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.videos
    WHERE videos.id = video_tags.video_id
  )
);

CREATE POLICY "Video tags are insertable for manageable videos"
ON public.video_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = video_tags.video_id
      AND (
        private.current_user_role() = 'admin_global'::public.user_role
        OR (
          private.current_user_role() = 'editor_profe'::public.user_role
          AND v.center_id = private.current_user_center_id()
        )
        OR (
          private.current_user_role() = 'editor_alumne'::public.user_role
          AND v.center_id = private.current_user_center_id()
          AND v.uploaded_by_user_id = (SELECT auth.uid())
          AND v.status IN (
            'pending_approval'::public.video_status,
            'needs_revision'::public.video_status
          )
        )
      )
  )
);

CREATE POLICY "Video tags are deletable for manageable videos"
ON public.video_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = video_tags.video_id
      AND (
        private.current_user_role() = 'admin_global'::public.user_role
        OR (
          private.current_user_role() = 'editor_profe'::public.user_role
          AND v.center_id = private.current_user_center_id()
        )
        OR (
          private.current_user_role() = 'editor_alumne'::public.user_role
          AND v.center_id = private.current_user_center_id()
          AND v.uploaded_by_user_id = (SELECT auth.uid())
          AND v.status IN (
            'pending_approval'::public.video_status,
            'needs_revision'::public.video_status
          )
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- video_hashtags: same write model as video_tags, plus same-center hashtag
-- validation on insert.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Video hashtags are manageable by anyone who can manage the video" ON public.video_hashtags;
DROP POLICY IF EXISTS "Video hashtags are viewable by anyone who can see the video" ON public.video_hashtags;

CREATE POLICY "Video hashtags are viewable for visible videos"
ON public.video_hashtags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.videos
    WHERE videos.id = video_hashtags.video_id
  )
);

CREATE POLICY "Video hashtags are insertable for manageable videos"
ON public.video_hashtags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.videos v
    JOIN public.hashtags h ON h.id = video_hashtags.hashtag_id
    WHERE v.id = video_hashtags.video_id
      AND h.center_id = v.center_id
      AND (
        private.current_user_role() = 'admin_global'::public.user_role
        OR (
          private.current_user_role() = 'editor_profe'::public.user_role
          AND v.center_id = private.current_user_center_id()
        )
        OR (
          private.current_user_role() = 'editor_alumne'::public.user_role
          AND v.center_id = private.current_user_center_id()
          AND v.uploaded_by_user_id = (SELECT auth.uid())
          AND v.status IN (
            'pending_approval'::public.video_status,
            'needs_revision'::public.video_status
          )
        )
      )
  )
);

CREATE POLICY "Video hashtags are deletable for manageable videos"
ON public.video_hashtags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = video_hashtags.video_id
      AND (
        private.current_user_role() = 'admin_global'::public.user_role
        OR (
          private.current_user_role() = 'editor_profe'::public.user_role
          AND v.center_id = private.current_user_center_id()
        )
        OR (
          private.current_user_role() = 'editor_alumne'::public.user_role
          AND v.center_id = private.current_user_center_id()
          AND v.uploaded_by_user_id = (SELECT auth.uid())
          AND v.status IN (
            'pending_approval'::public.video_status,
            'needs_revision'::public.video_status
          )
        )
      )
  )
);

COMMIT;
