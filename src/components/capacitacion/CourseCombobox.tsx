'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Course, CourseEdition } from '@/types/catalogs';
import { api } from '@/lib/api';

interface CourseComboboxProps {
  courses: Course[];
  value: string; // courseId
  editionValue: string; // editionId
  onChange: (courseId: string, editionId: string) => void;
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

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

interface FilterOption {
  id: string;
  name: string;
  count: number;
}

const collectFilterOptions = (
  courses: Course[],
  accessor: (c: Course) => { id: string; name: string } | null | undefined,
): FilterOption[] => {
  const map = new Map<string, FilterOption>();
  courses.forEach((c) => {
    const v = accessor(c);
    if (!v?.id) return;
    const existing = map.get(v.id);
    if (existing) existing.count += 1;
    else map.set(v.id, { id: v.id, name: v.name, count: 1 });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export function CourseCombobox({
  courses,
  value,
  editionValue,
  onChange,
  placeholder = 'Seleccionar curso...',
  disabled = false,
  emptyHint,
}: CourseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('');
  const [modalityFilter, setModalityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  const [editionsCache, setEditionsCache] = useState<Record<string, CourseEdition[]>>({});
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === value) || null,
    [courses, value],
  );

  const selectedEdition = useMemo(() => {
    if (!value || !editionValue) return null;
    const editions = editionsCache[value];
    return editions?.find((e) => e.id === editionValue) || null;
  }, [editionsCache, value, editionValue]);

  // Cargar ediciones del curso seleccionado al montar (para que la preview tenga la info)
  useEffect(() => {
    if (!value || editionsCache[value]) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<CourseEdition[]>(`/courses/${value}/editions`);
        if (cancelled) return;
        setEditionsCache((prev) => ({
          ...prev,
          [value]: data.filter((e) => e.is_active),
        }));
      } catch {
        // silencioso: si falla, la preview muestra menos info
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, editionsCache]);

  const institutionOptions = useMemo(
    () => collectFilterOptions(courses, (c) => c.institutions),
    [courses],
  );
  const modalityOptions = useMemo(
    () => collectFilterOptions(courses, (c) => c.modalities),
    [courses],
  );
  const typeOptions = useMemo(
    () => collectFilterOptions(courses, (c) => c.course_types),
    [courses],
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    return courses.filter((c) => {
      if (institutionFilter && c.institutions?.id !== institutionFilter) return false;
      if (modalityFilter && c.modalities?.id !== modalityFilter) return false;
      if (typeFilter && c.course_types?.id !== typeFilter) return false;
      if (!q) return true;
      const fields = [c.name, c.institutions?.name, c.modalities?.name, c.course_types?.name];
      return fields.some((f) => normalize(f).includes(q));
    });
  }, [courses, query, institutionFilter, modalityFilter, typeFilter]);

  const activeFiltersCount =
    (institutionFilter ? 1 : 0) + (modalityFilter ? 1 : 0) + (typeFilter ? 1 : 0);

  const openPicker = () => {
    if (disabled) return;
    setOpen(true);
    setExpandedCourseId(null);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closePicker = () => {
    setOpen(false);
    setQuery('');
    setExpandedCourseId(null);
  };

  const ensureEditionsLoaded = async (courseId: string): Promise<CourseEdition[]> => {
    const cached = editionsCache[courseId];
    if (cached) return cached;
    setLoadingCourseId(courseId);
    try {
      const data = await api.get<CourseEdition[]>(`/courses/${courseId}/editions`);
      const active = data.filter((e) => e.is_active);
      setEditionsCache((prev) => ({ ...prev, [courseId]: active }));
      return active;
    } finally {
      setLoadingCourseId(null);
    }
  };

  const handleCourseClick = async (course: Course) => {
    const editions = await ensureEditionsLoaded(course.id);
    if (editions.length === 0) {
      // Sin ediciones disponibles — no debería ocurrir porque ya filtramos en el padre,
      // pero por seguridad no hacemos nada
      return;
    }
    if (editions.length === 1) {
      onChange(course.id, editions[0].id);
      closePicker();
      return;
    }
    // Toggle expanded
    setExpandedCourseId((prev) => (prev === course.id ? null : course.id));
  };

  const handleEditionClick = (course: Course, edition: CourseEdition) => {
    onChange(course.id, edition.id);
    closePicker();
  };

  const clearFilters = () => {
    setInstitutionFilter('');
    setModalityFilter('');
    setTypeFilter('');
    setQuery('');
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
  };

  // Lock body scroll when picker is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape
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
      {/* Trigger */}
      {selectedCourse ? (
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className="w-full text-left px-4 py-3 border border-[#52AF32] bg-[#52AF32]/5 rounded-xl hover:bg-[#52AF32]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#424846] text-sm truncate">{selectedCourse.name}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {selectedCourse.institutions?.name && (
                  <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-[#222D59]/10 text-[#222D59] font-medium">
                    {selectedCourse.institutions.name}
                  </span>
                )}
                {selectedCourse.modalities?.name && (
                  <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-[#67B52E]/15 text-[#52AF32] font-medium">
                    {selectedCourse.modalities.name}
                  </span>
                )}
                {selectedCourse.course_types?.name && (
                  <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-[#DFA922]/15 text-[#DFA922] font-medium">
                    {selectedCourse.course_types.name}
                  </span>
                )}
                {selectedCourse.total_hours > 0 && (
                  <span className="text-[11px] text-[#424846]/70">{selectedCourse.total_hours}h</span>
                )}
              </div>
              {selectedEdition && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 pt-2 border-t border-[#52AF32]/20 text-[11px] text-[#424846]/80">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(selectedEdition.start_date)}
                    {selectedEdition.end_date && ` → ${formatDate(selectedEdition.end_date)}`}
                  </span>
                  {selectedEdition.instructor && (
                    <>
                      <span className="text-[#424846]/30">·</span>
                      <span>👤 {selectedEdition.instructor}</span>
                    </>
                  )}
                  {selectedEdition.location && (
                    <>
                      <span className="text-[#424846]/30">·</span>
                      <span>📍 {selectedEdition.location}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
              <p className="font-bold text-[#52AF32] text-sm whitespace-nowrap">
                {formatCurrency(selectedCourse.cost)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#424846]/50 uppercase tracking-wide">Cambiar</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={clearSelection}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange('', '');
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
          <span className="text-[11px] text-[#424846]/50">{courses.length} cursos</span>
        </button>
      )}

      {/* Picker Modal (Portal) */}
      {mounted && open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={closePicker}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#52AF32] px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Seleccionar curso y edición</h2>
                  <p className="text-white/80 text-xs">
                    Click en un curso para ver sus ediciones disponibles
                  </p>
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

              {/* Search + Filters */}
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
                    placeholder="Buscar curso..."
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

                {(institutionOptions.length > 0 || modalityOptions.length > 0 || typeOptions.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {institutionOptions.length > 0 && (
                      <select
                        value={institutionFilter}
                        onChange={(e) => setInstitutionFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#52AF32] focus:border-transparent bg-white"
                      >
                        <option value="">Todas las instituciones</option>
                        {institutionOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.count})
                          </option>
                        ))}
                      </select>
                    )}
                    {modalityOptions.length > 0 && (
                      <select
                        value={modalityFilter}
                        onChange={(e) => setModalityFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#52AF32] focus:border-transparent bg-white"
                      >
                        <option value="">Todas las modalidades</option>
                        {modalityOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.count})
                          </option>
                        ))}
                      </select>
                    )}
                    {typeOptions.length > 0 && (
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#52AF32] focus:border-transparent bg-white"
                      >
                        <option value="">Todos los tipos</option>
                        {typeOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.count})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#424846]/70">
                    {filtered.length} {filtered.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
                    {activeFiltersCount > 0 && ` · ${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} activo${activeFiltersCount > 1 ? 's' : ''}`}
                  </span>
                  {(activeFiltersCount > 0 || query) && (
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

              {/* Results */}
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">No se encontraron cursos</p>
                    {emptyHint && <p className="text-xs text-gray-400 mt-1">{emptyHint}</p>}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filtered.map((c) => {
                      const isCurrentSelected = c.id === value;
                      const isExpanded = expandedCourseId === c.id;
                      const isLoading = loadingCourseId === c.id;
                      const editions = editionsCache[c.id] || [];
                      return (
                        <li
                          key={c.id}
                          className={`transition-colors ${
                            isCurrentSelected ? 'bg-[#52AF32]/5' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleCourseClick(c)}
                            disabled={isLoading}
                            className={`w-full px-6 py-3 text-left transition-colors ${
                              isExpanded ? 'bg-[#52AF32]/10' : 'hover:bg-gray-50'
                            } disabled:opacity-60`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {isCurrentSelected && (
                                    <svg
                                      className="w-4 h-4 text-[#52AF32] flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  <p className="font-semibold text-[#424846] text-sm truncate">{c.name}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {c.institutions?.name && (
                                    <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-[#222D59]/10 text-[#222D59] font-medium">
                                      {c.institutions.name}
                                    </span>
                                  )}
                                  {c.modalities?.name && (
                                    <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-[#67B52E]/15 text-[#52AF32] font-medium">
                                      {c.modalities.name}
                                    </span>
                                  )}
                                  {c.course_types?.name && (
                                    <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-[#DFA922]/15 text-[#DFA922] font-medium">
                                      {c.course_types.name}
                                    </span>
                                  )}
                                  {c.total_hours > 0 && (
                                    <span className="text-[11px] text-[#424846]/70">{c.total_hours}h</span>
                                  )}
                                  {(c.active_editions_count ?? 0) > 0 && (
                                    <span className="text-[11px] text-[#424846]/60 ml-auto">
                                      {c.active_editions_count}{' '}
                                      {c.active_editions_count === 1 ? 'edición' : 'ediciones'}
                                    </span>
                                  )}
                                </div>
                                {c.description && (
                                  <p className="text-[11px] text-[#424846]/60 mt-1 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0 flex items-center gap-2">
                                <p className="font-bold text-[#424846] text-sm whitespace-nowrap">
                                  {formatCurrency(c.cost)}
                                </p>
                                {isLoading ? (
                                  <div className="w-4 h-4 border-2 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Ediciones expandidas */}
                          {isExpanded && editions.length > 0 && (
                            <div className="px-6 pb-3 bg-[#52AF32]/5 border-t border-[#52AF32]/10">
                              <p className="text-[10px] text-[#424846]/60 uppercase tracking-wide font-semibold pt-3 pb-2">
                                Selecciona una edición
                              </p>
                              <ul className="space-y-1.5">
                                {editions.map((ed) => {
                                  const isEditionSelected = ed.id === editionValue;
                                  return (
                                    <li key={ed.id}>
                                      <button
                                        type="button"
                                        onClick={() => handleEditionClick(c, ed)}
                                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                                          isEditionSelected
                                            ? 'bg-[#52AF32]/15 border-[#52AF32]'
                                            : 'bg-white border-gray-200 hover:border-[#52AF32] hover:bg-[#52AF32]/5'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 text-xs">
                                          {isEditionSelected && (
                                            <svg className="w-4 h-4 text-[#52AF32] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                          <span className="font-medium text-[#424846] flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {formatDate(ed.start_date)}
                                            {ed.end_date && ` → ${formatDate(ed.end_date)}`}
                                          </span>
                                          {ed.instructor && (
                                            <>
                                              <span className="text-[#424846]/30">·</span>
                                              <span className="text-[#424846]/80 truncate">👤 {ed.instructor}</span>
                                            </>
                                          )}
                                          {ed.location && (
                                            <>
                                              <span className="text-[#424846]/30">·</span>
                                              <span className="text-[#424846]/80 truncate">📍 {ed.location}</span>
                                            </>
                                          )}
                                          {ed.max_participants !== null && ed.max_participants !== undefined && (
                                            <>
                                              <span className="text-[#424846]/30">·</span>
                                              <span className="text-[#424846]/80">cupo {ed.max_participants}</span>
                                            </>
                                          )}
                                        </div>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
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

export default CourseCombobox;
