'use client';

import type { PaginationMeta } from '@/types/pagination';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export default function Pagination({ meta, onPageChange, onLimitChange }: PaginationProps) {
  const { page, totalPages, total, limit, hasNext, hasPrev } = meta;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Build page numbers to show (max 5 around current)
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  if (total === 0) return null;

  return (
    <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
      <div className="text-gray-500">
        Mostrando {from}–{to} de {total} registros
      </div>

      <div className="flex items-center gap-2">
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-700 bg-white"
          >
            {[10, 15, 20, 50].map((v) => (
              <option key={v} value={v}>{v} / pág</option>
            ))}
          </select>
        )}

        <nav className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrev}
            className="px-2 py-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Primera"
          >
            «
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="px-2 py-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Anterior"
          >
            ‹
          </button>

          {start > 1 && <span className="px-1 text-gray-400">…</span>}

          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}

          {end < totalPages && <span className="px-1 text-gray-400">…</span>}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="px-2 py-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Siguiente"
          >
            ›
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNext}
            className="px-2 py-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Última"
          >
            »
          </button>
        </nav>
      </div>
    </div>
  );
}
