/**
 * Cliente HTTP del frontend.
 *
 * Fase 2: el JWT propio vive en cookies HttpOnly (`access_token`,
 * `refresh_token`) seteadas por el backend en `/auth/login-local` y
 * `/auth/callback`. El navegador las envía automáticamente cuando
 * `credentials: 'include'`. JS no las puede leer (HttpOnly), así que ya
 * no extraemos token manualmente — la cookie viaja sola.
 *
 * Las requests inválidas (401) NO se intentan refrescar automáticamente
 * aquí — eso lo maneja el `AuthContext` o un wrapper de fetch superior.
 * Para refrescar manualmente: `POST /auth/refresh` con `credentials: 'include'`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      // El navegador adjunta cookies HttpOnly del dominio del backend.
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: res.statusText }));
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

/**
 * Helper para subir archivos (multipart/form-data). Mismo manejo de cookies
 * — el navegador las envía. NO setear `Content-Type` manualmente: el
 * navegador lo arma con el boundary correcto.
 */
export async function uploadFile<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Error al subir el archivo');
  }
  return res.json();
}

/**
 * Helper para descargar un archivo binario (e.g. Excel export). Devuelve
 * un Blob para que el caller decida cómo manejarlo (downloadar, abrir, etc).
 */
export async function downloadFile(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Error al descargar');
  }
  return res.blob();
}
