/**
 * E1 (Ingrid y César, 2026-09-25) — Filtro "tipo Excel" por columna.
 *
 * Mismo contrato que `common/column-filters` del backend: `filters` es un
 * JSON por columna y `sort`/`order` el orden. Aquí viven los tipos, la
 * serialización para la API y la URL, y el resumen legible de cada filtro
 * (chips "Proveedor: Acme, Beta").
 */

export type ColumnType = 'text' | 'number' | 'date';

/** Valor de una faceta de texto; null = "(Vacías)". */
export type FacetKey = string | null;

export type TextFilter = { in: FacetKey[] } | { nin: FacetKey[] };
export interface RangeFilter {
  min?: number | string | null;
  max?: number | string | null;
  /** Solo filas sin dato. */
  empty?: boolean;
}
export type ColumnFilterValue = TextFilter | RangeFilter;
export type ColumnFilters = Record<string, ColumnFilterValue>;

export interface ColumnSort {
  column: string;
  order: 'asc' | 'desc';
}

export interface ColumnConfig {
  label: string;
  type: ColumnType;
  /** Texto a mostrar de un valor (p. ej. estatus en español). */
  format?: (value: string) => string;
  /** Etiqueta de la faceta vacía; default "(Vacías)". */
  emptyLabel?: string;
}
export type ColumnConfigs = Record<string, ColumnConfig>;

export interface TextFacet {
  column: string;
  type: 'text';
  values: Array<{ value: FacetKey; count: number }>;
  truncated: boolean;
  total: number;
}
export interface RangeFacet {
  column: string;
  type: 'number' | 'date';
  min: number | string | null;
  max: number | string | null;
  count: number;
  empty: number;
  total: number;
}
export type ColumnFacet = TextFacet | RangeFacet;

/** Límite práctico del query string (nginx corta líneas de ~8 KB). */
export const MAX_FILTER_JSON = 6000;

export const isTextFilter = (f: ColumnFilterValue): f is TextFilter =>
  'in' in f || 'nin' in f;

/** Parámetros de API de los filtros por columna (vacíos se omiten). */
export function columnQueryParams(
  filters: ColumnFilters,
  sort: ColumnSort | null,
): Record<string, string | undefined> {
  return {
    filters: Object.keys(filters).length ? JSON.stringify(filters) : undefined,
    sort: sort?.column,
    order: sort?.order,
  };
}

/** Lee `filters` de la URL; algo roto o viejo se ignora sin romper la vista. */
export function parseFiltersParam(raw: string | null): ColumnFilters {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as ColumnFilters;
  } catch {
    return {};
  }
}

export function parseSortParam(raw: string | null): ColumnSort | null {
  if (!raw) return null;
  const [column, order] = raw.split(':');
  if (!column) return null;
  return { column, order: order === 'desc' ? 'desc' : 'asc' };
}

export const formatSortParam = (sort: ColumnSort | null) =>
  sort ? `${sort.column}:${sort.order}` : null;

const EMPTY_LABEL = '(Vacías)';

export function facetLabel(value: FacetKey, config?: ColumnConfig): string {
  if (value === null) return config?.emptyLabel ?? EMPTY_LABEL;
  return config?.format ? config.format(value) : value;
}

export function formatBound(value: number | string, type: ColumnType): string {
  if (type === 'date' && typeof value === 'string') {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  return typeof value === 'number' ? value.toLocaleString('es-MX') : value;
}

/** Resumen corto de un filtro para su chip: "Acme, Beta", "-400 a 0"… */
export function describeFilter(filter: ColumnFilterValue, config?: ColumnConfig): string {
  if (isTextFilter(filter)) {
    const include = 'in' in filter;
    const values = include ? filter.in : filter.nin;
    const labels = values.map((v) => facetLabel(v, config));
    const list =
      labels.length <= 2 ? labels.join(', ') : `${labels.slice(0, 2).join(', ')} y ${labels.length - 2} más`;
    return include ? list : `todos menos ${list}`;
  }
  const type = config?.type ?? 'number';
  if (filter.empty) return 'sin dato';
  const hasMin = filter.min !== undefined && filter.min !== null && filter.min !== '';
  const hasMax = filter.max !== undefined && filter.max !== null && filter.max !== '';
  if (hasMin && hasMax) return `${formatBound(filter.min!, type)} a ${formatBound(filter.max!, type)}`;
  if (hasMin) return `desde ${formatBound(filter.min!, type)}`;
  if (hasMax) return `hasta ${formatBound(filter.max!, type)}`;
  return '';
}

/** Etiquetas de orden según el tipo de columna (como Excel). */
export function sortLabels(type: ColumnType): { asc: string; desc: string } {
  if (type === 'number') return { asc: 'Ordenar de menor a mayor', desc: 'Ordenar de mayor a menor' };
  if (type === 'date') return { asc: 'Ordenar del más antiguo al más reciente', desc: 'Ordenar del más reciente al más antiguo' };
  return { asc: 'Ordenar de A a Z', desc: 'Ordenar de Z a A' };
}
