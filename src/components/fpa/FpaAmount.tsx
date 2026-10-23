'use client';

import type { Money } from '@/types/fpa';
import { NO_DISPONIBLE, formatNumber, formatPesos, isZeroMoney } from '@/lib/fpa-format';

/**
 * FP&A (A3) — un monto que calculó el API.
 *
 * - `pesos`: con signo ("$30,000"); `original`: el número solo ("135,200"),
 *   porque la moneda de la línea va en su propia columna.
 * - Sin centavos por omisión; el tooltip siempre los trae.
 * - null = "No disponible" (ámbar), nunca $0. Con `compact` (celdas de mes)
 *   es un ícono con el motivo en el tooltip.
 * - Con `blankZero`, un mes en "0.00" (sin dato) se ve vacío.
 */
interface FpaAmountProps {
  value: Money | undefined;
  kind?: 'pesos' | 'original';
  cents?: boolean;
  blankZero?: boolean;
  compact?: boolean;
  /** Por qué no se pudo calcular (unavailable_reason de la línea). */
  reason?: string | null;
  /** Tooltip propio (p. ej. pesos y moneda original con centavos). */
  title?: string;
  /** Fondo oscuro (fila de total): el ámbar se aclara para que se lea. */
  onDark?: boolean;
}

export function noDisponibleTitle(reason?: string | null): string {
  return reason ? `${NO_DISPONIBLE}: ${reason}` : NO_DISPONIBLE;
}

export default function FpaAmount({
  value,
  kind = 'pesos',
  cents = false,
  blankZero = false,
  compact = false,
  reason,
  title,
  onDark = false,
}: FpaAmountProps) {
  if (value === undefined) return null;
  if (value === null) {
    const tip = noDisponibleTitle(reason);
    const tone = onDark ? 'text-amber-300' : 'text-amber-700';
    if (compact) {
      // relative: el texto sr-only (absolute) se queda dentro de la celda; sin
      // esto escapa del scroll de la tabla y ensancha toda la página
      return (
        <span title={tip} className={`relative inline-flex align-middle ${tone}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="sr-only">{NO_DISPONIBLE}</span>
        </span>
      );
    }
    return (
      <span title={tip} className={`text-xs font-medium whitespace-nowrap ${tone}`}>
        {NO_DISPONIBLE}
      </span>
    );
  }
  if (blankZero && isZeroMoney(value)) return null;
  const text = kind === 'pesos' ? formatPesos(value, cents) : formatNumber(value, cents);
  const tip = title ?? (kind === 'pesos' ? formatPesos(value, true) : formatNumber(value, true));
  return (
    <span title={tip} className="tabular-nums whitespace-nowrap">
      {text}
    </span>
  );
}
