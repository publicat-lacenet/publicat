import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {}
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return new Response(JSON.stringify({ user: null, error: error.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!data.user) {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Enriquecer metadatos: si no hay role/center_id en user_metadata, intentar cargar desde tabla users
  let user_metadata = data.user.user_metadata ?? {};
  const hasRole = typeof (user_metadata as any).role === 'string';
  const hasCenter = typeof (user_metadata as any).center_id === 'string';

  try {
    if (!hasRole || !hasCenter) {
      const { data: profile } = await supabase
        .from('users')
        .select('role, center_id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        user_metadata = {
          ...user_metadata,
          ...(profile.role ? { role: profile.role } : {}),
          ...(profile.center_id ? { center_id: profile.center_id } : {}),
        } as Record<string, any>;
      }
    }
  } catch {}

  return new Response(
    JSON.stringify({
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
