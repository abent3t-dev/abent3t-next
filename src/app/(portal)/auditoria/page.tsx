'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import Pagination from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/types/pagination';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  description: string | null;
  created_at: string;
}

interface AuditStats {
  total: number;
  by_action: Record<string, number>;
  by_entity: Record<string, number>;
}

interface AuditResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: 'Crear', color: 'bg-green-100 text-green-800' },
  update: { label: 'Actualizar', color: 'bg-blue-100 text-blue-800' },
  delete: { label: 'Eliminar', color: 'bg-red-100 text-red-800' },
  approve: { label: 'Aprobar', color: 'bg-emerald-100 text-emerald-800' },
  reject: { label: 'Rechazar', color: 'bg-orange-100 text-orange-800' },
  upload: { label: 'Subir', color: 'bg-purple-100 text-purple-800' },
  verify: { label: 'Verificar', color: 'bg-cyan-100 text-cyan-800' },
};

const entityLabels: Record<string, string> = {
  course: 'Curso',
  course_edition: 'Edición',
  enrollment: 'Inscripción',
  evidence: 'Evidencia',
  budget: 'Presupuesto',
  request: 'Solicitud',
  user: 'Usuario',
  proposal: 'Propuesta',
};

const Icons = {
  filter: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  refresh: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', paginationMeta.page.toString());
      params.set('limit', paginationMeta.limit.toString());
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity_type', entityFilter);
      if (dateFrom) params.set('start_date', dateFrom);
      if (dateTo) params.set('end_date', dateTo);

      const response = await api.get<AuditResponse>(
        `/audit?${params.toString()}`
      );
      setLogs(response.data);
      setPaginationMeta({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
        hasNext: response.page < response.totalPages,
        hasPrev: response.page > 1,
      });
    } catch {
      notify.error('Error al cargar bitácora');
    } finally {
      setLoading(false);
    }
  }, [paginationMeta.page, paginationMeta.limit, actionFilter, entityFilter, dateFrom, dateTo]);

  const loadStats = async () => {
    try {
      const data = await api.get<AuditStats>('/audit/stats');
      setStats(data);
    } catch {
      // Silent fail for stats
    }
  };

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStats();
  }, []);

  const handleFilter = () => {
    setPaginationMeta((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setDateFrom('');
    setDateTo('');
    setPaginationMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPaginationMeta((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPaginationMeta((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bitácora de Auditoría</h1>
          <p className="text-gray-500">Registro de acciones críticas del sistema</p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {Icons.refresh}
          <span>Actualizar</span>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total de acciones</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.by_action.create || 0}</div>
            <div className="text-sm text-gray-500">Creaciones</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.by_action.update || 0}</div>
            <div className="text-sm text-gray-500">Actualizaciones</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-emerald-600">
              {(stats.by_action.approve || 0) + (stats.by_action.verify || 0)}
            </div>
            <div className="text-sm text-gray-500">Aprobaciones</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-3">
          {Icons.filter}
          <span className="font-medium text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todas las acciones</option>
            {Object.entries(actionLabels).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todas las entidades</option>
            {Object.entries(entityLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Desde"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Hasta"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleFilter}
              className="flex-1 px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] text-sm"
            >
              Aplicar
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay registros de auditoría</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{log.user_name || 'Usuario'}</div>
                      <div className="text-xs text-gray-500">{log.user_role || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        actionLabels[log.action]?.color || 'bg-gray-100 text-gray-800'
                      }`}>
                        {actionLabels[log.action]?.label || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{entityLabels[log.entity_type] || log.entity_type}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]" title={log.entity_name || undefined}>
                        {log.entity_name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px] truncate" title={log.description || undefined}>
                      {log.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <Pagination
              meta={paginationMeta}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
