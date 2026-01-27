-- ============================================================================
-- Milestone 6: Display Settings
-- Descripció: Configuració de pantalla de display per centre
-- Data: 2026-01-22
-- ============================================================================

-- ============================================================================
-- 1. TAULA display_settings
-- ============================================================================

CREATE TABLE display_settings (
    center_id uuid PRIMARY KEY REFERENCES centers(id) ON DELETE CASCADE,
    show_header boolean NOT NULL DEFAULT true,
    show_clock boolean NOT NULL DEFAULT true,
    show_ticker boolean NOT NULL DEFAULT false,
    ticker_speed int NOT NULL DEFAULT 50,
    primary_color text NOT NULL DEFAULT '#FEDD2C',
    standby_message text DEFAULT 'Pròximament...',
    announcement_volume int NOT NULL DEFAULT 0 CHECK (announcement_volume >= 0 AND announcement_volume <= 100),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE display_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their center's settings + admin_global can see all
CREATE POLICY "Users can view own center display settings"
ON display_settings FOR SELECT
TO authenticated
USING (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- INSERT: Editors can create settings for their center
CREATE POLICY "Editors can create display settings"
ON display_settings FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('editor_profe', 'admin_global')
    AND (
        center_id = (SELECT center_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
    )
);

-- UPDATE: Editors can update their center's settings
CREATE POLICY "Editors can update display settings"
ON display_settings FOR UPDATE
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

-- DELETE: Editors can delete their center's settings
CREATE POLICY "Editors can delete display settings"
ON display_settings FOR DELETE
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

CREATE TRIGGER tr_display_settings_updated_at
BEFORE UPDATE ON display_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. COMENTARIS
-- ============================================================================

COMMENT ON TABLE display_settings IS 'Configuració de pantalla de display per centre';
COMMENT ON COLUMN display_settings.center_id IS 'Centre associat (clau primària)';
COMMENT ON COLUMN display_settings.show_header IS 'Mostrar capçalera amb logo i rellotge';
COMMENT ON COLUMN display_settings.show_clock IS 'Mostrar rellotge a la capçalera';
COMMENT ON COLUMN display_settings.show_ticker IS 'Mostrar ticker de notícies a la part inferior';
COMMENT ON COLUMN display_settings.ticker_speed IS 'Velocitat del ticker en píxels per segon';
COMMENT ON COLUMN display_settings.primary_color IS 'Color principal hex (per a elements UI)';
COMMENT ON COLUMN display_settings.standby_message IS 'Missatge a mostrar quan no hi ha contingut';
COMMENT ON COLUMN display_settings.announcement_volume IS 'Volum dels anuncis (0=muted, 100=màxim)';
