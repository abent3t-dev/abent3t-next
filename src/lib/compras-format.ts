import type { ClasCurrencyAmount, CurrencyAmount, MontoBase } from '@/types/purchases';

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
const isKnownCurrency = (currency: string | null): currency is string =>
  !!currency && currency !== '##' && currency !== 'sin_moneda';

/** El código de la moneda al frente de un renglón ("Sin moneda" si no hay). */
export function currencyLabel(currency: string | null): string {
  return isKnownCurrency(currency) ? currency : 'Sin moneda';
}

/**
 * H7 (2026-10-05): la moneda tiene OC pero ningún monto en la base:
 * "USD No disponible" (con la moneda, para no confundirla con otra).
 */
export function formatCurrencyNoDisponible(currency: string | null): string {
  return `${currencyLabel(currency)} ${NO_DISPONIBLE}`;
}

export function formatCurrencyAmount(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return NO_DISPONIBLE;
  const known = isKnownCurrency(currency);
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
  return `${currencyLabel(currency)} ${number}`;
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

/**
 * H7 (2026-10-05): con la base sin IVA, una moneda en la que ninguna OC trae
 * subtotal no tiene monto (la API manda total 0 y todas en `sin_subtotal`).
 * La misma regla de formatSubtotalLine: faltan ≥ count.
 */
export function sinMontoEnBase(amount: Pick<CurrencyAmount, 'count' | 'sin_subtotal'>, base: MontoBase): boolean {
  return base === 'sin_iva' && amount.count > 0 && (amount.sin_subtotal ?? 0) >= amount.count;
}

/** Monto de OC de una moneda en su base: "MXN $1,234" o, sin base, "MXN No disponible" (H7). */
export function formatOrderAmount(amount: CurrencyAmount, base: MontoBase): string {
  return sinMontoEnBase(amount, base)
    ? formatCurrencyNoDisponible(amount.currency)
    : formatCurrencyAmount(amount.total, amount.currency);
}

/** K6: un renglón por moneda (`text`) con su subtotal sin IVA en letra chica (`sub`). */
export interface AmountLine {
  text: string;
  sub?: string;
}

export function formatOrderAmountLines(list: CurrencyAmount[] | undefined | null, base: MontoBase): AmountLine[] {
  if (!list || list.length === 0) return [{ text: NO_DISPONIBLE }];
  return list.map((a) => ({ text: formatOrderAmount(a, base), sub: formatSubtotalLine(a, base) }));
}

/** H7: un renglón de CAPEX/OPEX; `disponible` false se pinta gris en itálica. */
export interface ClasAmountLine {
  text: string;
  disponible: boolean;
}

/**
 * H7 (2026-10-05): CAPEX/OPEX por moneda (sin IVA). La moneda en la que
 * ninguna OC trae subtotal (`monto_disponible` false) dice "USD No
 * disponible", nunca "USD $0".
 */
export function formatClasAmountLines(list: ClasCurrencyAmount[] | undefined | null): ClasAmountLine[] {
  if (!list || list.length === 0) return [{ text: NO_DISPONIBLE, disponible: false }];
  return list.map((a) =>
    a.monto_disponible === false
      ? { text: formatCurrencyNoDisponible(a.currency), disponible: false }
      : { text: formatCurrencyAmount(a.total, a.currency), disponible: true },
  );
}

/** H7: "USD 1 · MXN 2" con las OC sin subtotal de cada moneda (para el aviso ámbar). */
export function sinSubtotalPorMoneda(list: ClasCurrencyAmount[] | undefined | null): string {
  return (list ?? [])
    .filter((a) => a.sin_subtotal > 0)
    .map((a) => `${currencyLabel(a.currency)} ${a.sin_subtotal.toLocaleString('es-MX')}`)
    .join(' · ');
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

/**
 * H1 (2026-10-05): número de la OC de SAP que llega en la URL (`doc_num`):
 * entero de 1 a 2147483647, lo mismo que valida la API; otro valor → null
 * (sin filtro, en lugar de un 400).
 */
export function parseDocNumParam(value: string | null | undefined): number | null {
  const text = (value ?? '').trim();
  if (!/^\d{1,10}$/.test(text)) return null;
  const n = Number(text);
  return n >= 1 && n <= 2_147_483_647 ? n : null;
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
