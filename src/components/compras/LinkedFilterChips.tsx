'use client';

/**
 * Reunión con Ingrid 2026-09-28 (G1/G3): filtros que llegan en la URL desde
 * otra pantalla — clic en una barra del top de proveedores de Reportes o en
 * la tarjeta de pendientes del dashboard. Se muestran como chips con "×"
 * para quitarlos (mismo estilo que los filtros de columna).
 */

export interface LinkedFilter {
  key: string;
  label: string;
  value: string;
  title?: string;
  onClear: () => void;
}

const CHIP =
  'inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs rounded-full bg-[#222D59]/10 text-[#222D59] border border-[#222D59]/25';
const REMOVE =
  'ml-0.5 w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-[#222D59]/20';

export default function LinkedFilterChips({ filters }: { filters: LinkedFilter[] }) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500">Filtro aplicado desde otra pantalla:</span>
      {filters.map((f) => (
        <span key={f.key} className={CHIP} title={f.title}>
          <span className="font-medium">{f.label}:</span>
          <span className="max-w-80 truncate">{f.value}</span>
          <button type="button" onClick={f.onClear} className={REMOVE} aria-label={`Quitar filtro ${f.label}`}>
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DD' → '28 sep 2025' (sin Date: no se corre de día por zona horaria). */
export function shortDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MESES[Number(m) - 1]} ${y}`;
}

/** Texto de un periodo: "1 ene 2026 al 28 sep 2026" / "desde 28 sep 2025". */
export function periodText(from?: string | null, to?: string | null): string {
  if (from && to) return `${shortDay(from)} al ${shortDay(to)}`;
  if (from) return `desde ${shortDay(from)}`;
  if (to) return `hasta ${shortDay(to)}`;
  return '';
}
