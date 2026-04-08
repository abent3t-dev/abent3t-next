'use client';

import Pagination from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/types/pagination';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface CatalogTableProps<T extends { id: string; is_active: boolean }> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
  extraAction?: {
    label: string;
    onClick: (item: T) => void;
    icon?: React.ReactNode;
  };
  // Server-side pagination & search
  meta?: PaginationMeta | null;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  searchValue?: string;
  onSearch?: (value: string) => void;
}

const Icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4 text-[#424846]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  x: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  empty: (
    <svg className="w-16 h-16 text-[#424846]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
};

export default function CatalogTable<
  T extends { id: string; is_active: boolean },
>({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  loading,
  extraAction,
  meta,
  onPageChange,
  onLimitChange,
  searchValue,
  onSearch,
}: CatalogTableProps<T>) {
  const hasActions = onEdit || onDelete || extraAction;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="px-6 py-4 bg-[#424846] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="flex gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchValue ?? ''}
              onChange={(e) => onSearch?.(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400 transition-all duration-200"
            />
            {searchValue && (
              <button
                onClick={() => onSearch?.('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-[#424846] transition-colors"
              >
                {Icons.x}
              </button>
            )}
          </div>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#52AF32] text-sm font-medium rounded-lg hover:bg-[#52AF32] hover:text-white border-2 border-white/50 transition-all duration-200 shadow-sm"
            >
              {Icons.plus}
              <span>Agregar</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-flex items-center gap-3 text-[#424846]">
            <svg className="animate-spin w-6 h-6 text-[#52AF32]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium">Cargando datos...</span>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className="bg-[#424846]">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider first:rounded-tl-none last:rounded-tr-none"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  Estado
                </th>
                {hasActions && (
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {data.map((item, index) => (
                <tr
                  key={item.id}
                  className={`
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    hover:bg-[#52AF32]/5 transition-colors duration-150
                  `}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-6 py-4 text-sm text-[#424846]"
                    >
                      {col.render
                        ? col.render(item[col.key], item)
                        : String(item[col.key] ?? '')}
                    </td>
                  ))}
                  {/* Status Badge */}
                  <td className="px-6 py-4 text-sm text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                        item.is_active
                          ? 'bg-[#52AF32]/15 text-[#52AF32] ring-1 ring-[#52AF32]/20'
                          : 'bg-gray-100 text-[#424846] ring-1 ring-gray-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-[#52AF32]' : 'bg-gray-400'}`} />
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {/* Actions */}
                  {hasActions && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {extraAction && (
                          <button
                            onClick={() => extraAction.onClick(item)}
                            className="p-2 text-[#222D59] hover:bg-[#222D59]/10 rounded-lg transition-all duration-200"
                            title={extraAction.label}
                          >
                            {extraAction.icon || Icons.calendar}
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-2 text-[#52AF32] hover:bg-[#52AF32]/10 rounded-lg transition-all duration-200"
                            title="Editar"
                          >
                            {Icons.edit}
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200"
                            title="Desactivar"
                          >
                            {Icons.trash}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {/* Empty State */}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1 + (hasActions ? 1 : 0)}
                    className="px-6 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      {Icons.empty}
                      <div>
                        <p className="text-[#424846] font-medium">No se encontraron registros</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {searchValue
                            ? 'Intenta con otros terminos de busqueda'
                            : 'Agrega un nuevo registro para comenzar'
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && onPageChange && (
        <div className="border-t border-gray-100">
          <Pagination
            meta={meta}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </div>
      )}
    </div>
  );
}
