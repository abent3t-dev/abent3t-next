import { NextResponse } from 'next/server';

/**
 * Fase 2: el callback OAuth ahora lo maneja el backend
 * (`GET /api/auth/callback`), que setea las cookies HttpOnly y redirige al
 * frontend a /home.
 *
 * Este route handler queda como NO-OP que solo redirige a /home — sirve
 * para soportar clients legacy que aún apunten a /auth/callback en el
 * frontend (p. ej. configuraciones viejas de Entra ID con redirect_uri al
 * dominio del frontend). En el flujo actual, este endpoint no se llama.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/home`);
}
