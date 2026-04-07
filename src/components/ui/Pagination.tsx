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
    <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-white">
      {/* Texto informativo */}
      <div className="text-[#424846]/70 text-sm">
        Mostrando <span className="font-medium text-[#424846]">{from}</span> a{' '}
        <span className="font-medium text-[#424846]">{to}</span> de{' '}
        <span className="font-medium text-[#424846]">{total}</span> registros
      </div>

      <div className="flex items-center gap-4">
        {/* Selector de items por pagina */}
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="limit-select" className="text-[#424846]/70 text-sm hidden sm:inline">
              Mostrar:
            </label>
            <select
              id="limit-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-[#424846] bg-white cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#52AF32]/30 focus:border-[#52AF32] hover:border-[#67B52E]"
            >
              {[10, 25, 50, 100].map((v) => (
                <option key={v} value={v}>
                  {v} / pag
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navegacion de paginas */}
        <nav className="flex items-center gap-1" aria-label="Paginacion">
          {/* Boton Primera pagina */}
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrev}
            className="p-2 rounded-lg text-[#424846] bg-transparent transition-all duration-200 hover:bg-[#52AF32]/10 hover:text-[#52AF32] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#424846]"
            title="Primera pagina"
            aria-label="Ir a primera pagina"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {/* Boton Anterior */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="p-2 rounded-lg text-[#424846] bg-transparent transition-all duration-200 hover:bg-[#52AF32]/10 hover:text-[#52AF32] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#424846]"
            title="Pagina anterior"
            aria-label="Ir a pagina anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Ellipsis inicial */}
          {start > 1 && (
            <span className="px-2 py-1 text-[#424846]/50 select-none">...</span>
          )}

          {/* Numeros de pagina */}
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[36px] h-9 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                p === page
                  ? 'bg-[#52AF32] text-white shadow-sm'
                  : 'text-[#424846] bg-transparent hover:bg-[#67B52E]/15 hover:text-[#52AF32]'
              }`}
              aria-label={`Ir a pagina ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ))}

          {/* Ellipsis final */}
          {end < totalPages && (
            <span className="px-2 py-1 text-[#424846]/50 select-none">...</span>
          )}

          {/* Boton Siguiente */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="p-2 rounded-lg text-[#424846] bg-transparent transition-all duration-200 hover:bg-[#52AF32]/10 hover:text-[#52AF32] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#424846]"
            title="Pagina siguiente"
            aria-label="Ir a pagina siguiente"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Boton Ultima pagina */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNext}
            className="p-2 rounded-lg text-[#424846] bg-transparent transition-all duration-200 hover:bg-[#52AF32]/10 hover:text-[#52AF32] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#424846]"
            title="Ultima pagina"
            aria-label="Ir a ultima pagina"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
}
