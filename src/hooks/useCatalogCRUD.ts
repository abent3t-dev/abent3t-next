'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { getQueryKeyForEndpoint } from '@/lib/queryKeys';
import type { PaginationMeta, PaginatedResponse } from '@/types/pagination';

interface UseCatalogCRUDOptions<T, F> {
  endpoint: string;
  initialForm: F;
  transformForEdit?: (item: T) => F;
  transformForCreate?: (form: F) => unknown;
  transformForUpdate?: (form: F) => unknown;
  defaultLimit?: number;
}

export function useCatalogCRUD<T extends { id: string }, F>({
  endpoint,
  initialForm,
  transformForEdit,
  transformForCreate,
  transformForUpdate,
  defaultLimit = 20,
}: UseCatalogCRUDOptions<T, F>) {
  const qc = useQueryClient();
  const keys = getQueryKeyForEndpoint(endpoint);

  // Modal / form state (local — not server state)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<F>(initialForm);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [search, setSearch] = useState('');

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // --- Query (read) ---
  const queryParams = { page, limit, search: debouncedSearch };

  const query = useQuery({
    queryKey: keys.list(queryParams),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<PaginatedResponse<T>>(`${endpoint}?${params.toString()}`);
    },
  });

  const data = query.data?.data ?? [];
  const meta: PaginationMeta | null = query.data?.meta ?? null;

  // --- Mutations (write) ---
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.all });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: unknown }) => {
      if (payload.id) {
        return api.put(`${endpoint}/${payload.id}`, payload.data);
      }
      return api.post(endpoint, payload.data);
    },
    onSuccess: () => {
      invalidate();
      notify.success('Registro guardado correctamente');
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Error al guardar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      invalidate();
      notify.success('Registro desactivado');
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Error al eliminar');
    },
  });

  // --- Actions (same public API as before) ---
  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  }, [initialForm]);

  const openEdit = useCallback(
    (item: T) => {
      setEditing(item);
      setForm(
        transformForEdit ? transformForEdit(item) : (item as unknown as F),
      );
      setModalOpen(true);
    },
    [transformForEdit],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (editing) {
        const payload = transformForUpdate ? transformForUpdate(form) : form;
        saveMutation.mutate({ id: editing.id, data: payload });
      } else {
        const payload = transformForCreate ? transformForCreate(form) : form;
        saveMutation.mutate({ data: payload });
      }
    },
    [editing, form, transformForCreate, transformForUpdate, saveMutation],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await notify.confirm('¿Desactivar este registro?');
      if (!confirmed) return;
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const updateField = useCallback(
    <K extends keyof F>(field: K, value: F[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const goToPage = useCallback((p: number) => setPage(p), []);
  const changeLimit = useCallback((l: number) => {
    setLimit(l);
    setPage(1);
  }, []);

  return {
    // Data
    data,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    // Modal
    modalOpen,
    editing,
    form,
    saving: saveMutation.isPending || deleteMutation.isPending,
    setForm,
    updateField,
    openCreate,
    openEdit,
    closeModal,
    handleSubmit,
    handleDelete,
    reload: () => query.refetch(),
    // Pagination
    page,
    limit,
    search,
    setSearch,
    meta,
    goToPage,
    changeLimit,
  };
}
