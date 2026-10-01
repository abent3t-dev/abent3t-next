'use client';

import type { Contract } from '@/types/purchases';

/**
 * Vigencia de un contrato ABENT en tablas: "inicio – fin" y, debajo, la
 * línea de vencimiento (pedido de Ingrid 2026-09-22: rojo si ya venció,
 * ámbar si vence en menos de 30 días). I6 (2026-09-30): sin fecha de fin
 * (permanentes, "por servicio") dice "Sin fecha de fin" y no hay alerta.
 */

const EXPIRY_WARNING_DAYS = 30;

export const formatContractDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

export const formatContractMoney = (amount: number | null, currency: string | null) => {
  if (amount === null) return '—';
  try {
    return new Intl.NumberFormat(
      'es-MX',
      currency ? { style: 'currency', currency } : { minimumFractionDigits: 2 },
    ).format(amount);
  } catch {
    return `${amount.toLocaleString('es-MX')} ${currency ?? ''}`.trim();
  }
};

/** Días naturales de hoy (UTC) a la fecha de fin; negativo = ya venció. */
export const daysToEnd = (endDate: string): number => {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((new Date(endDate).getTime() - todayUtc) / 86_400_000);
};

function ExpiryLine({ contract }: { contract: Contract }) {
  if (!contract.end_date) return null;
  const days = daysToEnd(contract.end_date);
  if (contract.status === 'vencido' || days < 0) {
    const ago = Math.abs(days);
    return (
      <p className="mt-1 text-xs font-medium text-red-600">
        Venció el {formatContractDate(contract.end_date)}
        {' '}<span className="whitespace-nowrap">{ago > 0 ? `(hace ${ago} ${ago === 1 ? 'día' : 'días'})` : '(hoy)'}</span>
      </p>
    );
  }
  if (contract.status === 'vigente' && days >= 0 && days < EXPIRY_WARNING_DAYS) {
    return (
      <p className="mt-1 text-xs font-medium text-amber-700">
        Vence en {days} {days === 1 ? 'día' : 'días'}
      </p>
    );
  }
  return null;
}

export function ContractVigencia({ contract, compact = false }: { contract: Contract; compact?: boolean }) {
  return (
    <>
      <span className="whitespace-nowrap">
        {formatContractDate(contract.start_date)} –{' '}
        {contract.end_date ? (
          formatContractDate(contract.end_date)
        ) : (
          <span className="italic text-gray-500" title="Permanente o por servicio: no tiene alertas de vencimiento">
            Sin fecha de fin
          </span>
        )}
      </span>
      {!compact && <ExpiryLine contract={contract} />}
    </>
  );
}
