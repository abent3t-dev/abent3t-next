'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  PlatformIntegration,
  PlatformSyncLog,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
} from '@/types/platforms';

interface PlatformSyncLogsModalProps {
  open: boolean;
  onClose: () => void;
  integration: PlatformIntegration | null;
}

export default function PlatformSyncLogsModal({
  open,
  onClose,
  integration,
}: PlatformSyncLogsModalProps) {
  // Obtener logs de sincronización. Refetch al abrir (sin caché) y polling
  // cada 5s mientras haya algún sync en progreso para reflejar el resultado en vivo.
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['platform-sync-logs', integration?.id],
    queryFn: () => api.get<PlatformSyncLog[]>(`/platforms/${integration?.id}/sync-logs`),
    enabled: open && !!integration?.id,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const data = query.state.data as PlatformSyncLog[] | undefined;
      return data?.some((l) => l.status === 'in_progress') ? 5000 : false;
    },
  });

  if (!open || !integration) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              Historial de Sincronización
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              {integration.institutions?.name || 'Sin nombre'}
            </p>
          </div>

          <div className="px-6 py-5">

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52AF32]"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No hay registros de sincronización</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Fecha
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Tipo
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Resultados
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {new Date(log.started_at).toLocaleDateString('es-MX')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.started_at).toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                          <span className="capitalize">{log.sync_type}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              SYNC_STATUS_COLORS[log.status]
                            }`}
                          >
                            {SYNC_STATUS_LABELS[log.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">
                          <div className="flex flex-wrap gap-2">
                            {log.courses_synced > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                {log.courses_synced} cursos
                              </span>
                            )}
                            {log.users_synced > 0 && (
                              <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                {log.users_synced} usuarios
                              </span>
                            )}
                            {log.enrollments_synced > 0 && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                {log.enrollments_synced} inscripciones
                              </span>
                            )}
                            {log.errors_count > 0 && (
                              <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                                {log.errors_count} errores
                              </span>
                            )}
                          </div>
                          {log.error_details && (
                            <details className="mt-1">
                              <summary className="text-xs text-red-600 cursor-pointer">
                                Ver errores
                              </summary>
                              <pre className="mt-1 text-xs text-red-700 whitespace-pre-wrap max-w-xs overflow-x-auto">
                                {JSON.stringify(log.error_details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
