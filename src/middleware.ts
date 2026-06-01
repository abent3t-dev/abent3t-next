import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware simple post-Supabase (Fase 2).
 *
 * Solo verifica la presencia de la cookie `access_token` para redirects de
 * navegación. NO valida la firma del JWT aquí — la validación real ocurre
 * en cada request al backend (JwtAuthGuard). Si la cookie existe pero el
 * JWT está expirado, el backend responde 401 y el AuthContext maneja la
 * limpieza.
 *
 * Reglas:
 *   * Si NO hay cookie y la ruta no es pública → redirect a /login.
 *   * Si hay cookie y el usuario está en /login o "/" → redirect a /home.
 */

const PUBLIC_PATHS = ['/login', '/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasToken = !!request.cookies.get('access_token')?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isRoot = pathname === '/';

  // No autenticado en ruta privada → /login
  if (!hasToken && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Autenticado en /login o raíz → /home
  if (hasToken && (isPublic || isRoot)) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - api routes (Next API — el backend está en otro origen)
     * - logos (estáticos)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api|logos).*)',
  ],
};
