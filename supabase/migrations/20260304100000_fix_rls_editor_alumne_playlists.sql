-- Fix RLS policies to allow editor_alumne to edit playlists/items
-- when is_student_editable = true (same center only)
--
-- Problem: les polítiques actuals només permeten admin_global i editor_profe.
-- L'editor_alumne no pot fer INSERT/UPDATE/DELETE a playlist_items encara
-- que el professor hagi activat is_student_editable = true.

-- 1. Actualitzar política de playlists (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Editors can manage playlists in their center" ON playlists;

CREATE POLICY "Editors can manage playlists in their center"
ON playlists FOR ALL TO authenticated
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global' OR
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe' AND
        center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    ) OR
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'editor_alumne' AND
        is_student_editable = true AND
        center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    )
);

-- 2. Actualitzar política de playlist_items (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Playlist items are manageable by playlist access" ON playlist_items;

CREATE POLICY "Playlist items are manageable by playlist access"
ON playlist_items FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM playlists
        WHERE id = playlist_id AND (
            (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global' OR
            (
                (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe' AND
                center_id = (SELECT center_id FROM users WHERE id = auth.uid())
            ) OR
            (
                (SELECT role FROM users WHERE id = auth.uid()) = 'editor_alumne' AND
                is_student_editable = true AND
                center_id = (SELECT center_id FROM users WHERE id = auth.uid())
            )
        )
    )
);
