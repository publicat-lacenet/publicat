-- Add RLS policies for public (anonymous) access to landing page data

-- Allow anonymous users to view global playlists
CREATE POLICY "Public can view global playlists"
ON playlists
FOR SELECT
TO anon
USING (kind = 'global' AND is_active = true AND center_id IS NULL);

-- Allow anonymous users to view playlist items of global playlists
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

-- Allow anonymous users to view shared published videos
CREATE POLICY "Public can view shared published videos"
ON videos
FOR SELECT
TO anon
USING (
  is_shared_with_other_centers = true
  AND status = 'published'
);
