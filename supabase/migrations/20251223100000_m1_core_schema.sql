-- Milestone 1.1: Schema Core Mínim
-- Data: 2025-12-23

-- 1. Enums Nuclears
CREATE TYPE user_role AS ENUM (
  'admin_global', 
  'editor_profe', 
  'editor_alumne', 
  'display'
);

CREATE TYPE onboarding_status AS ENUM (
  'invited', 
  'active', 
  'disabled'
);

CREATE TYPE video_type AS ENUM (
  'content', 
  'announcement'
);

CREATE TYPE video_status AS ENUM (
  'pending_approval', 
  'published'
);

-- 2. Taules Core

-- 2.1 zones
CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 centers
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

-- 2.3 users
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
  
  CONSTRAINT chk_user_center_role CHECK (
    (role = 'admin_global' AND center_id IS NULL) OR 
    (role <> 'admin_global' AND center_id IS NOT NULL)
  )
);

CREATE INDEX idx_users_center_id ON users(center_id);
CREATE INDEX idx_users_role ON users(role);

-- 2.4 videos
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
