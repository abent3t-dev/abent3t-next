'use client';

import { formatDateTime, formatInflation, formatPesos, formatRate } from '@/lib/fpa-format';
import { MONTH_LABELS, VERSION_ACTION_LABELS, type FpaParamChange, type FpaVersionEvent } from '@/types/fpa';

/**
 * FP&A (B2) — historial de una versión (fpa_version_events): quién la creó,
 * cambió los parámetros (con el antes y el después), dio el visto bueno, la
 * abrió, regresó, cerró o reabrió, cuándo y con qué derecho.
 */

const ACTING_AS_LABELS: Record<FpaVersionEvent['acting_as'], string | null> = {
  titular: 'como firmante de planeación',
  suplente: 'como suplente del firmante de planeación',
  rol: null,
  super_admin: 'como soporte (super administrador)',
};

const ACTION_DOT: Record<FpaVersionEvent['action'], string> = {
  creada: 'bg-gray-400',
  parametros: 'bg-amber-500',
  visto_bueno: 'bg-[#52AF32]',
  abierta: 'bg-[#222D59]',
  regresada: 'bg-amber-600',
  cerrada: 'bg-gray-600',
  reabierta: 'bg-indigo-500',
};

/** Un valor del historial, legible: 3.700 → 3.7%, 19.500000 → 19.50, 4000.00 → $4,000.00. */
function formatValue(change: FpaParamChange, value: string | null): string {
  if (value === null) return '—';
  if (change.campo === 'inflation_pct') return formatInflation(value) ?? value;
  if (change.campo === 'cutoff_month') {
    const n = Number(value);
    return n >= 1 && n <= 12 ? `real hasta ${MONTH_LABELS[n - 1]}` : value;
  }
  if (change.campo.startsWith('rate:')) return formatRate(value);
  // Con centavos: un cambio de $2,500.00 a $2,500.50 tiene que verse
  if (change.campo.startsWith('travel:')) return formatPesos(value, true);
  return value;
}

export default function VersionHistory({ events }: { events: FpaVersionEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sin movimientos registrados. Si la versión se cargó antes del historial (como la B-26 de ejemplo), aquí aparecen
        los siguientes.
      </p>
    );
  }
  return (
    <ol className="space-y-4">
      {events.map((e) => {
        const actingAs = ACTING_AS_LABELS[e.acting_as];
        return (
          <li key={e.id} className="relative pl-6">
            <span
              className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${ACTION_DOT[e.action] ?? 'bg-gray-400'}`}
              aria-hidden="true"
            />
            <p className="text-sm text-gray-900">
              <span className="font-semibold">{e.actor?.full_name ?? 'Alguien'}</span>{' '}
              {VERSION_ACTION_LABELS[e.action]?.toLowerCase() ?? e.action}
              {actingAs && <span className="text-gray-500"> ({actingAs})</span>}
            </p>
            <p className="text-xs text-gray-500">{formatDateTime(e.created_at)}</p>
            {e.detail?.copia_de && (
              <p className="mt-1 text-xs text-gray-600">Con los parámetros de la versión {e.detail.copia_de.code}.</p>
            )}
            {typeof e.detail?.presupuestos_creados === 'number' && e.detail.presupuestos_creados > 0 && (
              <p className="mt-1 text-xs text-gray-600">
                Se creó el presupuesto en borrador de {e.detail.presupuestos_creados}{' '}
                {e.detail.presupuestos_creados === 1 ? 'área' : 'áreas'}.
              </p>
            )}
            {e.detail?.cambios && e.detail.cambios.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                {e.detail.cambios.map((c) => (
                  <li key={c.campo}>
                    {c.etiqueta}: <span className="tabular-nums">{formatValue(c, c.antes)}</span> →{' '}
                    <span className="tabular-nums font-medium text-gray-800">{formatValue(c, c.despues)}</span>
                  </li>
                ))}
              </ul>
            )}
            {e.detail?.visto_bueno_retirado && (
              <p className="mt-1 text-xs text-amber-700">Con este cambio se quitó el visto bueno que tenía.</p>
            )}
            {e.comment && <p className="mt-1 text-sm italic text-gray-700">«{e.comment}»</p>}
          </li>
        );
      })}
    </ol>
  );
}
