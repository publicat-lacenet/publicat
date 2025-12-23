# Milestone 1.6: Seeds & Dades Demo

Aquest document conté els scripts SQL per carregar les dades inicials necessàries per al desenvolupament i les proves del sistema. Aquests scripts han de ser idempotents (es poden executar diverses vegades sense errors).

---

## 1. Zones Globals

```sql
INSERT INTO zones (name)
VALUES 
  ('Catalunya'),
  ('Espanya'),
  ('Europa'),
  ('Món')
ON CONFLICT (name) DO NOTHING;
```

---

## 2. Tags Globals (12 predefinits)

```sql
INSERT INTO tags (name)
VALUES 
  ('World'),
  ('Espanya'),
  ('Catalunya'),
  ('Esports'),
  ('Meteorologia'),
  ('STEM-TECH'),
  ('Efemèrides'),
  ('Dites i refranys'),
  ('Curiositats'),
  ('Música'),
  ('Arts'),
  ('Vida al centre')
ON CONFLICT (name) DO NOTHING;
```

---

## 3. Centre Demo

```sql
DO $$
DECLARE
  cat_zone_id uuid;
BEGIN
  SELECT id INTO cat_zone_id FROM zones WHERE name = 'Catalunya';
  
  INSERT INTO centers (name, zone_id)
  VALUES ('Institut Demo', cat_zone_id)
  ON CONFLICT DO NOTHING;
END $$;
```

---

## 4. Usuaris Demo (Perfils)

**Nota:** Aquests scripts només creen el perfil a `public.users`. L'usuari ha d'existir prèviament a `auth.users` (via Dashboard de Supabase o script d'invitació).

```sql
DO $$
DECLARE
  demo_center_id uuid;
BEGIN
  SELECT id INTO demo_center_id FROM centers WHERE name = 'Institut Demo';
  
  -- Admin Global (Sense centre)
  -- INSERT INTO users (id, email, role, onboarding_status) 
  -- VALUES ('UUID_FROM_AUTH', 'admin@publicat.cat', 'admin_global', 'active');

  -- Editor Profe
  -- INSERT INTO users (id, email, role, center_id, onboarding_status) 
  -- VALUES ('UUID_FROM_AUTH', 'profe@demo.cat', 'editor_profe', demo_center_id, 'active');

  -- Editor Alumne
  -- INSERT INTO users (id, email, role, center_id, onboarding_status) 
  -- VALUES ('UUID_FROM_AUTH', 'alumne@demo.cat', 'editor_alumne', demo_center_id, 'active');

  -- Display
  -- INSERT INTO users (id, email, role, center_id, onboarding_status) 
  -- VALUES ('UUID_FROM_AUTH', 'display@demo.cat', 'display', demo_center_id, 'active');
END $$;
```

---

## 5. Checklist de Validació
- [ ] Zones carregades correctament.
- [ ] Els 12 tags globals estan disponibles.
- [ ] El centre demo s'ha creat i té les seves 8 llistes (via trigger).
- [ ] Els perfils d'usuari es poden vincular manualment per a proves inicials.

---

## 6. Pròxims Passos
- Implementar les extensions futures a `M1-7-extended-schema.md`.
- Començar el desenvolupament de la UI d'Administració (M2).
