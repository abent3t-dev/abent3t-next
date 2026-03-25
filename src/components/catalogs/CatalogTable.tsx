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
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  x: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="flex gap-3">
          {/* Search — server-side if onSearch provided */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {Icons.search}
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchValue ?? ''}
              onChange={(e) => onSearch?.(e.target.value)}
              className="pl-10 pr-8 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
            {searchValue && (
              <button
                onClick={() => onSearch?.('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
              >
                {Icons.x}
              </button>
            )}
          </div>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              {Icons.plus}
              <span>Agregar</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              {hasActions && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-6 py-4 text-sm text-gray-900"
                  >
                    {col.render
                      ? col.render(item[col.key], item)
                      : String(item[col.key] ?? '')}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      item.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {hasActions && (
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      {extraAction && (
                        <button
                          onClick={() => extraAction.onClick(item)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title={extraAction.label}
                        >
                          {extraAction.icon || Icons.calendar}
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          {Icons.edit}
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1 + (hasActions ? 1 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No se encontraron registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {meta && onPageChange && (
        <Pagination
          meta={meta}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
    </div>
  );
}
