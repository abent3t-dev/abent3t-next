'use client';

/**
 * Sprint 2026-09-22 (A4, pedido de Omar) — chips de totales arriba de cada
 * tabla: "N resultados · de M totales" (meta.total del listado paginado vs.
 * total sin filtros) y el desglose por estatus, para no tener que sumar a
 * mano ni bajar al pie de la tabla. Clic en un chip de estatus = filtrar.
 */

export interface StatusChip {
  key: string;
  label: string;
  count: number;
  className?: string;
}

interface ResultChipsProps {
  /** Total que devuelve el listado con los filtros actuales (meta.total). */
  filteredTotal: number | undefined;
  /** Total sin filtros (resumen). Si no se conoce, solo se muestra el primero. */
  grandTotal?: number;
  statuses?: StatusChip[];
  /** Estatus activos en el filtro (para resaltar el chip). */
  activeStatuses?: string[];
  onToggleStatus?: (key: string) => void;
  loading?: boolean;
}

export default function ResultChips({
  filteredTotal,
  grandTotal,
  statuses = [],
  activeStatuses = [],
  onToggleStatus,
  loading = false,
}: ResultChipsProps) {
  if (loading && filteredTotal === undefined) return null;
  const shown = filteredTotal ?? 0;
  const hasGrand = grandTotal !== undefined && grandTotal !== shown;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-[#424846] text-white">
        {shown.toLocaleString('es-MX')} {shown === 1 ? 'resultado' : 'resultados'}
        {hasGrand && (
          <span className="ml-1 font-normal text-gray-200">
            · de {grandTotal.toLocaleString('es-MX')} totales
          </span>
        )}
      </span>
      {statuses.map((chip) => {
        const active = activeStatuses.includes(chip.key);
        const base = chip.className ?? 'bg-gray-100 text-gray-700';
        return (
          <button
            key={chip.key}
            type="button"
            onClick={onToggleStatus ? () => onToggleStatus(chip.key) : undefined}
            disabled={!onToggleStatus}
            title={onToggleStatus ? 'Clic para filtrar por este estatus' : undefined}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${base} ${
              active ? 'ring-2 ring-[#52AF32] ring-offset-1' : ''
            } ${onToggleStatus ? 'hover:opacity-80' : 'cursor-default'}`}
          >
            {chip.label}
            <span className="font-bold">{chip.count.toLocaleString('es-MX')}</span>
          </button>
        );
      })}
    </div>
  );
}
