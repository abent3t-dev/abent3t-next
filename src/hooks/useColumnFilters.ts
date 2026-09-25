'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ColumnFilters,
  ColumnFilterValue,
  ColumnSort,
  columnQueryParams,
  formatSortParam,
  parseFiltersParam,
  parseSortParam,
} from '@/lib/column-filters';

/**
 * E1 (2026-09-25) — Estado del filtro "tipo Excel" de una tabla. Vive en la
 * URL (`<id>_f` = filtros en JSON, `<id>_s` = `columna:asc|desc`) para que
 * la vista se pueda compartir y sobreviva al refrescar; cada tabla usa su
 * propio `id` porque varias pestañas comparten página. Se escribe con
 * `history.replaceState` (sin navegación ni historial nuevo), que Next
 * sincroniza con `useSearchParams`. Requiere un <Suspense> arriba.
 */
export interface ColumnFiltersState {
  tableId: string;
  filters: ColumnFilters;
  sort: ColumnSort | null;
  /** Columnas con filtro (el orden no cuenta). */
  activeCount: number;
  setFilter: (column: string, value: ColumnFilterValue | null) => void;
  setSort: (sort: ColumnSort | null) => void;
  clear: () => void;
  /** `filters`/`sort`/`order` listos para el query string de la API. */
  params: Record<string, string | undefined>;
}

export function useColumnFilters(tableId: string, onChange?: () => void): ColumnFiltersState {
  const searchParams = useSearchParams();
  const fKey = `${tableId}_f`;
  const sKey = `${tableId}_s`;
  const [state, setState] = useState(() => ({
    filters: parseFiltersParam(searchParams.get(fKey)),
    sort: parseSortParam(searchParams.get(sKey)),
  }));
  const commit = useCallback(
    (next: { filters: ColumnFilters; sort: ColumnSort | null }) => {
      setState(next);
      const url = new URL(window.location.href);
      const filtersJson = Object.keys(next.filters).length ? JSON.stringify(next.filters) : null;
      const sortParam = formatSortParam(next.sort);
      if (filtersJson) url.searchParams.set(fKey, filtersJson);
      else url.searchParams.delete(fKey);
      if (sortParam) url.searchParams.set(sKey, sortParam);
      else url.searchParams.delete(sKey);
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      onChange?.();
    },
    [fKey, sKey, onChange],
  );

  const setFilter = useCallback(
    (column: string, value: ColumnFilterValue | null) => {
      const filters = { ...state.filters };
      if (value === null) delete filters[column];
      else filters[column] = value;
      commit({ filters, sort: state.sort });
    },
    [state, commit],
  );

  const setSort = useCallback(
    (sort: ColumnSort | null) => commit({ filters: state.filters, sort }),
    [state, commit],
  );

  const clear = useCallback(() => commit({ filters: {}, sort: null }), [commit]);

  const params = useMemo(() => columnQueryParams(state.filters, state.sort), [state]);

  return {
    tableId,
    filters: state.filters,
    sort: state.sort,
    activeCount: Object.keys(state.filters).length,
    setFilter,
    setSort,
    clear,
    params,
  };
}
