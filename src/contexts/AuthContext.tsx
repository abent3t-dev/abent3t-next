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
  /** Refresca el perfil/roles del usuario actual desde el backend. Útil
   *  después de cambiarse a uno mismo los roles desde /admin/users. */
  refreshUser: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdminRH: boolean;
  isManager: boolean;
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
    let mounted = true;

    // Timeout para evitar loading infinito
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    const loadUser = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          try {
            const profile = await api.get<UserProfile>('/auth/me');
            if (mounted) setUser(profile);
          } catch (err) {
            console.error('Error loading profile:', err);
            if (mounted) setUser(null);
          }
        } else {
          if (mounted) setUser(null);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const setupSubscription = () => {
      try {
        const supabase = getSupabase();
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session) {
            try {
              const profile = await api.get<UserProfile>('/auth/me');
              if (mounted) setUser(profile);
            } catch {
              if (mounted) setUser(null);
            }
          } else {
            if (mounted) setUser(null);
          }
          if (mounted) setLoading(false);
        });
        subscription = data.subscription;
      } catch {
        // Supabase not configured
      }
    };

    loadUser();
    setupSubscription();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
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

  /**
   * Refresca el perfil/roles del usuario actual.
   * Se llama después de que un super_admin se modifique los roles a sí mismo
   * desde /admin/users — sin esto, el sidebar quedaba desfasado hasta logout.
   */
  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.get<UserProfile>('/auth/me');
      setUser(profile);
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  }, []);

  /**
   * Devuelve true si el usuario tiene CUALQUIERA de los roles solicitados.
   * Consulta la lista efectiva de roles (profiles.role + user_roles), no
   * solo el rol primario.
   */
  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    const effective = user.roles ?? [user.role];
    return roles.some((r) => effective.includes(r));
  }, [user]);

  const effectiveRoles = user?.roles ?? (user ? [user.role] : []);
  const isSuperAdmin = effectiveRoles.includes('super_admin');
  const isAdminRH = isSuperAdmin || effectiveRoles.includes('admin_rh');
  const isManager =
    isSuperAdmin ||
    effectiveRoles.some((r) => r === 'admin_rh' || r === 'jefe_area' || r === 'director');

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithMicrosoft, signInWithEmail, signOut, hasRole, refreshUser, isSuperAdmin, isAdminRH, isManager }}
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
