import type { CurrencyAmount, MontoBase } from '@/types/purchases';

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

/**
 * K6 (2026-10-05): dato secundario de un monto de OC por moneda. Con la base
 * con IVA, el subtotal sin IVA ("Sin IVA: MXN $1,234"); con la base sin IVA
 * el principal ya es el subtotal y solo se dicen las OC que no lo tienen.
 * Esas OC no suman ni se estiman; si ninguna lo tiene, "No disponible".
 * undefined = el monto no trae subtotal (por recibir, ahorro, solicitudes).
 */
export function formatSubtotalLine(amount: CurrencyAmount, base: MontoBase): string | undefined {
  if (amount.subtotal === undefined) return undefined;
  const faltan = amount.sin_subtotal ?? 0;
  const sinSubtotal = faltan > 0 ? `${faltan.toLocaleString('es-MX')} OC sin subtotal (no se estiman)` : null;
  if (base === 'sin_iva') return sinSubtotal ?? undefined;
  const subtotal = faltan >= amount.count ? NO_DISPONIBLE : formatCurrencyAmount(amount.subtotal, amount.currency);
  return [`Sin IVA: ${subtotal}`, sinSubtotal].filter(Boolean).join(' · ');
}

/** K6: un renglón por moneda (`text`) con su subtotal sin IVA en letra chica (`sub`). */
export interface AmountLine {
  text: string;
  sub?: string;
}

export function formatOrderAmountLines(list: CurrencyAmount[] | undefined | null, base: MontoBase): AmountLine[] {
  if (!list || list.length === 0) return [{ text: NO_DISPONIBLE }];
  return list.map((a) => ({ text: formatCurrencyAmount(a.total, a.currency), sub: formatSubtotalLine(a, base) }));
}

/** K6: cómo leer el dato secundario de los montos de OC (para los tooltips). */
export function subtotalNota(base: MontoBase): string {
  return base === 'sin_iva'
    ? 'Debajo, las OC sin subtotal: no suman ni se estiman.'
    : 'Debajo de cada moneda, el subtotal sin IVA (suma de las líneas) de las OC que lo tienen; las que no lo tienen no suman ni se estiman.';
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
