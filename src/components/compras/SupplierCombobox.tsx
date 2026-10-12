'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { PaginatedResponse } from '@/types/pagination';

/**
 * Selector con búsqueda (combobox accesible) de un proveedor del catálogo,
 * para el alta y edición de contratos.
 *
 * Diana (2026-10-12): la lista desplegable llegaba solo hasta "BOMBAS Y
 * MANTENIMIENTO": pedía los primeros 100 proveedores por nombre y el catálogo
 * tiene unos 900 (SAP activos e inactivos + capturados en ABENT). Ahora
 * busca en el SERVIDOR (GET /suppliers?search=, por razón social, nombre
 * comercial, RFC o correo) sobre todo el catálogo.
 *
 * Mismo patrón que `ProfileCombobox`: ↓/↑ recorren las opciones, Enter elige
 * la resaltada y Esc cierra y vuelve a mostrar el proveedor elegido.
 */

export interface SupplierOption {
  id: string;
  legal_name: string;
  tax_id: string;
  is_blocked?: boolean;
  sap_valid?: boolean | null;
  sap_frozen?: boolean | null;
}

interface SupplierComboboxProps {
  /** Proveedor elegido (null = ninguno). */
  value: SupplierOption | null;
  onChange: (supplier: SupplierOption | null) => void;
  /** id del input, para asociarlo con su `<label htmlFor>`. */
  id?: string;
}

const RESULTS_LIMIT = 20;
const DEBOUNCE_MS = 300;

const supplierLabel = (s: SupplierOption) => `${s.legal_name} (${s.tax_id})`;

/** Mismo criterio que la pantalla de Proveedores: no válido o congelado en SAP. */
const isSapInactive = (s: SupplierOption) => s.sap_valid === false || s.sap_frozen === true;

export default function SupplierCombobox({ value, onChange, id }: SupplierComboboxProps) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (key: string) => `${baseId}-option-${key}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  /** Lo que el usuario escribe; null = el input muestra el proveedor elegido. */
  const [query, setQuery] = useState<string | null>(null);
  /** Opción resaltada, por id: si llega otra lista, no apunta a otro proveedor. */
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const typed = (query ?? '').trim();
  const term = useDebouncedValue(typed, DEBOUNCE_MS);

  const suppliersQ = useQuery({
    queryKey: ['suppliers-picker', term],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: String(RESULTS_LIMIT) });
      if (term) qs.set('search', term);
      return api.get<PaginatedResponse<SupplierOption>>(`/suppliers?${qs.toString()}`);
    },
    enabled: open,
    // La lista anterior se queda mientras llega la nueva (sin parpadeo)
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const options = suppliersQ.data?.data ?? [];
  const total = suppliersQ.data?.meta?.total ?? 0;
  const activeIndex = options.findIndex((o) => o.id === activeKey);
  const pending = typed !== term || suppliersQ.isFetching;

  const statusText = suppliersQ.isError
    ? 'No se pudieron cargar los proveedores.'
    : pending
      ? 'Buscando…'
      : options.length === 0
        ? 'Sin coincidencias'
        : total > options.length
          ? `Mostrando ${options.length} de ${total}: escribe para buscar por nombre o RFC`
          : '';

  const close = () => {
    setOpen(false);
    setQuery(null);
    setActiveKey(null);
  };

  // Clic fuera del componente: cerrar y volver a mostrar el proveedor elegido.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target)) return;
      setOpen(false);
      setQuery(null);
      setActiveKey(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const choose = (supplier: SupplierOption) => {
    onChange(supplier);
    close();
  };

  const clear = () => {
    onChange(null);
    close();
    inputRef.current?.focus();
  };

  const highlight = (index: number) => {
    const option = options[index];
    if (!option) return;
    setActiveKey(option.id);
    document.getElementById(optionId(option.id))?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (options.length === 0) return;
        const step = e.key === 'ArrowDown' ? 1 : -1;
        // Sin resaltada: ↓ va a la primera y ↑ a la última; luego da la vuelta
        const from = activeIndex === -1 ? (step === 1 ? -1 : options.length) : activeIndex;
        highlight((from + step + options.length) % options.length);
        return;
      }
      case 'Enter':
        // Enter nunca envía el formulario desde aquí
        if (open) e.preventDefault();
        if (open && activeIndex >= 0) choose(options[activeIndex]);
        return;
      case 'Escape':
        if (open || query !== null) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
        return;
      case 'Tab':
        if (open) close();
        return;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(options[activeIndex].id) : undefined}
        autoComplete="off"
        value={query ?? (value ? supplierLabel(value) : '')}
        title={value ? supplierLabel(value) : undefined}
        placeholder="Buscar por nombre o RFC"
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveKey(null);
          setOpen(true);
        }}
        // Con el proveedor elegido a la vista, enfocar selecciona el texto: lo
        // que se teclee lo reemplaza y arranca una búsqueda nueva.
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => {
          if (query === null) e.currentTarget.select();
          setOpen(true);
        }}
        onBlur={(e) => {
          // El foco salió del componente (Tab, clic en otro campo)
          const next = e.relatedTarget;
          if (!(next instanceof Node && rootRef.current?.contains(next))) close();
        }}
        onKeyDown={onKeyDown}
        className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Quitar el proveedor"
          title="Quitar"
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-[#424846]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* mousedown sin default: el foco se queda en el input al elegir o hacer scroll */}
      <div
        onMouseDown={(e) => e.preventDefault()}
        className={
          open
            ? 'absolute z-20 mt-1 w-full min-w-[22rem] rounded-lg border border-gray-200 bg-white shadow-lg'
            : 'hidden'
        }
      >
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Proveedores"
          className={`max-h-64 overflow-y-auto py-1 transition-opacity ${pending ? 'opacity-60' : ''}`}
        >
          {options.map((supplier, index) => {
            const isActive = index === activeIndex;
            const isSelected = supplier.id === value?.id;
            return (
              <li
                key={supplier.id}
                id={optionId(supplier.id)}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(supplier)}
                className={`px-3 py-2 text-sm cursor-pointer ${isActive ? 'bg-[#52AF32]/10' : 'hover:bg-gray-50'}`}
              >
                <span className={isSelected ? 'font-semibold text-[#3d8425]' : 'font-medium text-gray-900'}>
                  {supplier.legal_name}
                </span>
                <span className="text-gray-500"> · {supplier.tax_id}</span>
                {supplier.is_blocked && (
                  <span className="ml-2 inline-block rounded-full bg-red-100 px-2 text-xs text-red-800">Bloqueado</span>
                )}
                {isSapInactive(supplier) && (
                  <span className="ml-2 inline-block rounded-full bg-gray-200 px-2 text-xs text-gray-700">Inactivo en SAP</span>
                )}
              </li>
            );
          })}
        </ul>
        <p
          role="status"
          className={
            statusText
              ? `px-3 py-2 text-sm border-t border-gray-100 ${suppliersQ.isError ? 'text-red-600' : 'text-gray-500'}`
              : 'sr-only'
          }
        >
          {statusText}
        </p>
      </div>
    </div>
  );
}
