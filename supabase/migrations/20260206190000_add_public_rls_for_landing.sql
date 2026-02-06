-- Add RLS policies for public (anonymous) access to landing page data
-- SECURITY: Only expose the minimum data necessary for the landing page

-- Allow anonymous users to view global playlists only
CREATE POLICY "Public can view global playlists"
ON playlists
FOR SELECT
TO anon
USING (kind = 'global' AND is_active = true AND center_id IS NULL);

-- Allow anonymous users to view playlist items of global playlists only
CREATE POLICY "Public can view global playlist items"
ON playlist_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.kind = 'global'
    AND playlists.is_active = true
    AND playlists.center_id IS NULL
  )
);

-- Allow anonymous users to view ONLY videos that are in the global playlist
-- Additional security: must also be shared and published
CREATE POLICY "Public can view global playlist videos"
ON videos
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM playlist_items pi
    JOIN playlists p ON p.id = pi.playlist_id
    WHERE pi.video_id = videos.id
    AND p.kind = 'global'
    AND p.is_active = true
    AND p.center_id IS NULL
  )
  AND is_shared_with_other_centers = true
  AND status = 'published'
);
