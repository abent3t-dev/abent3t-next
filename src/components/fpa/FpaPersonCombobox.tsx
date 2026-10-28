'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fpaKeys } from '@/hooks/useFpa';
import type { FpaPerson, FpaRole } from '@/types/fpa';

/**
 * FP&A (A3) — selector con búsqueda de una persona del directorio de FP&A
 * (GET /fpa/usuarios/directorio?search=), para nombrar al titular de captura
 * o de aprobación de un área. `GET /auth/users` es solo de RH y super_admin,
 * por eso el módulo tiene su propio directorio.
 *
 * Mismo patrón que ProfileCombobox: ↓/↑ recorren, Enter elige y Esc cierra.
 */

interface FpaPersonComboboxProps {
  value: FpaPerson | null;
  onChange: (person: FpaPerson | null) => void;
  id?: string;
  /** Solo personas con este rol de FP&A (B2: firmantes de planeación y del CFO). */
  role?: FpaRole;
}

const DEBOUNCE_MS = 300;

export default function FpaPersonCombobox({ value, onChange, id, role }: FpaPersonComboboxProps) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (key: string) => `${baseId}-option-${key}`;
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  /** Lo que se teclea; null = el input muestra a la persona elegida. */
  const [query, setQuery] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const typed = (query ?? '').trim();
  const term = useDebouncedValue(typed, DEBOUNCE_MS);

  const peopleQ = useQuery({
    queryKey: [...fpaKeys.directory(term), role ?? 'todos'],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (term) qs.set('search', term);
      if (role) qs.set('rol', role);
      const suffix = qs.toString();
      return api.get<FpaPerson[]>(`/fpa/usuarios/directorio${suffix ? `?${suffix}` : ''}`);
    },
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });

  const options = peopleQ.data ?? [];
  const activeIndex = options.findIndex((o) => o.id === activeKey);
  const pending = typed !== term || peopleQ.isFetching;
  const statusText = peopleQ.isError
    ? peopleQ.error instanceof Error && peopleQ.error.message
      ? peopleQ.error.message
      : 'No se pudo cargar el directorio.'
    : pending
      ? 'Buscando…'
      : options.length === 0
        ? 'Sin coincidencias en el directorio de FP&A'
        : '';

  const close = () => {
    setOpen(false);
    setQuery(null);
    setActiveKey(null);
  };

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

  const choose = (person: FpaPerson) => {
    onChange(person);
    close();
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
        const from = activeIndex === -1 ? (step === 1 ? -1 : options.length) : activeIndex;
        highlight((from + step + options.length) % options.length);
        return;
      }
      case 'Enter':
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
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(options[activeIndex].id) : undefined}
        autoComplete="off"
        value={query ?? value?.full_name ?? ''}
        placeholder="Buscar por nombre"
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveKey(null);
          setOpen(true);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => {
          if (query === null) e.currentTarget.select();
          setOpen(true);
        }}
        onBlur={(e) => {
          const next = e.relatedTarget;
          if (!(next instanceof Node && rootRef.current?.contains(next))) close();
        }}
        onKeyDown={onKeyDown}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
      />
      <div
        onMouseDown={(e) => e.preventDefault()}
        className={open ? 'absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg' : 'hidden'}
      >
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Directorio de FP&A"
          className={`max-h-60 overflow-y-auto py-1 transition-opacity ${pending ? 'opacity-60' : ''}`}
        >
          {options.map((person, index) => {
            const isActive = index === activeIndex;
            const isSelected = person.id === value?.id;
            return (
              <li
                key={person.id}
                id={optionId(person.id)}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(person)}
                className={`px-3 py-2 text-sm cursor-pointer ${isActive ? 'bg-[#52AF32]/10' : 'hover:bg-gray-50'}`}
              >
                <span className={isSelected ? 'font-semibold text-[#3d8425]' : 'font-medium text-gray-900'}>
                  {person.full_name}
                </span>
              </li>
            );
          })}
        </ul>
        <p
          role="status"
          className={
            statusText
              ? `px-3 py-2 text-sm border-t border-gray-100 ${peopleQ.isError ? 'text-red-600' : 'text-gray-500'}`
              : 'sr-only'
          }
        >
          {statusText}
        </p>
      </div>
    </div>
  );
}
