'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { UserProfile } from '@/types/catalogs';

interface CollaboratorComboboxProps {
  collaborators: UserProfile[];
  value: string;
  onChange: (collaboratorId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyHint?: string;
}

const normalize = (s: string | null | undefined) =>
  (s || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const initials = (
  fullName: string | null | undefined,
  email: string | null | undefined,
): string => {
  const source = (fullName || '').trim();
  if (source) {
    const parts = source.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (email || 'U').slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  'bg-[#52AF32]',
  'bg-[#222D59]',
  'bg-[#DFA922]',
  'bg-[#67B52E]',
  'bg-[#74B82B]',
  'bg-[#424846]',
];

const colorForId = (id: string): string => {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

interface FilterOption {
  id: string;
  name: string;
  count: number;
}

const collectPositionOptions = (collaborators: UserProfile[]): FilterOption[] => {
  const map = new Map<string, FilterOption>();
  collaborators.forEach((c) => {
    const v = c.position?.trim();
    if (!v) return;
    const existing = map.get(v);
    if (existing) existing.count += 1;
    else map.set(v, { id: v, name: v, count: 1 });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export function CollaboratorCombobox({
  collaborators,
  value,
  onChange,
  placeholder = 'Seleccionar colaborador...',
  disabled = false,
  emptyHint,
}: CollaboratorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selected = useMemo(
    () => collaborators.find((c) => c.id === value) || null,
    [collaborators, value],
  );

  const positionOptions = useMemo(
    () => collectPositionOptions(collaborators),
    [collaborators],
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    return collaborators.filter((c) => {
      if (positionFilter && c.position !== positionFilter) return false;
      if (!q) return true;
      const fields = [c.full_name, c.email, c.position];
      return fields.some((f) => normalize(f).includes(q));
    });
  }, [collaborators, query, positionFilter]);

  const openPicker = () => {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closePicker = () => {
    setOpen(false);
    setQuery('');
  };

  const handleSelect = (c: UserProfile) => {
    onChange(c.id);
    closePicker();
  };

  const clearFilters = () => {
    setPositionFilter('');
    setQuery('');
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      {selected ? (
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className="w-full text-left px-4 py-3 border border-[#52AF32] bg-[#52AF32]/5 rounded-xl hover:bg-[#52AF32]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${colorForId(
                selected.id,
              )}`}
            >
              <span className="text-white font-bold text-sm">
                {initials(selected.full_name, selected.email)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#424846] text-sm truncate">
                {selected.full_name || selected.email?.split('@')[0] || 'Sin nombre'}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#424846]/70 mt-0.5">
                <span className="truncate">{selected.position || 'Sin puesto'}</span>
                {selected.email && (
                  <>
                    <span className="text-[#424846]/30">·</span>
                    <span className="truncate">{selected.email}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-[#424846]/50 uppercase tracking-wide">Cambiar</span>
              <span
                role="button"
                tabIndex={0}
                onClick={clearSelection}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange('');
                  }
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Limpiar selección"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            </div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className="w-full text-left px-4 py-3 border border-gray-200 rounded-xl hover:border-[#52AF32] hover:bg-[#52AF32]/5 transition-colors flex items-center gap-3 text-sm text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1">{placeholder}</span>
          <span className="text-[11px] text-[#424846]/50">{collaborators.length} disponibles</span>
        </button>
      )}

      {mounted && open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={closePicker}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#52AF32] px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Seleccionar colaborador</h2>
                  <p className="text-white/80 text-xs">Solo aparecen colaboradores activos de tu área</p>
                </div>
                <button
                  type="button"
                  onClick={closePicker}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, puesto o correo..."
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#52AF32] focus:border-transparent bg-white"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {positionOptions.length > 1 && (
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#52AF32] focus:border-transparent bg-white"
                  >
                    <option value="">Todos los puestos</option>
                    {positionOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.count})
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#424846]/70">
                    {filtered.length}{' '}
                    {filtered.length === 1 ? 'colaborador encontrado' : 'colaboradores encontrados'}
                  </span>
                  {(positionFilter || query) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[#52AF32] hover:text-[#67B52E] hover:underline font-medium"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">No se encontraron colaboradores</p>
                    {emptyHint && <p className="text-xs text-gray-400 mt-1">{emptyHint}</p>}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filtered.map((c) => {
                      const isSelected = c.id === value;
                      return (
                        <li
                          key={c.id}
                          onClick={() => handleSelect(c)}
                          className={`px-6 py-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#52AF32]/10' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${colorForId(
                                c.id,
                              )}`}
                            >
                              <span className="text-white font-bold text-sm">
                                {initials(c.full_name, c.email)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <svg className="w-4 h-4 text-[#52AF32] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                <p className="font-semibold text-[#424846] text-sm truncate">
                                  {c.full_name || c.email?.split('@')[0] || 'Sin nombre'}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#424846]/70 mt-0.5">
                                <span className="truncate font-medium">{c.position || 'Sin puesto'}</span>
                                {c.email && (
                                  <>
                                    <span className="text-[#424846]/30">·</span>
                                    <span className="truncate">{c.email}</span>
                                  </>
                                )}
                              </div>
                              {c.departments?.name && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-[#424846]/60">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  <span className="truncate">{c.departments.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default CollaboratorCombobox;
