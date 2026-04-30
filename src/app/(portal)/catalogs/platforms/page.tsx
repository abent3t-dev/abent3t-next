'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { CAN_MANAGE_DATA } from '@/config/permissions';
import {
  PlatformIntegration,
  CreateIntegrationDto,
  ConnectionTestResult,
  PLATFORM_LABELS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
} from '@/types/platforms';
import { Institution } from '@/types/catalogs';
import PlatformIntegrationModal from '@/components/platforms/PlatformIntegrationModal';
import PlatformSyncLogsModal from '@/components/platforms/PlatformSyncLogsModal';

export default function PlatformsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...CAN_MANAGE_DATA);
  const queryClient = useQueryClient();

  // Estado de modales
  const [modalOpen, setModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<PlatformIntegration | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [startingSync, setStartingSync] = useState<string | null>(null);

  // Obtener integraciones. Auto-refetch cada 5s mientras alguna esté sincronizando,
  // para que la UI refleje cuando termine el sync en background.
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['platform-integrations'],
    queryFn: () => api.get<PlatformIntegration[]>('/platforms'),
    refetchInterval: (query) => {
      const data = query.state.data as PlatformIntegration[] | undefined;
      return data?.some((i) => i.last_sync_status === 'in_progress') ? 5000 : false;
    },
  });

  // Detectar transición in_progress → completed/failed para mostrar notificación final.
  const prevStatusRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const prev = prevStatusRef.current;
    const next: Record<string, string> = {};

    for (const integration of integrations) {
      const previous = prev[integration.id];
      const current = integration.last_sync_status;
      next[integration.id] = current;

      if (previous === 'in_progress' && current === 'completed') {
        notify.success(`Sincronización con ${integration.institutions?.name ?? 'la plataforma'} completada`);
      } else if (previous === 'in_progress' && current === 'failed') {
        notify.error(
          `Sincronización con ${integration.institutions?.name ?? 'la plataforma'} falló: ${integration.last_sync_error ?? 'error desconocido'}`,
        );
      }
    }

    prevStatusRef.current = next;
  }, [integrations]);

  // Obtener instituciones tipo "platform" para crear nuevas integraciones
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.get<Institution[]>('/institutions'),
    select: (data) => data.filter((i) => i.type === 'platform' && i.is_active),
  });

  // Instituciones disponibles (sin integración configurada)
  const availableInstitutions = institutions.filter(
    (inst) => !integrations.find((int) => int.institution_id === inst.id)
  );

  // Crear integración
  const createMutation = useMutation({
    mutationFn: (data: CreateIntegrationDto) => api.post<PlatformIntegration>('/platforms', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-integrations'] });
      notify.success('Integración creada correctamente');
      setModalOpen(false);
      setSelectedIntegration(null);
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Error al crear integración');
    },
  });

  // Actualizar integración
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateIntegrationDto> }) =>
      api.put<PlatformIntegration>(`/platforms/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-integrations'] });
      notify.success('Integración actualizada correctamente');
      setModalOpen(false);
      setSelectedIntegration(null);
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Error al actualizar integración');
    },
  });

  // Eliminar integración
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/platforms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-integrations'] });
      notify.success('Integración desactivada');
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Error al desactivar integración');
    },
  });

  // Probar conexión
  const handleTestConnection = async (id: string) => {
    setTestingConnection(id);
    try {
      const result = await api.post<ConnectionTestResult>(`/platforms/${id}/test-connection`, {});
      if (result.success) {
        notify.success(result.message);
      } else {
        notify.error(result.message);
      }
    } catch {
      notify.error('Error al probar conexión');
    } finally {
      setTestingConnection(null);
    }
  };

  // Iniciar sincronización (fire-and-forget). El backend procesa en background
  // y la UI detecta el fin del sync vía polling automático cada 5s.
  const handleSync = async (id: string) => {
    setStartingSync(id);
    try {
      await api.post<{ status: string; sync_log_id: string; message: string }>(
        `/platforms/${id}/sync`,
        { sync_type: 'full' },
      );
      notify.info('Sincronización iniciada en segundo plano. Esto puede tardar varios minutos.');
      queryClient.invalidateQueries({ queryKey: ['platform-integrations'] });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al iniciar sincronización';
      notify.error(msg);
    } finally {
      setStartingSync(null);
    }
  };

  // Abrir modal de crear
  const handleCreate = () => {
    setSelectedIntegration(null);
    setModalOpen(true);
  };

  // Abrir modal de editar
  const handleEdit = (integration: PlatformIntegration) => {
    setSelectedIntegration(integration);
    setModalOpen(true);
  };

  // Abrir modal de logs
  const handleViewLogs = (integration: PlatformIntegration) => {
    setSelectedIntegration(integration);
    setLogsModalOpen(true);
  };

  // Eliminar
  const handleDelete = async (id: string) => {
    if (confirm('¿Deseas desactivar esta integración?')) {
      deleteMutation.mutate(id);
    }
  };

  // Submit del modal
  const handleSubmit = (data: CreateIntegrationDto) => {
    if (selectedIntegration) {
      updateMutation.mutate({ id: selectedIntegration.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plataformas de E-Learning</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura la integración con plataformas externas como Crehana, Udemy, etc.
          </p>
        </div>
        {canEdit && availableInstitutions.length > 0 && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-md hover:bg-[#67B52E] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Integración
          </button>
        )}
      </div>

      {/* Info si no hay instituciones tipo platform */}
      {institutions.length === 0 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No hay instituciones de tipo &quot;Plataforma&quot; configuradas.
            Primero crea una institución con tipo &quot;Plataforma&quot; en{' '}
            <a href="/catalogs/institutions" className="underline font-medium">
              Catálogos → Instituciones
            </a>
          </p>
        </div>
      )}

      {/* Lista de integraciones */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52AF32]"></div>
        </div>
      ) : integrations.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-gray-500">No hay integraciones configuradas</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const isSyncing = integration.last_sync_status === 'in_progress';
            return (
            <div
              key={integration.id}
              className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {integration.institutions?.name || 'Sin nombre'}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      {PLATFORM_LABELS[integration.platform_type]}
                    </span>
                  </div>
                  {/* Estado de sincronización */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      SYNC_STATUS_COLORS[integration.last_sync_status]
                    }`}
                  >
                    {isSyncing && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}
                    {SYNC_STATUS_LABELS[integration.last_sync_status]}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sync cada {integration.sync_frequency_hours}h
                    {integration.sync_enabled ? (
                      <span className="text-green-600">(activo)</span>
                    ) : (
                      <span className="text-gray-400">(inactivo)</span>
                    )}
                  </div>
                  {integration.last_sync_at && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Última: {new Date(integration.last_sync_at).toLocaleString('es-MX')}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Credenciales: {integration.has_private_key ? (
                      <span className="text-green-600">Configuradas</span>
                    ) : (
                      <span className="text-red-600">Faltan</span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => handleTestConnection(integration.id)}
                    disabled={testingConnection === integration.id || isSyncing}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    {testingConnection === integration.id ? 'Probando...' : 'Probar'}
                  </button>
                  <button
                    onClick={() => handleSync(integration.id)}
                    disabled={
                      startingSync === integration.id ||
                      isSyncing ||
                      !integration.has_private_key
                    }
                    className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {(startingSync === integration.id || isSyncing) && (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {startingSync === integration.id
                      ? 'Iniciando...'
                      : isSyncing
                        ? 'Sincronizando...'
                        : 'Sincronizar'}
                  </button>
                  <button
                    onClick={() => handleViewLogs(integration)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    title="Ver historial"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleEdit(integration)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(integration.id)}
                        className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
                        title="Desactivar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal de crear/editar */}
      <PlatformIntegrationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedIntegration(null);
        }}
        onSubmit={handleSubmit}
        integration={selectedIntegration}
        institutions={selectedIntegration ? institutions : availableInstitutions}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Modal de logs */}
      <PlatformSyncLogsModal
        open={logsModalOpen}
        onClose={() => {
          setLogsModalOpen(false);
          setSelectedIntegration(null);
        }}
        integration={selectedIntegration}
      />
    </div>
  );
}
