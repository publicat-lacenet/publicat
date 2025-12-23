import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtenir el perfil de l'usuari per saber el seu rol
  const { data: profile, error } = await supabase
    .from('users')
    .select('role, center_id, email')
    .eq('id', user.id)
    .single();

  console.log('Dashboard - User ID:', user.id);
  console.log('Dashboard - Profile:', profile);
  console.log('Dashboard - Error:', error);

  // Redirigir segons el rol
  if (profile?.role === 'admin_global') {
    console.log('Redirigint a /admin');
    redirect('/admin');
  } else if (profile?.role === 'display') {
    console.log('Redirigint a /pantalla');
    redirect('/pantalla');
  } else if (profile?.role === 'editor_profe' || profile?.role === 'editor_alumne') {
    console.log('Redirigint a /contingut');
    redirect('/contingut');
  }

  // Fallback per si no té rol assignat
  console.log('Fallback - Redirigint a /pantalla');
  redirect('/pantalla');
}
