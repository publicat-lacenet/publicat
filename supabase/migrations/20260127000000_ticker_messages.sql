-- ============================================================================
-- Ticker Messages
-- Descripció: Missatges personalitzats per al ticker de la pantalla de display
-- Data: 2026-01-27
-- ============================================================================

-- ============================================================================
-- 1. TAULA ticker_messages
-- ============================================================================

CREATE TABLE ticker_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    text text NOT NULL,
    position int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index per ordenar missatges per centre
CREATE INDEX idx_ticker_messages_center_position ON ticker_messages(center_id, position);

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE ticker_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their center's messages + admin_global can see all
CREATE POLICY "Users can view own center ticker messages"
ON ticker_messages FOR SELECT
TO authenticated
USING (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- INSERT: Editors can create messages for their center
CREATE POLICY "Editors can create ticker messages"
ON ticker_messages FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('editor_profe', 'admin_global')
    AND (
        center_id = (SELECT center_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
    )
);

-- UPDATE: Editors can update their center's messages
CREATE POLICY "Editors can update ticker messages"
ON ticker_messages FOR UPDATE
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

-- DELETE: Editors can delete their center's messages
CREATE POLICY "Editors can delete ticker messages"
ON ticker_messages FOR DELETE
TO authenticated
USING (
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe'
        AND center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_ticker_messages_updated_at
BEFORE UPDATE ON ticker_messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. COMENTARIS
-- ============================================================================

COMMENT ON TABLE ticker_messages IS 'Missatges personalitzats per al ticker de la pantalla de display';
COMMENT ON COLUMN ticker_messages.center_id IS 'Centre associat';
COMMENT ON COLUMN ticker_messages.text IS 'Text del missatge a mostrar';
COMMENT ON COLUMN ticker_messages.position IS 'Ordre del missatge (0, 1, 2...)';
COMMENT ON COLUMN ticker_messages.is_active IS 'Si el missatge està actiu';

-- ============================================================================
-- 5. SEED: Crear missatge per defecte per cada centre existent
-- ============================================================================

INSERT INTO ticker_messages (center_id, text, position)
SELECT id, 'Benvinguts!', 0
FROM centers
WHERE NOT EXISTS (
    SELECT 1 FROM ticker_messages WHERE ticker_messages.center_id = centers.id
);
