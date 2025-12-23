-- Milestone 1.2: Seguretat Base (RLS)
-- Descripció: Polítiques de Row Level Security per a les taules core.

-- 1. ACTIVAR RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTIQUES PER A 'zones'
CREATE POLICY "Zones are viewable by authenticated users" 
ON zones FOR SELECT TO authenticated 
USING (
    is_active = true OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Zones are manageable by admin_global" 
ON zones FOR ALL TO authenticated 
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- 3. POLÍTIQUES PER A 'centers'
CREATE POLICY "Users can view their own center" 
ON centers FOR SELECT TO authenticated 
USING (
    id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Centers are manageable by admin_global" 
ON centers FOR ALL TO authenticated 
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

-- 4. POLÍTIQUES PER A 'users'
CREATE POLICY "Users can view profiles in their center" 
ON users FOR SELECT TO authenticated 
USING (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Admins and editors can manage users" 
ON users FOR ALL TO authenticated 
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global' OR 
    (
        (SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe' AND 
        center_id = (SELECT center_id FROM users WHERE id = auth.uid())
    )
);

-- 5. POLÍTIQUES PER A 'videos'
CREATE POLICY "Videos are viewable by center or if shared" 
ON videos FOR SELECT TO authenticated 
USING (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Users can manage videos in their center" 
ON videos FOR ALL TO authenticated 
USING (
    center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);
