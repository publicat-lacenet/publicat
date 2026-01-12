'use client';

import { createClient } from './client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'admin_global' | 'editor_profe' | 'editor_alumne' | 'display';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [centerId, setCenterId] = useState<string | undefined>(() => {
    // Intentar recuperar de sessionStorage
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('resolved_center_id') || undefined;
    }
    return undefined;
  });
  const [role, setRole] = useState<UserRole | undefined>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('resolved_role') as UserRole | undefined;
    }
    return undefined;
  });
  const supabase = useMemo(() => createClient(), []);

  // Funció per obtenir dades completes de l'usuari
  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      
      if (data.user) {
        setUser(data.user);
        
        const userRole = data.user.user_metadata?.role as UserRole;
        const userCenterId = data.user.user_metadata?.center_id;
        
        if (userRole) {
          setRole(userRole);
          sessionStorage.setItem('resolved_role', userRole);
        }
        
        if (userCenterId) {
          setCenterId(userCenterId);
          sessionStorage.setItem('resolved_center_id', userCenterId);
        } else if (userRole === 'admin_global') {
          // Admin global sense center_id, buscar el de Lacenet
          const { data: lacenet } = await supabase
            .from('centres')
            .select('id')
            .eq('slug', 'lacenet')
            .eq('active', true)
            .single();
          
          if (lacenet) {
            setCenterId(lacenet.id);
            sessionStorage.setItem('resolved_center_id', lacenet.id);
          }
        }
      } else {
        setUser(null);
        setRole(undefined);
        setCenterId(undefined);
        sessionStorage.removeItem('resolved_role');
        sessionStorage.removeItem('resolved_center_id');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    // 1) Hidratar des del servidor
    fetchUserData();

    // 2) Escoltar canvis de sessió - però NO sobreescriure amb dades incompletes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('🔐 Auth state change:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(undefined);
        setCenterId(undefined);
        sessionStorage.removeItem('resolved_role');
        sessionStorage.removeItem('resolved_center_id');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Tornar a obtenir les dades completes de l'API
        fetchUserData();
      }
      // Per altres events (INITIAL_SESSION, etc.) NO fem res 
      // perquè ja tenim les dades de fetchUserData
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  return { user, role, centerId, loading };
}
