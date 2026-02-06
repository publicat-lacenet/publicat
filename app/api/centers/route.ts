import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/centers - Llistar centres actius (per a filtres)
export async function GET() {
  const supabase = await createClient();

  // Verificar autenticació
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
  }

  // Obtenir tots els centres actius
  const { data: centers, error } = await supabase
    .from('centers')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ centers });
}
