'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Motivo de un inicio de sesión con Microsoft que no procedió (2026-10-16).
 *
 * El callback de la API nunca responde JSON: regresa a `/login?error=<código>`.
 * Antes la pantalla no lo mostraba y solo se veía un parpadeo (César no podía
 * ver por qué Rodrigo no entraba: no estaba dado de alta). Los códigos salen de
 * `auth.controller.ts` (`oidcCallback`, `loginOIDC`) y de `oidcFailureCode`.
 *
 * Va en su propio componente porque `useSearchParams` pide un `<Suspense>`:
 * así solo este aviso espera a la URL y el resto del login se pinta igual.
 */

const MESSAGES: Record<string, string> = {
  oidc_no_profile:
    'Tu cuenta de Microsoft es válida, pero todavía no está registrada en la plataforma. Pide al administrador que te dé de alta.',
  oidc_inactive:
    'Tu cuenta está desactivada en la plataforma. Pide al administrador que la reactive.',
  oidc_domain:
    'Esa cuenta no es institucional. Entra con tu cuenta de la empresa.',
  oidc_no_email:
    'Microsoft no envió el correo de tu cuenta, así que no se pudo identificarte. Avisa a TI.',
  oidc_state:
    'El inicio de sesión expiró o se abrió desde otra dirección. Vuelve a intentarlo desde la dirección habitual de la plataforma.',
  oidc_denied:
    'Microsoft no autorizó el inicio de sesión. Si no lo cancelaste tú, avisa a TI.',
  oidc_init:
    'No se pudo conectar con Microsoft. Intenta de nuevo en unos minutos.',
  oidc_no_config:
    'El inicio de sesión con Microsoft no está configurado en este entorno.',
};

const FALLBACK =
  'No se pudo completar el inicio de sesión con Microsoft. Intenta de nuevo; si sigue fallando, avisa a TI.';

interface OidcErrorBannerProps {
  /** Dominio institucional (de `/auth/config`) para el aviso de dominio. */
  allowedDomain?: string | null;
}

export default function OidcErrorBanner({ allowedDomain }: OidcErrorBannerProps) {
  const code = useSearchParams().get('error');
  // Solo los códigos del flujo de Microsoft; otro `error` en la URL no es nuestro
  if (!code || !code.startsWith('oidc_')) return null;

  const message =
    code === 'oidc_domain' && allowedDomain
      ? `Esa cuenta no es institucional. Entra con tu cuenta @${allowedDomain}.`
      : (MESSAGES[code] ?? FALLBACK);

  return (
    <div
      role="alert"
      className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md text-left"
    >
      {message}
    </div>
  );
}
