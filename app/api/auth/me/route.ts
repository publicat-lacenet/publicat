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

  // SIEMPRE buscar rol en la tabla users y priorizar ese valor sobre user_metadata
  let user_metadata = data.user.user_metadata ?? {};

  try {
    const { data: profile } = await supabase
      .from('users')
      .select('role, center_id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile) {
      // Priorizar rol y center_id de la tabla users
      user_metadata = {
        ...user_metadata,
        role: profile.role || (user_metadata as any).role,
        center_id: profile.center_id || (user_metadata as any).center_id,
      } as Record<string, any>;
    }
  } catch {
    // Silently handle error
  }

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
