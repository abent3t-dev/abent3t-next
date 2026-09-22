import type { CurrencyAmount } from '@/types/purchases';

/**
 * Sprint 2026-09-22 — formato compartido de montos POR MONEDA (regla del
 * sprint: nunca sumar MXN con USD en una sola cifra) y "No disponible".
 */

export const NO_DISPONIBLE = 'No disponible';

export function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return NO_DISPONIBLE;
  try {
    return new Intl.NumberFormat(
      'es-MX',
      currency && currency !== '##' && currency !== 'sin_moneda'
        ? { style: 'currency', currency, maximumFractionDigits: 0 }
        : { maximumFractionDigits: 0 },
    ).format(amount);
  } catch {
    return `${amount.toLocaleString('es-MX')} ${currency ?? ''}`.trim();
  }
}

/** Lista de montos por moneda → "MXN $1,234 · USD $56". Vacío → "No disponible". */
export function formatAmounts(list: CurrencyAmount[] | undefined | null): string {
  if (!list || list.length === 0) return NO_DISPONIBLE;
  return list
    .map((a) => {
      const label = a.currency && a.currency !== 'sin_moneda' ? a.currency : 'Sin moneda';
      return `${label} ${formatMoney(a.total, a.currency)}`;
    })
    .join(' · ');
}

export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return NO_DISPONIBLE;
  return `${days} ${days === 1 ? 'día' : 'días'}`;
}

/** Serializa filtros a query string omitiendo vacíos; listas → coma. */
export function toQuery(params: Record<string, string | number | string[] | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) qs.set(key, value.join(','));
      continue;
    }
    qs.set(key, String(value));
  }
  return qs.toString();
}
