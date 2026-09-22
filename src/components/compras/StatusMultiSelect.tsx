'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Sprint 2026-09-22 (A5, pedido de Omar) — filtro de estatus con palomitas:
 * dropdown con checkboxes y resumen ("2 seleccionados"). Reutilizado por las
 * tablas de compras (ABENT, SAP y Maximo). El valor viaja al backend como
 * lista separada por coma (`status=open,close`).
 */

export interface StatusOption {
  value: string;
  label: string;
}

interface StatusMultiSelectProps {
  options: StatusOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function StatusMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Todos los estatus',
  className = '',
}: StatusMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${value.length} seleccionados`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#52AF32] ${
          value.length > 0 ? 'border-[#52AF32]' : 'border-gray-300'
        }`}
      >
        <span>{summary}</span>
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 min-w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-800 rounded hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="accent-[#52AF32]"
              />
              {opt.label}
            </label>
          ))}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full text-left px-2 py-1.5 text-xs text-[#52AF32] hover:underline"
            >
              Limpiar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
}
