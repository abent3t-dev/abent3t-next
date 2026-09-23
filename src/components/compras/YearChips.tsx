'use client';

/**
 * D4 (2026-09-23) — Chips de año ("Todos · 2023 · 2024 · …") para filtrar
 * tarjetas, pies y tablas por año calendario. Los años salen del backend
 * (`datos.anios`: años con datos en SAP o Maximo). null = todos.
 */
interface YearChipsProps {
  years: number[];
  value: number | null;
  onChange: (year: number | null) => void;
  /** Texto a la izquierda, p. ej. "Año:". */
  label?: string;
  compact?: boolean;
}

export default function YearChips({ years, value, onChange, label = 'Año', compact = false }: YearChipsProps) {
  const options: Array<{ key: string; year: number | null; text: string }> = [
    { key: 'all', year: null, text: 'Todos' },
    ...years
      .slice()
      .sort((a, b) => b - a)
      .map((y) => ({ key: String(y), year: y, text: String(y) })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por año">
      <span className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} mr-1`}>{label}:</span>
      {options.map((opt) => {
        const active = opt.year === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.year)}
            aria-pressed={active}
            className={`${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full font-medium transition-colors ${
              active
                ? 'bg-[#52AF32] text-white'
                : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {opt.text}
          </button>
        );
      })}
    </div>
  );
}
