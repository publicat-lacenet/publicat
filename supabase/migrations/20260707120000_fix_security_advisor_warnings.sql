-- Fix probable Supabase security advisor warnings.
--
-- Apply manually in the Supabase SQL Editor for project:
-- tvsafusrasfzubiujavk (publicat_videos)
--
-- Scope:
-- - Lock trigger functions to a deterministic search_path.
-- - Remove default PUBLIC execute grants from trigger-only functions.
-- - Replace recursive users policies with center-scoped policies backed by
--   private helper functions.

BEGIN;

-- SECURITY DEFINER functions must not rely on caller-controlled search_path.
ALTER FUNCTION public.create_default_playlists_for_center() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_pending_video() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_video_approved() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_video_needs_revision() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_video_rejected() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_video_resubmitted() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_user_email() SET search_path = public, pg_temp;

-- Non-definer trigger helpers also benefit from an explicit search_path.
ALTER FUNCTION public.assign_lacenet_to_admin_global() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_video_zone_id() SET search_path = public, pg_temp;

-- These are trigger-only functions. They do not need to be callable through
-- PostgREST/RPC by anon, authenticated users, or PUBLIC.
REVOKE EXECUTE ON FUNCTION public.create_default_playlists_for_center() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_pending_video() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_video_approved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_video_needs_revision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_video_rejected() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_video_resubmitted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_lacenet_to_admin_global() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_video_zone_id() FROM PUBLIC, anon, authenticated;

-- Avoid querying public.users directly from public.users policies: that causes
-- recursive RLS evaluation. Keep the lookup in a non-exposed schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM public.users
  WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.current_user_center_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT center_id
  FROM public.users
  WHERE id = (SELECT auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION private.current_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.current_user_center_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_center_id() TO authenticated;

-- Replace users policies that previously queried public.users from inside
-- public.users policies or exposed all profiles.
DROP POLICY IF EXISTS "Only admin_global can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admin_global can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can view other profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles in scope" ON public.users;

CREATE POLICY "Users can view profiles in scope"
ON public.users
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR private.current_user_role() = 'admin_global'::public.user_role
  OR private.current_user_center_id() = users.center_id
);

CREATE POLICY "Only admin_global can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  private.current_user_role() = 'admin_global'::public.user_role
);

CREATE POLICY "Only admin_global can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (
  private.current_user_role() = 'admin_global'::public.user_role
);

COMMIT;
