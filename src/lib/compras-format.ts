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

/**
 * Un monto con su código de moneda al frente: "USD $793,023,758".
 * Símbolo corto a propósito: en es-MX el formato largo ya antepone "USD" y
 * se duplicaba el código.
 */
export function formatCurrencyAmount(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return NO_DISPONIBLE;
  const known = currency && currency !== '##' && currency !== 'sin_moneda';
  let number: string;
  try {
    number = new Intl.NumberFormat(
      'es-MX',
      known
        ? { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }
        : { maximumFractionDigits: 0 },
    ).format(amount);
  } catch {
    number = amount.toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }
  return `${known ? currency : 'Sin moneda'} ${number}`;
}

/** Un renglón por moneda → ["MXN $1,234", "USD $56"]. */
export function formatAmountLines(list: CurrencyAmount[] | undefined | null): string[] {
  if (!list || list.length === 0) return [NO_DISPONIBLE];
  return list.map((a) => formatCurrencyAmount(a.total, a.currency));
}

/** Lista de montos por moneda → "MXN $1,234 · USD $56". Vacío → "No disponible". */
export function formatAmounts(list: CurrencyAmount[] | undefined | null): string {
  return formatAmountLines(list).join(' · ');
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
