# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PUBLI*CAT is a video platform for educational centers built with Next.js 16 that allows centralizing, organizing, and sharing educational audiovisual content from Vimeo. The application features a role-based permission system with four roles (admin_global, editor_profe, editor_alumne, display) and uses Supabase for authentication and PostgreSQL database.

## Common Development Commands

### Development
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Create production build
npm run start        # Run production server
npm run lint         # Run ESLint
```

### Database Migrations

**Current workflow (manual):**
1. Create migration file in `supabase/migrations/` with chronological naming (YYYYMMDDHHmmss format)
2. Copy the SQL code into Supabase SQL Editor (https://supabase.com/dashboard/project/PROJECT_ID/sql)
3. Click "Run" to execute the migration
4. Migrations are stored in the repo for version control but applied manually to the database

**Note:** This project does NOT use Supabase CLI for migrations. All schema changes are applied through the Supabase dashboard SQL editor.

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For admin operations
VIMEO_ACCESS_TOKEN=your-vimeo-token  # Requires scopes: private, upload, video_files, public
DATABASE_URL=postgresql://...  # For MCP Supabase integration (optional)
```

### Database Inspection with MCP

This project supports the **Supabase MCP server** for database inspection. The `DATABASE_URL` is available in `.env.local` and can be used with MCP tools to:
- Query database schema and structure
- Inspect table data
- Verify RLS policies
- Check relationships and constraints

**To use MCP with this database:**
The connection string is already configured in `.env.local` under `DATABASE_URL`. MCP-enabled tools can use this to directly inspect and query the Supabase PostgreSQL database.

## Architecture Overview

### Next.js 16 App Router Structure

- **App Router with Turbopack**: Uses Next.js 16's App Router architecture
- **Proxy-based middleware**: Authentication and route protection is handled via `proxy.ts` (Next.js 16 migration from middleware)
- **Server Components by default**: Most pages are React Server Components with client components explicitly marked with `"use client"`
- **API Routes**: RESTful API routes in `app/api/` for all backend operations

### Authentication & Authorization Flow

1. **Supabase Auth**: Uses Supabase's email/password authentication system
2. **Session Management**: Server-side session handling via `@supabase/ssr`
3. **Client Creation**:
   - Server: `utils/supabase/server.ts` - `createClient()` for server components/API routes
   - Client: `utils/supabase/client.ts` - for client components
4. **Route Protection**: `proxy.ts` protects routes and enforces role-based access
5. **User Hydration**: `/api/auth/me` endpoint hydrates session with user profile data from `public.users` table

### Database Architecture

- **Multi-tenant design**: Each center is a tenant with `center_id` as the main partition key
- **Row Level Security (RLS)**: All tables have RLS policies based on user roles
- **Key relationships**:
  - `users` ↔ `centers` (many-to-one, except admin_global)
  - `videos` ↔ `centers` (many-to-one)
  - `videos` ↔ `tags` (many-to-many via `video_tags`)
  - `videos` ↔ `hashtags` (many-to-many via `video_hashtags`)
  - `playlists` ↔ `videos` (many-to-many via `playlist_items`)

**Special behavior:**
- Admin global users are automatically assigned to "Centre Lacenet" via database trigger
- Videos have `zone_id` denormalized from their center for fast zone-based filtering
- Video status workflow: `pending_approval` → `published` (rejected = deleted)

### Role-Based Access Control

**Four roles with distinct permissions:**

1. **admin_global**: Full system access, manages all centers/users/zones, automatically linked to Centre Lacenet
2. **editor_profe**: Manages videos, playlists, and users within their center
3. **editor_alumne**: Can upload videos (pending approval), edit allowed playlists
4. **display**: Read-only mode for TV/display screens, no UI controls

**Key constraint**: All users except admin_global MUST have a center_id. This is enforced at database level.

### Vimeo Integration

**Two workflows:**

1. **URL-based** (M3a): Paste Vimeo URL → validate → extract metadata
2. **Direct upload** (M3b): Upload file → Tus protocol → Vimeo processing → poll for completion

**Key components:**
- `lib/vimeo/api.ts`: Core Vimeo API functions (`getVimeoVideoData`)
- `lib/vimeo/utils.ts`: URL parsing and validation utilities
- `app/api/vimeo/validate/route.ts`: Validates Vimeo URLs and extracts metadata
- `app/api/vimeo/upload/ticket/route.ts`: Generates Tus upload ticket
- `app/api/vimeo/status/[videoId]/route.ts`: Polls video processing status
- `app/components/videos/VideoUploader.tsx`: Client-side upload UI with progress

**Important details:**
- Videos store both `vimeo_id` (numeric ID) and `vimeo_hash` (for unlisted videos)
- System waits for real thumbnails (not placeholders) before marking upload complete
- Supports formats: mp4, mov, avi, mkv, webm (up to 2GB)
- Vimeo API rate limiting: cache aggressively (1 hour default)

### Component Organization

**Layout Components** (`app/components/layout/`):
- `AdminLayout.tsx`: Admin panel wrapper with tabs
- `AppSidebar.tsx`: Dynamic sidebar that changes based on user role
- `AppHeader.tsx`: Header with role indicator

**Video Components** (`app/components/videos/`):
- `VideoFormModal.tsx`: Reusable modal for create/edit video (handles both URL input and direct upload)
- `VideoUploader.tsx`: Direct file upload to Vimeo with progress tracking
- `VideoGrid.tsx` + `VideoCard.tsx`: Responsive grid display
- `VimeoUrlInput.tsx`: URL input with real-time validation
- `TagSelector.tsx` + `HashtagInput.tsx`: Tag/hashtag selection UI

**UI Components** (`app/components/ui/`):
- Lowercase filenames: `button.tsx`, `card.tsx`, `badge.tsx`, `alert.tsx` (shadcn/ui style)
- PascalCase for composed UI: `PageHeader.tsx`, `Modal.tsx`, `AdminTabs.tsx`

### API Route Patterns

All API routes return JSON and follow RESTful conventions:

```
GET    /api/videos              # List videos (with filters)
POST   /api/videos              # Create video
PATCH  /api/videos/[id]         # Update video
DELETE /api/videos/[id]         # Delete video

GET    /api/admin/users         # List users (admin only)
POST   /api/admin/users         # Create + invite user
PATCH  /api/admin/users/[id]    # Update user
DELETE /api/admin/users/[id]    # Delete user
POST   /api/admin/users/[id]/resend-invite  # Resend invitation

POST   /api/vimeo/validate      # Validate Vimeo URL
POST   /api/vimeo/upload/ticket # Get Tus upload URL
GET    /api/vimeo/status/[videoId] # Check processing status
```

**Authentication pattern in API routes:**
```typescript
const supabase = await createClient()
const { data: { user }, error } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### State Management

**No global state library** - relies on:
- React Server Components for initial data loading
- Native React `useState` for local component state
- Custom hooks (`useVideos.ts`, `useVimeoValidation.ts`, `useDebouncedCallback.ts`) for reusable logic
- Supabase real-time subscriptions (future enhancement)

### Styling Approach

- **Tailwind CSS 4**: Utility-first styling
- **Corporate colors**:
  - Primary Yellow: `#FEDD2C`
  - Accent Pink: `#F91248`
  - Accent Cyan: `#16AFAA`
  - Background: `#F9FAFB`
  - Text: `#111827`
- **Typography**: Montserrat (headings), Inter (body)
- **Responsive design**: Mobile-first with responsive grids
- **Style guide**: See `docs/ui/guia-estil.md` for detailed design guidelines

## Critical Implementation Patterns

### 1. Creating Supabase Clients

**Server Components / API Routes:**
```typescript
import { createClient } from '@/utils/supabase/server'
const supabase = await createClient()
```

**Client Components:**
```typescript
import { createClient } from '@/utils/supabase/client'
const supabase = createClient()
```

### 2. Video Upload Flow (M3b)

1. User selects file in `VideoFormModal`
2. `VideoUploader` component requests Tus ticket from `/api/vimeo/upload/ticket`
3. Upload directly to Vimeo using tus-js-client with progress tracking
4. Poll `/api/vimeo/status/[videoId]` until processing complete and real thumbnail available
5. Extract `vimeo_id` and `vimeo_hash` from completed video
6. Save video metadata to database via `/api/videos`

### 3. RLS Policy Pattern

All database queries automatically respect RLS policies. The policies check:
- User's role (from `public.users.role`)
- User's center_id (from `public.users.center_id`)
- Video sharing settings (`is_shared_with_other_centers`)

Example: An editor_profe can only see videos where:
- `videos.center_id = user.center_id` OR
- `videos.is_shared_with_other_centers = true`

### 4. Next.js 16 Proxy Pattern

The `proxy.ts` file exports a `proxy()` function and a config matcher. This replaces the traditional middleware pattern:

```typescript
export async function proxy(request: NextRequest) {
  // Create Supabase client with request cookies
  // Check authentication
  // Redirect if needed
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', ...]
}
```

Then imported in `next.config.ts` (though current config doesn't show this - verify if middleware.ts exists).

### 5. Modal Pattern for Forms

Forms use a reusable modal pattern:
```typescript
<Modal isOpen={isOpen} onClose={onClose}>
  <form onSubmit={handleSubmit}>
    {/* Form content */}
  </form>
</Modal>
```

The same modal handles both create and edit modes by checking if an `initialVideo` prop is provided.

## Common Pitfalls & Gotchas

### 1. File Naming Case Sensitivity
- UI components in `app/components/ui/` use lowercase filenames (`button.tsx`) following shadcn/ui conventions
- Other components use PascalCase (`VideoCard.tsx`)
- Be careful with case-sensitive file systems in production

### 2. Supabase Client Context
- Never use server client in client components (causes hydration errors)
- Always use `await createClient()` in server contexts

### 3. Admin Global Center Assignment
- When creating admin_global users, they automatically get assigned to Centre Lacenet via trigger
- Don't manually set `center_id` for admin_global unless intentionally overriding

### 4. Vimeo Thumbnail Placeholders
- Vimeo initially returns placeholder thumbnails during video processing
- Always poll `/api/vimeo/status/[videoId]` until a real thumbnail is available
- Check for non-placeholder URLs (not containing "placeholder")

### 5. Database Migrations (Manual Process)
- Migrations are numbered chronologically (YYYYMMDDHHmmss format)
- M1 migrations establish core schema, M3b adds upload features, M3c adds moderation
- Never edit existing migrations - create new ones for schema changes
- **Important:** Migrations are NOT applied via Supabase CLI. Copy SQL to Supabase SQL Editor and click "Run"
- Migration files in `supabase/migrations/` serve as version control only

### 6. Route Protection
- `proxy.ts` protects routes but role checking relies on `user.user_metadata.role`
- Ensure all admin operations also check permissions server-side in API routes

## Project-Specific Terminology

- **Centre**: Educational center (tenant in multi-tenant architecture)
- **Zona**: Geographic zone grouping multiple centers
- **Tag**: Global, controlled vocabulary tag (managed by admins)
- **Hashtag**: Center-specific, free-form tag
- **Llista/Playlist**: Ordered collection of videos with different kinds (weekday, announcements, custom, global, landing)
- **Compartir**: Share video with other centers (cross-center visibility)
- **Moderació**: Approval workflow for editor_alumne uploads

## Documentation Structure

Comprehensive documentation in `docs/`:
- `overview.md`: System overview
- `database.schema.md`: Complete database schema (reference design)
- `DB-AUDIT-REPORT.md`: **Complete database audit report (2026-01-19)** - Real state of DB
- `roles.md`: Role system details
- `authentication.md`: Auth flow documentation
- `vimeo-integration.md`: Vimeo integration guide
- `milestones/`: Feature milestone specifications (M1, M2, M3a, M3b, M3c)
- `ui/`: UI design guidelines and component documentation

**Important:** When working with database schema, always check `DB-AUDIT-REPORT.md` for the current state, including all applied migrations, RLS policies, triggers, and indexes.

Always consult these docs when working on features related to their topics.

## Testing Approach

Currently no automated test suite. Manual testing workflow:
1. Test with different user roles (create test users for each role)
2. Use Vimeo test videos: https://vimeo.com/148751763
3. Verify RLS policies by attempting unauthorized access
4. Check Vercel deployment logs for production issues

## Deployment

- **Platform**: Vercel
- **Branch**: `main` auto-deploys to production
- **URL**: https://publicat-lovat.vercel.app
- **Build command**: `npm run build`
- **Environment**: Configure all env vars in Vercel dashboard

## Current Development State

**Completed Milestones:**
- ✅ M1: Database schema with RLS
- ✅ M2: Admin UI (centers, users, zones management)
- ✅ M3a: Content management base (URL-based video creation)
- ✅ M3b: Direct upload to Vimeo via Tus protocol
- ✅ **Database Audit (2026-01-19)**: Complete review of schema, RLS, triggers, and indexes

**Database Status:**
- ✅ 14 tables with proper RLS policies
- ✅ 11 triggers for automation
- ✅ 13 optimized indexes
- ✅ 17 foreign keys with correct cascade rules
- ✅ All migrations applied and documented

**In Progress / Next:**
- 🚧 M3c: Moderation system for editor_alumne uploads (schema ready)
- 📋 M4: Playlist management UI (schema ready)
- 📡 M5: RSS feed integration (schema ready, UI pending)
- 🖥️ M6: Display mode for TV screens

## Quick Start for New Features

1. Check if database schema changes are needed → create migration in `supabase/migrations/`
2. Add API routes in `app/api/` following RESTful patterns
3. Create UI components in appropriate `app/components/` subdirectory
4. Add page in `app/` directory (e.g., `app/contingut/page.tsx`)
5. Update `AppSidebar.tsx` if new navigation item needed
6. Test with all user roles
7. Update relevant docs in `docs/` if adding major feature
