import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Obtenir l'origen de la request per redirigir correctament
  const headersList = await headers()
  const origin = headersList.get('origin') || headersList.get('referer') || request.url
  const baseUrl = new URL(origin).origin
  
  // Redirect amb status 303 per forçar GET després del POST
  return NextResponse.redirect(new URL('/', baseUrl), { status: 303 })
}
