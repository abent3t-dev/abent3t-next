'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { signInWithMicrosoft, signInWithEmail, loading, authConfig } =
    useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const oidcEnabled = authConfig?.oidc_enabled ?? false;
  const localEnabled = authConfig?.local_login_enabled ?? false;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await signInWithEmail(email, password);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
  };

  // Si solo email/password está habilitado (modo dev), mostrar el form directo.
  const onlyLocal = !oidcEnabled && localEnabled;
  const onlyMicrosoft = oidcEnabled && !localEnabled;
  const both = oidcEnabled && localEnabled;
  const showForm = showEmailForm || onlyLocal;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/logo-a3t.png"
            alt="Abent 3T"
            className="mx-auto h-16 w-auto object-contain"
          />
          <p className="text-gray-500 mt-4">
            Sistema de Gestión de Capacitación
          </p>
        </div>

        {localEnabled && !oidcEnabled && (
          <div className="mb-4 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
            ⚠️ Entorno de desarrollo: login con email/password habilitado.
          </div>
        )}

        {!showForm && (oidcEnabled || onlyMicrosoft || both) ? (
          <>
            <button
              onClick={signInWithMicrosoft}
              disabled={loading || !oidcEnabled}
              title={
                oidcEnabled
                  ? undefined
                  : 'OIDC con Microsoft no configurado en este entorno'
              }
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#2F2F2F] text-white rounded-md hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Iniciar sesión con Microsoft
            </button>

            {both && (
              <>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">o</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <button
                  onClick={() => setShowEmailForm(true)}
                  className="mt-6 w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Iniciar sesión con email
                </button>
              </>
            )}
          </>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
                placeholder="usuario@empresa.com"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Contraseña
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-[#52AF32] text-white rounded-md hover:bg-[#67B52E] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#52AF32]/50 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            {both && (
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setError('');
                }}
                className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ← Volver
              </button>
            )}
          </form>
        )}

        {!oidcEnabled && !localEnabled && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            Ningún método de autenticación está configurado en este entorno.
            Contacta al administrador.
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400">
          Acceso con cuenta institucional
          {authConfig?.allowed_email_domain
            ? ` (@${authConfig.allowed_email_domain})`
            : ''}
        </p>
      </div>
    </div>
  );
}
