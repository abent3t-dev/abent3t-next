'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '@/types/auth';
import { HOME_ROUTES } from '@/types/auth';
import { api } from '@/lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signInWithMicrosoft: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
  isJefeArea: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const supabase = getSupabase();

      const loadUser = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          try {
            const profile = await api.get<UserProfile>('/auth/me');
            setUser(profile);
          } catch {
            setUser(null);
          }
        }
        setLoading(false);
      };

      loadUser();

      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          try {
            const profile = await api.get<UserProfile>('/auth/me');
            setUser(profile);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      subscription = data.subscription;
    } catch {
      // Supabase not configured (build time)
      setLoading(false);
    }

    return () => subscription?.unsubscribe();
  }, [getSupabase]);

  const signInWithMicrosoft = async () => {
    const supabase = getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid profile email',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    try {
      const profile = await api.get<UserProfile>('/auth/me');
      setUser(profile);
      // Redirigir a la página de inicio según el rol
      const homeRoute = HOME_ROUTES[profile.role] || '/capacitacion/mis-cursos';
      window.location.href = homeRoute;
    } catch {
      // Profile might not exist yet, redirect to default
      window.location.href = '/capacitacion/mis-cursos';
    }

    return { error: null };
  };

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const isSuperAdmin = user?.role === 'super_admin';
  const isJefeArea = user?.role === 'jefe_area';

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithMicrosoft, signInWithEmail, signOut, hasRole, isSuperAdmin, isJefeArea }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
