import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protegir rutas que requereixen autenticació
  const protectedPaths = ['/admin', '/dashboard', '/visor', '/contingut', '/llistes', '/rss', '/usuaris', '/perfil'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protegir ruta /admin - només admin_global (si role està present en metadata)
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const role = (user.user_metadata as { role?: string })?.role;
    if (role && role !== 'admin_global') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protegir ruta /pantalla - només display (si role està present en metadata)
  if (request.nextUrl.pathname.startsWith('/pantalla') && user) {
    const role = (user.user_metadata as { role?: string })?.role;
    if (role && role !== 'display') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/visor/:path*',
    '/contingut/:path*',
    '/llistes/:path*',
    '/rss/:path*',
    '/usuaris/:path*',
    '/perfil/:path*',
    '/pantalla/:path*'
  ],
};
