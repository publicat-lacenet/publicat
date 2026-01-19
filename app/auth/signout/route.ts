import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Cerrar sesión en Supabase
  await supabase.auth.signOut()

  // Obtenir l'origen de la request per redirigir correctament
  const headersList = await headers()
  const origin = headersList.get('origin') || headersList.get('referer') || request.url
  const baseUrl = new URL(origin).origin

  // Crear respuesta con headers para limpiar cookies
  const response = NextResponse.redirect(new URL('/login', baseUrl), { status: 303 })

  // Limpiar todas las cookies relacionadas con la autenticación
  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'supabase.auth.token',
  ];

  cookiesToClear.forEach(cookieName => {
    response.cookies.set(cookieName, '', {
      maxAge: 0,
      path: '/',
    });
  });

  return response;
}
