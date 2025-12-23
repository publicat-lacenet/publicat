# Milestone 1.1: Schema Core Mínim

Aquest document defineix la primera migration executable de **Publicat**. L'objectiu és crear l'estructura mínima necessària per desbloquejar el desenvolupament de la interfície d'administració (M2).

---

## 1. Enums Nuclears

```sql
-- Rols d'usuari
CREATE TYPE user_role AS ENUM (
  'admin_global', 
  'editor_profe', 
  'editor_alumne', 
  'display'
);

-- Estat d'onboarding
CREATE TYPE onboarding_status AS ENUM (
  'invited', 
  'active', 
  'disabled'
);

-- Tipus de vídeo
CREATE TYPE video_type AS ENUM (
  'content', 
  'announcement'
);

-- Estat de moderació
CREATE TYPE video_status AS ENUM (
  'pending_approval', 
  'published'
);
```

---

## 2. Taules Core

### 2.1 `zones`
Catàleg global de zones geogràfiques.

```sql
CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 2.2 `centers`
Centres educatius (tenants).

```sql
CREATE TABLE centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_centers_zone_id ON centers(zone_id);
```

### 2.3 `users`
Perfil d'aplicació vinculat 1:1 amb `auth.users`.

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role user_role NOT NULL,
  center_id uuid REFERENCES centers(id) ON DELETE RESTRICT,
  full_name text,
  phone text,
  onboarding_status onboarding_status NOT NULL DEFAULT 'invited',
  is_active boolean NOT NULL DEFAULT true,
  invited_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  
  -- Constraint: admin_global no té centre, la resta sí
  CONSTRAINT chk_user_center_role CHECK (
    (role = 'admin_global' AND center_id IS NULL) OR 
    (role <> 'admin_global' AND center_id IS NOT NULL)
  )
);

CREATE INDEX idx_users_center_id ON users(center_id);
CREATE INDEX idx_users_role ON users(role);
```

### 2.4 `videos` (Versió Mínima)
Contingut audiovisual bàsic.

```sql
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  type video_type NOT NULL DEFAULT 'content',
  status video_status NOT NULL DEFAULT 'pending_approval',
  vimeo_url text NOT NULL,
  duration_seconds int,
  thumbnail_url text,
  uploaded_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_videos_center_id ON videos(center_id);
CREATE INDEX idx_videos_status ON videos(status);
```

---

## 3. Checklist d'Implementació
- [ ] Enums creats correctament.
- [ ] Taula `zones` creada amb constraint UNIQUE en `name`.
- [ ] Taula `centers` vinculada a `zones`.
- [ ] Taula `users` vinculada a `auth.users` i `centers`.
- [ ] Constraint `chk_user_center_role` validat.
- [ ] Taula `videos` creada amb camps mínims.
- [ ] Índexs de performance creats per a FKs i filtres comuns.

---

## 4. Pròxims Passos
- Implementar RLS base a `M1-2-rls-core-min.md`.
- Afegir classificació (tags/hashtags) a `M1-3-content-schema.md`.
