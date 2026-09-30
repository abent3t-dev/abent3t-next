'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { PaginatedResponse } from '@/types/pagination';

/**
 * G4 (junta 2026-09-28) — Selector con búsqueda (combobox accesible) de un
 * perfil activo de la plataforma, para ligarle un usuario de SAP/Maximo.
 *
 * Busca en el SERVIDOR sobre todos los perfiles activos
 * (GET /compras/usuarios/gestion: sin acentos, sin importar mayúsculas y por
 * palabras en cualquier orden). El selector anterior solo filtraba los
 * primeros 20 perfiles, por eso no aparecía quien estaba en la página 2.
 *
 * Teclado (patrón combobox de WAI-ARIA): ↓/↑ recorren las opciones, Enter
 * elige la resaltada y Esc cierra y vuelve a mostrar el perfil ligado.
 */

export interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string;
  /** Roles de compras vigentes (los trae la búsqueda de gestión de roles). */
  purchase_roles?: string[];
}

interface ProfileComboboxProps {
  /** Perfil ligado actualmente (null = sin ligar). */
  value: ProfileOption | null;
  onChange: (profile: ProfileOption | null) => void;
  /** id del input, para asociarlo con su `<label htmlFor>`. */
  id?: string;
}

interface Option {
  key: string;
  profile: ProfileOption | null;
}

const RESULTS_LIMIT = 10;
const DEBOUNCE_MS = 300;
/** Clave de la opción "Sin ligar" (no choca con un uuid). */
const NONE_KEY = 'sin-ligar';

const profileLabel = (p: ProfileOption) => `${p.full_name ?? p.email} · ${p.email}`;

export default function ProfileCombobox({ value, onChange, id }: ProfileComboboxProps) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (key: string) => `${baseId}-option-${key}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  /** Lo que el usuario escribe; null = el input muestra el perfil ligado. */
  const [query, setQuery] = useState<string | null>(null);
  /** Opción resaltada, por clave: si llega otra lista, no apunta a otra persona. */
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const typed = (query ?? '').trim();
  const term = useDebouncedValue(typed, DEBOUNCE_MS);

  const profilesQ = useQuery({
    queryKey: ['compras-roles-users', 'picker', term],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: String(RESULTS_LIMIT) });
      if (term) qs.set('search', term);
      return api.get<PaginatedResponse<ProfileOption>>(`/compras/usuarios/gestion?${qs.toString()}`);
    },
    enabled: open,
    // La lista anterior se queda mientras llega la nueva (sin parpadeo)
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const matches = profilesQ.data?.data ?? [];
  // "Sin ligar" encabeza la lista mientras no se esté buscando a alguien
  const options: Option[] = [
    ...(typed === '' ? [{ key: NONE_KEY, profile: null }] : []),
    ...matches.map((profile) => ({ key: profile.id, profile })),
  ];
  const activeIndex = options.findIndex((o) => o.key === activeKey);
  const pending = typed !== term || profilesQ.isFetching;

  const statusText = profilesQ.isError
    ? 'No se pudieron cargar los perfiles.'
    : pending
      ? 'Buscando…'
      : matches.length === 0
        ? 'Sin coincidencias'
        : '';

  const close = () => {
    setOpen(false);
    setQuery(null);
    setActiveKey(null);
  };

  // Clic fuera del componente: cerrar y volver a mostrar el perfil ligado.
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

  const choose = (option: Option) => {
    onChange(option.profile);
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
    setActiveKey(option.key);
    document.getElementById(optionId(option.key))?.scrollIntoView({ block: 'nearest' });
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
        if (open && activeIndex >= 0) {
          e.preventDefault();
          choose(options[activeIndex]);
        }
        return;
      case 'Escape':
        if (open || query !== null) {
          e.preventDefault();
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
        aria-activedescendant={open && activeIndex >= 0 ? optionId(options[activeIndex].key) : undefined}
        autoComplete="off"
        value={query ?? (value ? profileLabel(value) : '')}
        title={value ? profileLabel(value) : undefined}
        placeholder="Buscar por nombre o correo"
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveKey(null);
          setOpen(true);
        }}
        // Con el perfil ligado a la vista, enfocar selecciona el texto: lo que
        // se teclee lo reemplaza y arranca una búsqueda nueva.
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
          aria-label="Quitar el perfil ligado (Sin ligar)"
          title="Sin ligar"
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
            ? 'absolute z-20 mt-1 w-full min-w-[18rem] rounded-lg border border-gray-200 bg-white shadow-lg'
            : 'hidden'
        }
      >
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Perfiles de la plataforma"
          className={`max-h-60 overflow-y-auto py-1 transition-opacity ${pending ? 'opacity-60' : ''}`}
        >
          {options.map((option, index) => {
            const isActive = index === activeIndex;
            const isSelected = option.profile ? option.profile.id === value?.id : value === null;
            return (
              <li
                key={option.key}
                id={optionId(option.key)}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(option)}
                className={`px-3 py-2 text-sm cursor-pointer ${isActive ? 'bg-[#52AF32]/10' : 'hover:bg-gray-50'}`}
              >
                {option.profile ? (
                  <>
                    <span className={isSelected ? 'font-semibold text-[#3d8425]' : 'font-medium text-gray-900'}>
                      {option.profile.full_name ?? option.profile.email}
                    </span>
                    <span className="text-gray-500"> · {option.profile.email}</span>
                  </>
                ) : (
                  <span className={isSelected ? 'font-semibold text-[#3d8425]' : 'text-gray-600'}>Sin ligar</span>
                )}
              </li>
            );
          })}
        </ul>
        <p
          role="status"
          className={
            statusText
              ? `px-3 py-2 text-sm border-t border-gray-100 ${profilesQ.isError ? 'text-red-600' : 'text-gray-500'}`
              : 'sr-only'
          }
        >
          {statusText}
        </p>
      </div>
    </div>
  );
}
