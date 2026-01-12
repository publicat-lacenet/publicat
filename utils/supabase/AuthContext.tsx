'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from './client';

export type UserRole = 'admin_global' | 'editor_profe' | 'editor_alumne' | 'display';

interface AuthContextType {
  user: User | null;
  role: UserRole | undefined;
  centerId: string | undefined;
  loading: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [centerId, setCenterId] = useState<string | undefined>(() => {
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
        } else {
          setRole(undefined);
        }
        
        if (userCenterId) {
          setCenterId(userCenterId);
          sessionStorage.setItem('resolved_center_id', userCenterId);
        } else if (userRole === 'admin_global') {
          const { data: lacenet } = await supabase
            .from('centers')
            .select('id')
            .ilike('name', '%lacenet%')
            .eq('is_active', true)
            .limit(1)
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

    fetchUserData();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(undefined);
        setCenterId(undefined);
        sessionStorage.removeItem('resolved_role');
        sessionStorage.removeItem('resolved_center_id');
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserData();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  const value = useMemo(() => ({
    user,
    role,
    centerId,
    loading,
    refreshAuth: fetchUserData,
  }), [user, role, centerId, loading, fetchUserData]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
