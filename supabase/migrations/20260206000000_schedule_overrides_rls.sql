-- ============================================================================
-- Schedule Overrides: RLS Policies
-- Descripció: Afegir polítiques RLS per a la taula schedule_overrides
-- Data: 2026-02-06
-- ============================================================================

-- SELECT: Qualsevol usuari autenticat del centre pot llegir (necessari per display)
CREATE POLICY "Users can view own center schedule overrides"
ON schedule_overrides FOR SELECT
TO authenticated
USING (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- INSERT: Només editor_profe i admin_global del centre
CREATE POLICY "Editors can create schedule overrides"
ON schedule_overrides FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('editor_profe', 'admin_global')
    AND (
        center_id = (SELECT center_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
    )
);

-- UPDATE: Només editor_profe i admin_global del centre
CREATE POLICY "Editors can update schedule overrides"
ON schedule_overrides FOR UPDATE
TO authenticated
USING (
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
        AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
)
WITH CHECK (
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
        AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- DELETE: Només editor_profe i admin_global del centre
CREATE POLICY "Editors can delete schedule overrides"
ON schedule_overrides FOR DELETE
TO authenticated
USING (
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
        AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);
