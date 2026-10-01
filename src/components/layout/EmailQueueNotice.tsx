'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { EmailQueueState } from '@/types/email';

/**
 * J1 (hilo con César, 2026-10-01) — Aviso en la app a super_admin y
 * lider_procura cuando el envío de correo está en pausa (interruptor) o llegó
 * al tope del día (se pausa solo y lo pendiente sale mañana). Se puede ocultar
 * en la sesión; vuelve si cambia el estado o al día siguiente. En la página de
 * Correo no sale: ahí el estado ya está a la vista.
 */

const REFRESH_MS = 60_000;
const DISMISS_KEY = 'correo-aviso-oculto';

const readDismissed = (): string | null => {
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

export function EmailQueueNotice() {
  const { user, hasRole } = useAuth();
  const pathname = usePathname();
  const enabled = !!user && hasRole('super_admin', 'lider_procura');
  const [dismissed, setDismissed] = useState<string | null>(readDismissed);

  const { data } = useQuery({
    queryKey: ['correo-estado'],
    queryFn: () => api.get<EmailQueueState>('/correo/estado'),
    enabled,
    refetchInterval: REFRESH_MS,
    retry: false,
  });

  if (!enabled || !data || data.state === 'activo') return null;
  if (pathname?.startsWith('/compras/correo')) return null;
  const noticeKey =
    data.state === 'pausado'
      ? `pausado:${data.paused_at ?? ''}`
      : `tope:${new Date().toDateString()}`;
  if (dismissed === noticeKey) return null;

  const dismiss = () => {
    setDismissed(noticeKey);
    try {
      sessionStorage.setItem(DISMISS_KEY, noticeKey);
    } catch {
      // sin almacenamiento: se oculta solo en esta vista
    }
  };

  const paused = data.state === 'pausado';
  return (
    <div
      role="status"
      className={`mb-4 rounded-lg border px-4 py-3 flex items-start gap-3 ${paused ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-orange-50 border-orange-200 text-orange-900'}`}
    >
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <p className="text-sm flex-1">
        {paused ? (
          <>
            El envío de correo está <strong>en pausa</strong>
            {data.paused_by?.full_name ? ` (${data.paused_by.full_name})` : ''}
            {data.paused_reason ? `: ${data.paused_reason}` : ''}. Los avisos
            se siguen registrando y salen al reanudar.
          </>
        ) : (
          <>
            Se alcanzó el <strong>tope diario de correo</strong> (
            {data.sent_today} de {data.daily_cap}). El envío se pausó solo;
            {data.pending > 0
              ? ` los ${data.pending} pendientes salen mañana.`
              : ' lo que llegue hoy sale mañana.'}
          </>
        )}{' '}
        <Link href="/compras/correo" className="font-medium underline">
          Ver bitácora
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label="Ocultar aviso"
        className="opacity-60 hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
