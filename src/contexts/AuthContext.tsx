'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { UserProfile, UserRole } from '@/types/auth';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AuthConfig {
  oidc_enabled: boolean;
  local_login_enabled: boolean;
  allowed_email_domain: string | null;
}

interface SignInLocalResult {
  error: string | null;
  must_change_password?: boolean;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  authConfig: AuthConfig | null;
  signInWithMicrosoft: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<SignInLocalResult>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  /** Refresca el perfil/roles del usuario actual desde el backend. */
  refreshUser: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdminRH: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  // Cargar config de auth + perfil al montar
  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    const init = async () => {
      // Config (público — qué paths de login mostrar)
      try {
        const cfg = await api.get<AuthConfig>('/auth/config');
        if (mounted) setAuthConfig(cfg);
      } catch (err) {
        console.error('Error loading auth config:', err);
      }

      // Perfil actual (si hay cookie válida)
      try {
        const profile = await api.get<UserProfile>('/auth/me');
        if (mounted) setUser(profile);
      } catch {
        // No autenticado — eso es OK al cargar /login.
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Redirige al endpoint del backend que arranca el flujo OIDC. El backend
   * redirige a Entra ID; tras el login Entra redirige al backend (callback);
   * el backend setea cookies y redirige al frontend a /home.
   *
   * Si OIDC no está configurado en el backend (`AZURE_AD_*` vacío), el
   * endpoint devuelve 503 o redirige al /login (según el código del backend).
   */
  const signInWithMicrosoft = async () => {
    window.location.href = `${API_BASE}/auth/login`;
  };

  /**
   * Login con email+password (modo dev). El backend valida contra
   * `local_credentials` (bcrypt) y setea cookies HttpOnly.
   */
  const signInWithEmail = async (
    email: string,
    password: string,
  ): Promise<SignInLocalResult> => {
    try {
      const result = await api.post<{
        user: UserProfile;
        must_change_password?: boolean;
      }>('/auth/login-local', { email, password });
      setUser(result.user);
      window.location.href = '/home';
      return {
        error: null,
        must_change_password: result.must_change_password,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de autenticación';
      return { error: msg };
    }
  };

  const signOut = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // ignorar — siempre limpiar el estado local y redirigir
    }
    setUser(null);
    window.location.href = '/login';
  };

  /** Refresca el perfil/roles del usuario actual. */
  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.get<UserProfile>('/auth/me');
      setUser(profile);
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  }, []);

  /**
   * True si el usuario tiene CUALQUIERA de los roles solicitados (de la
   * lista efectiva de roles, no solo el primario).
   */
  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      const effective = user.roles ?? [user.role];
      return roles.some((r) => effective.includes(r));
    },
    [user],
  );

  const effectiveRoles = user?.roles ?? (user ? [user.role] : []);
  const isSuperAdmin = effectiveRoles.includes('super_admin');
  const isAdminRH = isSuperAdmin || effectiveRoles.includes('admin_rh');
  const isManager =
    isSuperAdmin ||
    effectiveRoles.some(
      (r) => r === 'admin_rh' || r === 'jefe_area' || r === 'director',
    );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authConfig,
        signInWithMicrosoft,
        signInWithEmail,
        signOut,
        hasRole,
        refreshUser,
        isSuperAdmin,
        isAdminRH,
        isManager,
      }}
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
