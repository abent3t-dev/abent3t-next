'use client';

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { toQuery } from '@/lib/compras-format';
import type { ColumnFiltersState } from '@/hooks/useColumnFilters';
import {
  ColumnConfig,
  ColumnConfigs,
  ColumnFacet,
  ColumnFilterValue,
  FacetKey,
  MAX_FILTER_JSON,
  RangeFacet,
  TextFacet,
  describeFilter,
  facetLabel,
  formatBound,
  isTextFilter,
  sortLabels,
} from '@/lib/column-filters';

/**
 * E1 (Ingrid y César, 2026-09-25) — Filtro "tipo Excel" en el encabezado de
 * las tablas de Compras. Cada columna filtrable lleva un embudo que abre un
 * panel con: ordenar, buscar dentro de los valores, casillas con conteo
 * ("(Seleccionar todo)" y "(Vacías)") y Aceptar/Limpiar; en fechas y números,
 * rango desde/hasta. Los valores salen de `<tabla>/facets` con los DEMÁS
 * filtros aplicados (como Excel). El panel va en un portal: las tablas viven
 * dentro de contenedores con overflow que lo recortarían.
 */

type QueryValue = string | number | string[] | undefined | null;

interface ColumnFilterContextValue {
  cf: ColumnFiltersState;
  columns: ColumnConfigs;
  /** Endpoint de facetas de la tabla, p. ej. `/compras/expeditacion/facets`. */
  facetsPath: string;
  /** Filtros propios de la tabla (buscador, estatus, año…), sin paginación. */
  baseQuery: Record<string, QueryValue>;
}

const ColumnFilterContext = createContext<ColumnFilterContextValue | null>(null);

export function ColumnFilterProvider({
  value,
  children,
}: {
  value: ColumnFilterContextValue;
  children: ReactNode;
}) {
  return <ColumnFilterContext.Provider value={value}>{children}</ColumnFilterContext.Provider>;
}

function useColumnFilterContext(): ColumnFilterContextValue {
  const ctx = useContext(ColumnFilterContext);
  if (!ctx) throw new Error('FilterTh debe ir dentro de <ColumnFilterProvider>');
  return ctx;
}

/**
 * Faceta de una columna con los filtros vigentes (chips de estatus, etc.).
 * El orden no cambia los conteos: `sort`/`order` no viajan (menos consultas)
 * y los conteos anteriores se quedan mientras llegan los nuevos.
 */
export function useColumnFacet(
  facetsPath: string,
  query: Record<string, QueryValue>,
  column: string,
  enabled = true,
) {
  const qs = toQuery({ ...query, sort: undefined, order: undefined, column });
  return useQuery({
    queryKey: ['column-facet', facetsPath, qs],
    queryFn: () => api.get<ColumnFacet>(`${facetsPath}?${qs}`),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/** Conteos por valor de una faceta de texto (vacío mientras carga). */
export function facetCounts(facet: ColumnFacet | undefined): Map<FacetKey, number> {
  const map = new Map<FacetKey, number>();
  if (facet?.type === 'text') for (const v of facet.values) map.set(v.value, v.count);
  return map;
}

// ── Encabezado ────────────────────────────────────────────────────────────

const FunnelIcon = ({ active }: { active: boolean }) => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z" />
  </svg>
);

const PANEL_WIDTH = 296;

interface FilterThProps {
  column: string;
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  title?: string;
}

/** `<th>` con el embudo del filtro de su columna. */
export function FilterTh({ column, children, align = 'left', className = 'px-4 py-3', title }: FilterThProps) {
  const ctx = useColumnFilterContext();
  const config = ctx.columns[column];
  const [anchor, setAnchor] = useState<{ top: number; left: number; bottom: number } | null>(null);
  const active = column in ctx.cf.filters;
  const sorted = ctx.cf.sort?.column === column ? ctx.cf.sort.order : null;
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (anchor) {
      setAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - PANEL_WIDTH), window.innerWidth - PANEL_WIDTH - 8);
    setAnchor({ top: rect.bottom + 6, left, bottom: rect.bottom });
  };

  return (
    <th className={`${className} ${alignClass} text-xs font-medium text-white uppercase`} title={title}>
      <div className={`flex items-center gap-1 ${justify}`}>
        <span
          className={`whitespace-nowrap ${active ? 'underline decoration-[#9BE07F] decoration-2 underline-offset-4' : ''}`}
          title={active ? `Filtro activo: ${describeFilter(ctx.cf.filters[column], config)}` : undefined}
        >
          {children}
        </span>
        {sorted && (
          <span className="text-[#9BE07F]" aria-label={sorted === 'asc' ? 'orden ascendente' : 'orden descendente'}>
            {sorted === 'asc' ? '↑' : '↓'}
          </span>
        )}
        {config && (
          <button
            type="button"
            onClick={toggle}
            data-cf-trigger={`${ctx.cf.tableId}:${column}`}
            aria-label={`Filtrar y ordenar ${config.label}`}
            title="Filtrar y ordenar"
            className={`p-0.5 rounded transition-colors hover:bg-white/15 ${
              active ? 'text-[#9BE07F]' : 'text-white/60 hover:text-white'
            }`}
          >
            <FunnelIcon active={active} />
          </button>
        )}
      </div>
      {anchor && config && (
        <FilterPanel column={column} config={config} position={anchor} onClose={() => setAnchor(null)} />
      )}
    </th>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────

interface Selection {
  /** all-except: todo salvo `set`; only: solo lo de `set`. */
  mode: 'all-except' | 'only';
  set: Set<FacetKey>;
}

const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function selectionFrom(filter: ColumnFilterValue | undefined): Selection {
  if (filter && isTextFilter(filter)) {
    return 'in' in filter
      ? { mode: 'only', set: new Set(filter.in) }
      : { mode: 'all-except', set: new Set(filter.nin) };
  }
  return { mode: 'all-except', set: new Set() };
}

const isChecked = (sel: Selection, value: FacetKey) =>
  sel.mode === 'all-except' ? !sel.set.has(value) : sel.set.has(value);

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function FilterPanel({
  column,
  config,
  position,
  onClose,
}: {
  column: string;
  config: ColumnConfig;
  position: { top: number; left: number; bottom: number };
  onClose: () => void;
}) {
  const ctx = useColumnFilterContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const current = ctx.cf.filters[column];

  // Cierre: clic afuera, Esc, scroll de la página o cambio de tamaño.
  useEffect(() => {
    const inside = (target: EventTarget | null) =>
      target instanceof Node && panelRef.current?.contains(target);
    // El embudo de esta columna se cierra con su propio clic (toggle)
    const trigger = `[data-cf-trigger="${ctx.cf.tableId}:${column}"]`;
    const onDown = (e: MouseEvent) => {
      if (inside(e.target)) return;
      if (e.target instanceof Element && e.target.closest(trigger)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = (e: Event) => {
      if (!inside(e.target)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose, ctx.cf.tableId, column]);

  const baseQs = toQuery({ ...ctx.baseQuery, ...ctx.cf.params, sort: undefined, order: undefined, column });
  const facetQ = useQuery({
    queryKey: ['column-facet', ctx.facetsPath, baseQs],
    queryFn: () => api.get<ColumnFacet>(`${ctx.facetsPath}?${baseQs}`),
    staleTime: 30_000,
  });

  const labels = sortLabels(config.type);
  const sortBy = (order: 'asc' | 'desc') => {
    const same = ctx.cf.sort?.column === column && ctx.cf.sort.order === order;
    ctx.cf.setSort(same ? null : { column, order });
    onClose();
  };
  const clear = () => {
    ctx.cf.setFilter(column, null);
    onClose();
  };
  const apply = (value: ColumnFilterValue | null) => {
    if (value && JSON.stringify({ ...ctx.cf.filters, [column]: value }).length > MAX_FILTER_JSON) {
      notify.error('Demasiados valores seleccionados. Usa la búsqueda del filtro o invierte la selección.');
      return;
    }
    ctx.cf.setFilter(column, value);
    onClose();
  };

  const maxHeight = Math.max(260, window.innerHeight - position.top - 12);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Filtro de ${config.label}`}
      style={{ position: 'fixed', top: position.top, left: position.left, width: PANEL_WIDTH, maxHeight }}
      className="z-[60] flex flex-col bg-white text-gray-900 normal-case font-normal text-sm text-left rounded-lg shadow-xl border border-gray-200 overflow-hidden"
    >
      <div className="px-3 pt-3 pb-2 border-b border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#424846]">{config.label}</p>
        <div className="mt-2 flex flex-col gap-1">
          {(['asc', 'desc'] as const).map((order) => {
            const on = ctx.cf.sort?.column === column && ctx.cf.sort.order === order;
            return (
              <button
                key={order}
                type="button"
                onClick={() => sortBy(order)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
                  on ? 'bg-[#52AF32]/10 text-[#2f7d1c] font-medium' : 'hover:bg-gray-100'
                }`}
              >
                <span className="w-4 text-center">{order === 'asc' ? '↑' : '↓'}</span>
                {labels[order]}
                {on && <span className="ml-auto text-xs">(quitar)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {facetQ.isError ? (
        <p className="p-4 text-sm text-red-600">No se pudieron cargar los valores de la columna.</p>
      ) : !facetQ.data ? (
        <div className="p-6 flex justify-center">
          <div className="w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : facetQ.data.type === 'text' ? (
        <TextFilterBody
          key={JSON.stringify(current ?? null)}
          config={config}
          facet={facetQ.data}
          baseQs={baseQs}
          current={current}
          onApply={apply}
          onClear={clear}
        />
      ) : (
        <RangeFilterBody
          config={config}
          facet={facetQ.data}
          current={current && !isTextFilter(current) ? current : undefined}
          onApply={apply}
          onClear={clear}
        />
      )}
    </div>,
    document.body,
  );
}

function TextFilterBody({
  config,
  facet,
  baseQs,
  current,
  onApply,
  onClear,
}: {
  config: ColumnConfig;
  facet: TextFacet;
  baseQs: string;
  current: ColumnFilterValue | undefined;
  onApply: (value: ColumnFilterValue | null) => void;
  onClear: () => void;
}) {
  const ctx = useColumnFilterContext();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim(), 250);
  const [baseSel, setBaseSel] = useState<Selection>(() => selectionFrom(current));
  // Con búsqueda, como en Excel: quedan marcados SOLO los resultados, salvo
  // que el usuario los cambie (edición guardada por texto de búsqueda).
  const [searchEdit, setSearchEdit] = useState<{ key: string; sel: Selection } | null>(null);

  // Más de 200 valores: la búsqueda va al servidor; si no, se filtra aquí.
  const serverSearch = facet.truncated && debounced !== '' ? debounced : '';
  const searchQs = `${baseQs}&facet_search=${encodeURIComponent(serverSearch)}`;
  const searchQ = useQuery({
    queryKey: ['column-facet', ctx.facetsPath, searchQs],
    queryFn: () => api.get<TextFacet>(`${ctx.facetsPath}?${searchQs}`),
    enabled: serverSearch !== '',
    staleTime: 30_000,
  });

  const term = fold(search.trim());
  const values: TextFacet['values'] =
    serverSearch !== ''
      ? (searchQ.data?.values ?? [])
      : term
        ? facet.values.filter((v) => fold(facetLabel(v.value, config)).includes(term))
        : facet.values;
  const searching = term !== '';
  const searchKey = search.trim();
  const selection: Selection = !searching
    ? baseSel
    : searchEdit?.key === searchKey
      ? searchEdit.sel
      : { mode: 'only', set: new Set(values.map((v) => v.value)) };

  const update = (next: Selection) => {
    if (searching) setSearchEdit({ key: searchKey, sel: next });
    else setBaseSel(next);
  };
  const toggle = (value: FacetKey) => {
    const set = new Set(selection.set);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    update({ mode: selection.mode, set });
  };
  const allChecked = values.length > 0 && values.every((v) => isChecked(selection, v.value));
  const someChecked = values.some((v) => isChecked(selection, v.value));
  const toggleAll = () => {
    if (!searching) {
      // Como Excel: marca o desmarca TODO, incluidos los valores que no
      // caben en la lista (más de 200)
      update(allChecked ? { mode: 'only', set: new Set() } : { mode: 'all-except', set: new Set() });
      return;
    }
    const set = new Set(selection.set);
    for (const v of values) {
      const wantChecked = !allChecked;
      const inSet = selection.mode === 'all-except' ? !wantChecked : wantChecked;
      if (inSet) set.add(v.value);
      else set.delete(v.value);
    }
    update({ mode: selection.mode, set });
  };

  const checkedCount = values.filter((v) => isChecked(selection, v.value)).length;
  const accept = () => {
    const sel = selection;
    if (sel.mode === 'all-except') {
      if (sel.set.size === 0) return onApply(null);
      // Lista completa: se manda la forma más corta (in / nin)
      if (!facet.truncated && !searching) {
        const kept = facet.values.filter((v) => !sel.set.has(v.value)).map((v) => v.value);
        return onApply(kept.length < sel.set.size ? { in: kept } : { nin: [...sel.set] });
      }
      return onApply({ nin: [...sel.set] });
    }
    if (!facet.truncated && !searching && facet.values.every((v) => sel.set.has(v.value))) {
      return onApply(null);
    }
    return onApply({ in: [...sel.set] });
  };

  return (
    <>
      <div className="px-3 pt-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar valores…"
          autoFocus
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] placeholder:text-gray-400"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        {serverSearch !== '' && searchQ.isFetching ? (
          <p className="py-3 text-center text-xs text-gray-500">Buscando…</p>
        ) : values.length === 0 ? (
          <p className="py-3 text-center text-xs text-gray-500">Sin valores que coincidan</p>
        ) : (
          <>
            <label className="flex items-center gap-2 py-1 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked && !allChecked;
                }}
                onChange={toggleAll}
                className="accent-[#52AF32]"
              />
              {searching ? '(Seleccionar todos los resultados)' : '(Seleccionar todo)'}
            </label>
            {values.map((v) => (
              <label key={v.value ?? '__vacias__'} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={isChecked(selection, v.value)}
                  onChange={() => toggle(v.value)}
                  className="accent-[#52AF32]"
                />
                <span className={`flex-1 truncate ${v.value === null ? 'italic text-gray-500' : ''}`} title={facetLabel(v.value, config)}>
                  {facetLabel(v.value, config)}
                </span>
                <span className="text-xs text-gray-400 tabular-nums">{v.count.toLocaleString('es-MX')}</span>
              </label>
            ))}
          </>
        )}
        {facet.truncated && !searching && (
          <p className="mt-1 text-xs text-gray-500">
            Se muestran los {facet.values.length} valores más frecuentes; escribe para buscar el resto.
          </p>
        )}
      </div>
      <PanelFooter onClear={onClear} onAccept={accept} canAccept={checkedCount > 0} hasFilter={current !== undefined} />
    </>
  );
}

function RangeFilterBody({
  config,
  facet,
  current,
  onApply,
  onClear,
}: {
  config: ColumnConfig;
  facet: RangeFacet;
  current: { min?: number | string | null; max?: number | string | null; empty?: boolean } | undefined;
  onApply: (value: ColumnFilterValue | null) => void;
  onClear: () => void;
}) {
  const [min, setMin] = useState(current?.min != null ? String(current.min) : '');
  const [max, setMax] = useState(current?.max != null ? String(current.max) : '');
  const [empty, setEmpty] = useState(current?.empty === true);
  const isDate = config.type === 'date';

  const accept = () => {
    if (empty) return onApply({ empty: true });
    const parse = (text: string) => (text === '' ? null : isDate ? text : Number(text));
    const lo = parse(min);
    const hi = parse(max);
    if (typeof lo === 'number' && Number.isNaN(lo)) return notify.error('El "desde" no es un número');
    if (typeof hi === 'number' && Number.isNaN(hi)) return notify.error('El "hasta" no es un número');
    if (lo === null && hi === null) return onApply(null);
    if (lo !== null && hi !== null && lo > hi) return notify.error('El "desde" es mayor que el "hasta"');
    return onApply({ min: lo, max: hi });
  };

  const inputClass =
    'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] disabled:bg-gray-100 disabled:text-gray-400';
  return (
    <>
      <div className="px-3 py-3 space-y-2">
        <label className="block text-xs text-gray-600">
          Desde
          <input
            type={isDate ? 'date' : 'number'}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            disabled={empty}
            placeholder={facet.min !== null ? formatBound(facet.min, config.type) : undefined}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-xs text-gray-600">
          Hasta
          <input
            type={isDate ? 'date' : 'number'}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            disabled={empty}
            placeholder={facet.max !== null ? formatBound(facet.max, config.type) : undefined}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <p className="text-xs text-gray-500">
          {facet.min !== null && facet.max !== null
            ? `Valores de ${formatBound(facet.min, config.type)} a ${formatBound(facet.max, config.type)} (${facet.count.toLocaleString('es-MX')} con dato)`
            : 'Sin valores con dato'}
        </p>
        {facet.empty > 0 && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={empty} onChange={(e) => setEmpty(e.target.checked)} className="accent-[#52AF32]" />
            Solo sin dato ({facet.empty.toLocaleString('es-MX')})
          </label>
        )}
      </div>
      <PanelFooter onClear={onClear} onAccept={accept} canAccept hasFilter={current !== undefined} />
    </>
  );
}

function PanelFooter({
  onClear,
  onAccept,
  canAccept,
  hasFilter,
}: {
  onClear: () => void;
  onAccept: () => void;
  canAccept: boolean;
  hasFilter: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50">
      <button
        type="button"
        onClick={onClear}
        disabled={!hasFilter}
        className="px-3 py-1.5 text-sm rounded-md text-[#424846] hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Limpiar
      </button>
      <button
        type="button"
        onClick={onAccept}
        disabled={!canAccept}
        className="px-3 py-1.5 text-sm font-medium rounded-md bg-[#52AF32] text-white hover:bg-[#469a2a] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Aceptar
      </button>
    </div>
  );
}

// ── Chips de filtros activos ──────────────────────────────────────────────

/** "Proveedor: Acme, Beta ×" por cada filtro de columna + "Limpiar filtros". */
export function ActiveColumnFilters({ cf, columns }: { cf: ColumnFiltersState; columns: ColumnConfigs }) {
  const entries = Object.entries(cf.filters);
  if (entries.length === 0 && !cf.sort) return null;
  const chip =
    'inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs rounded-full bg-[#52AF32]/10 text-[#2f7d1c] border border-[#52AF32]/30';
  const remove = 'ml-0.5 w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-[#52AF32]/20';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500">Filtros de columna:</span>
      {entries.map(([column, filter]) => (
        <span key={column} className={chip}>
          <span className="font-medium">{columns[column]?.label ?? column}:</span>
          <span className="max-w-64 truncate">{describeFilter(filter, columns[column])}</span>
          <button type="button" onClick={() => cf.setFilter(column, null)} className={remove} aria-label={`Quitar filtro de ${columns[column]?.label ?? column}`}>
            ×
          </button>
        </span>
      ))}
      {cf.sort && (
        <span className={chip}>
          <span className="font-medium">Orden:</span>
          {columns[cf.sort.column]?.label ?? cf.sort.column} {cf.sort.order === 'asc' ? '↑' : '↓'}
          <button type="button" onClick={() => cf.setSort(null)} className={remove} aria-label="Quitar orden">
            ×
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={cf.clear}
        className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-gray-300 text-[#424846] bg-white hover:bg-gray-100"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
