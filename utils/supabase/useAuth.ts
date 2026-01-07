'use client';

import { createClient } from './client';
import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin_global' | 'editor_profe' | 'editor_alumne' | 'display';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    // 1) Hidratar desde el servidor (cookies) para evitar estados nulos en el cliente
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setUser(data.user ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // 2) Mantener sincronizado con cambios de sesión en el cliente
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const role = user?.user_metadata?.role as UserRole | undefined;
  const centerId = user?.user_metadata?.center_id as string | undefined;

  return { user, role, centerId, loading };
}
