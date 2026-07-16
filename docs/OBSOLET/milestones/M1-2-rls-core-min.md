# Milestone 1.2: Seguretat Base (RLS)

Aquest document defineix les polítiques de **Row Level Security (RLS)** per a les taules core creades al Milestone 1.1. L'objectiu és garantir l'aïllament multi-tenant i el control d'accés basat en rols.

---

## 1. Configuració Global

```sql
-- Activar RLS a totes les taules core
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
```

---

## 2. Polítiques per Taula

### 2.1 `zones`
- **Lectura:** Tothom autenticat pot llegir zones actives.
- **Escriptura:** Només `admin_global`.

```sql
CREATE POLICY "Zones are viewable by authenticated users" 
ON zones FOR SELECT TO authenticated 
USING (is_active = true OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global');

CREATE POLICY "Zones are manageable by admin_global" 
ON zones FOR ALL TO authenticated 
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin_global');
```

### 2.2 `centers`
- **Lectura:** Usuaris veuen el seu propi centre. `admin_global` veu tots.
- **Escriptura:** Només `admin_global`.

```sql
CREATE POLICY "Users can view their own center" 
ON centers FOR SELECT TO authenticated 
USING (
  id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);

CREATE POLICY "Centers are manageable by admin_global" 
ON centers FOR ALL TO authenticated 
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin_global');
```

### 2.3 `users`
- **Lectura:** Usuaris veuen perfils del seu centre. `admin_global` veu tots.
- **Escriptura:** `admin_global` (tots), `editor_profe` (només el seu centre).

```sql
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
  ((SELECT role FROM users WHERE id = auth.uid()) = 'editor_profe' AND center_id = (SELECT center_id FROM users WHERE id = auth.uid()))
);
```

### 2.4 `videos`
- **Lectura:** Usuaris veuen vídeos del seu centre o vídeos compartits.
- **Escriptura:** `editor_profe` i `editor_alumne` (només el seu centre).

```sql
CREATE POLICY "Videos are viewable by center or if shared" 
ON videos FOR SELECT TO authenticated 
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
  -- Nota: La compartició s'afegirà al M1.3
);

CREATE POLICY "Users can manage videos in their center" 
ON videos FOR ALL TO authenticated 
USING (
  center_id = (SELECT center_id FROM users WHERE id = auth.uid()) OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_global'
);
```

---

## 3. Validació de Seguretat (Tests Manuals)

Per validar les polítiques, s'han d'executar les següents queries simulant diferents rols:

```sql
-- Simular Editor de Centre A
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "UUID_EDITOR_A"}';
SELECT * FROM centers; -- Només hauria de retornar Centre A
SELECT * FROM videos;  -- Només hauria de retornar vídeos del Centre A
```

---

## 4. Checklist de Validació
- [ ] RLS activat a les 4 taules core.
- [ ] `admin_global` té accés total a totes les taules.
- [ ] Usuaris no poden veure dades d'altres centres (Isolation).
- [ ] `editor_profe` pot gestionar usuaris del seu propi centre.
- [ ] `editor_alumne` pot veure vídeos del seu centre.

---

## 5. Pròxims Passos
- Implementar classificació a `M1-3-content-schema.md`.
- Implementar automatismes a `M1-5-triggers-core.md`.
