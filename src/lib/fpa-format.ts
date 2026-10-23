import type { FpaExchangeRate, FpaVersion, Money } from '@/types/fpa';

/**
 * FP&A (A3) — formato de montos y apoyos de captura.
 *
 * El API calcula todos los montos y los manda como texto decimal con 2
 * decimales ("2659000.00"); null = "No disponible", nunca $0. Aquí solo se
 * da formato. Las únicas cuentas del front son las de captura (repartir un
 * total entre meses) y la suma de los totales que ya mandó el API.
 */

export const NO_DISPONIBLE = 'No disponible';

/** Nombres completos de los meses (índice 0 = enero), para lectores de pantalla. */
export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

const PESOS = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const PESOS_CENTS = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NUMBER = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const NUMBER_CENTS = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "0.00" (o cualquier cero) = mes sin dato: en la tabla se ve vacío. */
export function isZeroMoney(value: Money | undefined): boolean {
  return value !== null && value !== undefined && Number(value) === 0;
}

/** "$30,000" o, con centavos, "$30,000.00". */
export function formatPesos(value: string, cents = false): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return (cents ? PESOS_CENTS : PESOS).format(n);
}

/** El número solo, sin signo de moneda: "135,200" o "135,200.00". */
export function formatNumber(value: string, cents = false): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return (cents ? NUMBER_CENTS : NUMBER).format(n);
}

/** Un monto con su moneda, con centavos: "$30,000.00" en pesos o "USD 135,200.00". */
export function formatWithCurrency(value: Money, currency: string): string {
  if (value === null) return NO_DISPONIBLE;
  return currency === 'MXN' ? formatPesos(value, true) : `${currency} ${formatNumber(value, true)}`;
}

/** Tipo de cambio "20.000000" → "20.00" (hasta 4 decimales si los trae). */
export function formatRate(rate: string): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return rate;
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/** "USD 20.00 · EUR 22.00"; null si la versión no tiene otras monedas. */
export function formatExchangeRates(rates: FpaExchangeRate[]): string | null {
  const list = rates.filter((r) => r.currency !== 'MXN');
  if (list.length === 0) return null;
  return list.map((r) => `${r.currency} ${formatRate(r.rate_mxn)}`).join(' · ');
}

/** Inflación "4.000" → "4%"; null = FP&A no la ha fijado. */
export function formatInflation(pct: string | null): string | null {
  if (pct === null) return null;
  const n = Number(pct);
  if (!Number.isFinite(n)) return `${pct}%`;
  return `${n.toLocaleString('es-MX', { maximumFractionDigits: 3 })}%`;
}

/** Versión por omisión: la primera en captura; si no hay, la primera. */
export function defaultVersionId(versions: FpaVersion[]): string | null {
  return (versions.find((v) => v.status === 'captura') ?? versions[0])?.id ?? null;
}

// ── Centavos ────────────────────────────────────────────────────────────────

/** "2659000.00" → 265900000 (exacto para montos con hasta 2 decimales). */
export function moneyToCents(value: string): number {
  return Math.round(Number(value) * 100);
}

/** 8333337 → "83333.37"; -5 → "-0.05". */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const units = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}${units}.${rest}`;
}

/**
 * Suma de montos que ya calculó el API (p. ej. los totales de cada área), en
 * centavos para no arrastrar errores de punto flotante. Si alguno es "No
 * disponible", la suma también.
 */
export function sumMoney(values: Money[]): Money {
  let cents = 0;
  for (const value of values) {
    if (value === null) return null;
    cents += moneyToCents(value);
  }
  return centsToDecimal(cents);
}

/**
 * "Repartir un total" (apoyo de captura): `n` partes iguales redondeadas a
 * centavos y la última absorbe la diferencia, para que la suma sea el total
 * exacto. 1,000,000 entre 12 = 83,333.33 × 11 + 83,333.37.
 */
export function spreadCents(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const sign = totalCents < 0 ? -1 : 1;
  const part = sign * Math.round(Math.abs(totalCents) / n);
  const parts = Array.from({ length: n }, () => part);
  parts[n - 1] = totalCents - part * (n - 1);
  return parts;
}

// ── Captura de números ──────────────────────────────────────────────────────

export interface DecimalRules {
  /** Decimales que acepta la base (4 en precios y veces, 2 en montos). */
  maxDecimals: number;
  /** Dígitos enteros que acepta la base (numeric(15,4) → 11). */
  maxIntDigits: number;
  allowNegative?: boolean;
  integer?: boolean;
}

export type ParsedDecimal =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * Lee lo que se tecleó en una casilla numérica: quita comas y espacios
 * ("1,000,000.50" → "1000000.50") y valida contra las reglas de la base.
 * Vacío → value null (sin dato).
 */
export function parseDecimal(raw: string, rules: DecimalRules): ParsedDecimal {
  const text = raw.replace(/[\s,]/g, '');
  if (text === '') return { ok: true, value: null };
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (match[2] === '' && (match[3] ?? '') === '')) {
    return { ok: false, error: 'no es un número' };
  }
  const negative = match[1] === '-';
  const intPart = match[2].replace(/^0+(?=\d)/, '') || '0';
  const fracPart = (match[3] ?? '').replace(/0+$/, '');
  if (negative && !rules.allowNegative && /[1-9]/.test(intPart + fracPart)) {
    return { ok: false, error: 'no puede ser negativo' };
  }
  if (rules.integer && fracPart !== '') return { ok: false, error: 'debe ser un número entero' };
  if (fracPart.length > rules.maxDecimals) {
    return { ok: false, error: `acepta hasta ${rules.maxDecimals} decimales` };
  }
  if (intPart.length > rules.maxIntDigits) return { ok: false, error: 'es demasiado grande' };
  const isZero = !/[1-9]/.test(intPart + fracPart);
  const sign = negative && !isZero ? '-' : '';
  return { ok: true, value: `${sign}${intPart}${fracPart ? `.${fracPart}` : ''}` };
}

/** "7500.0000" → "7500"; "0.5000" → "0.5" (para mostrar lo guardado en una casilla). */
export function trimDecimal(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (!value.includes('.')) return value;
  return value.replace(/0+$/, '').replace(/\.$/, '');
}
