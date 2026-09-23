'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile } from '@/lib/api';
import { notify } from '@/lib/notifications';
import type { PaginatedResponse } from '@/types/pagination';
import { ERP_ALIAS_SYSTEM_LABELS, ErpAlias, ErpAliasSystem } from '@/types/purchases';

/**
 * D6 (2026-09-23, Ingrid/Alfredo) — "Usuarios de SAP y Maximo": tabla de
 * equivalencias código del ERP → nombre, con alta/edición, baja, importación
 * desde CSV/Excel (columnas usuario, nombre; opcionales sistema y email) y
 * liga opcional a un perfil de la plataforma (así el aprobador de SAP/Maximo
 * queda ligado a su rol nivel 1/2/3 en Compras → Roles). Solo presentación:
 * los códigos se conservan; sin alias todo se ve como hoy.
 */

const PAGE_SIZE = 20;

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string;
}

interface ProfilesResponse {
  data: ProfileOption[];
}

interface FormState {
  id: string | null;
  system: ErpAliasSystem;
  code: string;
  display_name: string;
  profile_id: string;
}

const EMPTY_FORM: FormState = { id: null, system: 'maximo', code: '', display_name: '', profile_id: '' };

const QUERY_KEY = ['compras', 'erp-aliases'];

export default function ErpAliasesSection() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [system, setSystem] = useState<ErpAliasSystem | ''>('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState | null>(null);
  const [profileSearch, setProfileSearch] = useState('');
  const [importSystem, setImportSystem] = useState<ErpAliasSystem>('maximo');
  const [importing, setImporting] = useState(false);

  const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search) qs.set('search', search);
  if (system) qs.set('system', system);

  const listQ = useQuery({
    queryKey: [...QUERY_KEY, search, system, page],
    queryFn: () => api.get<PaginatedResponse<ErpAlias>>(`/compras/erp-aliases?${qs.toString()}`),
  });
  const profilesQ = useQuery({
    queryKey: ['compras-roles-users', 'picker', profileSearch],
    queryFn: () =>
      api.get<ProfilesResponse>(
        `/compras/usuarios/gestion?limit=20${profileSearch ? `&search=${encodeURIComponent(profileSearch)}` : ''}`,
      ),
    enabled: form !== null,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEY });
    // Las pantallas que muestran nombres cambian: dashboard, reportes, tablas.
    void qc.invalidateQueries({ queryKey: ['reportes'] });
    void qc.invalidateQueries({ queryKey: ['maximo-purchase-orders'] });
    void qc.invalidateQueries({ queryKey: ['maximo-requests'] });
    void qc.invalidateQueries({ queryKey: ['maximo-contracts'] });
    void qc.invalidateQueries({ queryKey: ['sap-purchase-orders'] });
    void qc.invalidateQueries({ queryKey: ['expediting'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (f: FormState) => {
      const body = {
        display_name: f.display_name.trim(),
        profile_id: f.profile_id || null,
      };
      if (f.id) return api.put<ErpAlias>(`/compras/erp-aliases/${f.id}`, body);
      return api.post<ErpAlias>('/compras/erp-aliases', { ...body, system: f.system, code: f.code.trim() });
    },
    onSuccess: () => {
      notify.success(form?.id ? 'Alias actualizado' : 'Alias creado');
      setForm(null);
      invalidate();
    },
    onError: (err: unknown) => notify.error(err instanceof Error ? err.message : 'No se pudo guardar'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/compras/erp-aliases/${id}`),
    onSuccess: () => {
      notify.success('Alias eliminado');
      invalidate();
    },
    onError: (err: unknown) => notify.error(err instanceof Error ? err.message : 'No se pudo eliminar'),
  });

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('system', importSystem);
      const result = await uploadFile<{ rows: number; created: number; updated: number; skipped: number; errors: string[] }>(
        '/compras/erp-aliases/import',
        fd,
      );
      notify.success(
        `Importación: ${result.created} nuevos, ${result.updated} actualizados, ${result.skipped} omitidos de ${result.rows} filas`,
      );
      if (result.errors.length > 0) {
        notify.error(`${result.errors.length} fila(s) con aviso: ${result.errors.slice(0, 3).join(' · ')}${result.errors.length > 3 ? ' …' : ''}`);
      }
      invalidate();
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : 'No se pudo importar el archivo');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const rows = listQ.data?.data ?? [];
  const meta = listQ.data?.meta;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#424846]">Usuarios de SAP y Maximo</h2>
          <p className="text-sm text-gray-500">
            Equivalencias usuario del ERP → nombre, para que aprobadores y solicitantes salgan con nombre en tablas,
            reportes y dashboard. Liga el usuario a un perfil para conectarlo con su nivel de aprobación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={importSystem}
            onChange={(e) => setImportSystem(e.target.value as ErpAliasSystem)}
            className="px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
            title="Sistema de los usuarios del archivo (si el archivo no trae la columna 'sistema')"
          >
            <option value="maximo">Archivo de Maximo</option>
            <option value="sap">Archivo de SAP</option>
          </select>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-[#52AF32] text-[#52AF32] bg-white hover:bg-[#52AF32]/10 disabled:opacity-50"
            title="CSV o Excel con columnas: usuario, nombre (opcionales: sistema, email)"
          >
            {importing ? 'Importando…' : 'Importar CSV / Excel'}
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-[#52AF32] text-white hover:bg-[#52AF32]/90"
          >
            + Agregar usuario
          </button>
        </div>
      </div>

      <div className="px-6 py-3 flex flex-wrap items-center gap-3 border-b border-gray-100">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por usuario o nombre..."
          className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
        />
        <select
          value={system}
          onChange={(e) => {
            setSystem(e.target.value as ErpAliasSystem | '');
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
        >
          <option value="">SAP y Maximo</option>
          <option value="sap">SAP</option>
          <option value="maximo">Maximo</option>
        </select>
        <span className="text-xs text-gray-500">
          Formato del archivo: columnas <code>usuario</code>, <code>nombre</code>; opcionales <code>sistema</code> (sap/maximo) y <code>email</code> del perfil.
        </span>
      </div>

      {form && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sistema</label>
              <select
                value={form.system}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, system: e.target.value as ErpAliasSystem })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 disabled:bg-gray-100"
              >
                <option value="maximo">Maximo</option>
                <option value="sap">SAP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Usuario en el ERP</label>
              <input
                type="text"
                value={form.code}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="CGAZB, AMMD1, jgonzalez…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Nombre a mostrar"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Perfil de la plataforma (opcional)</label>
              <input
                type="text"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                placeholder="Buscar por nombre o correo"
                className="w-full px-3 py-1.5 mb-1 text-xs border border-gray-300 rounded-lg text-gray-900"
              />
              <select
                value={form.profile_id}
                onChange={(e) => setForm({ ...form, profile_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
              >
                <option value="">Sin ligar</option>
                {(profilesQ.data?.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email} · {p.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!form.code.trim() || !form.display_name.trim()) {
                    notify.error('Usuario y nombre son obligatorios');
                    return;
                  }
                  saveMutation.mutate(form);
                }}
                disabled={saveMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#52AF32] text-white hover:bg-[#52AF32]/90 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {listQ.isLoading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : listQ.isError ? (
        <p className="p-6 text-sm text-red-600">No se pudieron cargar los usuarios de SAP/Maximo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#424846]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Sistema</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Perfil ligado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
                        row.system === 'sap' ? 'bg-[#222D59]/10 text-[#222D59]' : 'bg-[#DFA922]/20 text-[#8a6a10]'
                      }`}
                    >
                      {ERP_ALIAS_SYSTEM_LABELS[row.system]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[#222D59]">{row.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.display_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {row.profile ? (
                      <>
                        {row.profile.full_name ?? row.profile.email}
                        <span className="block text-xs text-gray-400">{row.profile.email}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            id: row.id,
                            system: row.system,
                            code: row.code,
                            display_name: row.display_name,
                            profile_id: row.profile_id ?? '',
                          })
                        }
                        className="text-sm text-[#52AF32] hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await notify.confirm(`¿Eliminar el alias de ${row.code}?`)) removeMutation.mutate(row.id);
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Aún no hay usuarios cargados. Importa la lista de Alfredo (Maximo) o agrégalos uno por uno.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Mostrando {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(page - 1)} disabled={!meta.hasPrev} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                <span className="text-sm text-gray-700">Página {meta.page} de {meta.totalPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={!meta.hasNext} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
