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
  const { data: profile } = await supabase
    .from('users')
    .select('role, center_id')
    .eq('id', user.id)
    .single();

  // Redirigir segons el rol
  if (profile?.role === 'admin_global') {
    redirect('/admin');
  } else if (profile?.role === 'display') {
    redirect('/pantalla');
  } else if (profile?.role === 'editor_profe' || profile?.role === 'editor_alumne') {
    redirect('/contingut');
  }

  // Fallback per si no té rol assignat
  redirect('/pantalla');
}
