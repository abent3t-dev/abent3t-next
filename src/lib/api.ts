import { createClient } from '@/lib/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Cache del token para evitar llamadas repetidas
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Usar token en cache si no ha expirado
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const supabase = createClient();

    // Timeout de 3 segundos para evitar que se cuelgue
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3000);
    });

    const sessionPromise = supabase.auth.getSession().then(({ data }) => data.session);

    const session = await Promise.race([sessionPromise, timeoutPromise]);

    if (session?.access_token) {
      cachedToken = session.access_token;
      // Cache por 5 minutos (el token dura más, pero refrescamos frecuentemente)
      tokenExpiry = Date.now() + 5 * 60 * 1000;
      return cachedToken;
    }
  } catch (err) {
    console.error('Error getting auth session:', err);
  }

  return null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  console.log(`[API] ${options?.method || 'GET'} ${path} - Token: ${token ? 'YES' : 'NO'}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Timeout de 10 segundos para el fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log(`[API] ${path} - Status: ${res.status}`);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || 'Error en la petición');
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout: El servidor no responde');
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
