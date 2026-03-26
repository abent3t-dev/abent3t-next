'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import type {
  TrainingRequest,
  RequestStatus,
  Course,
  CourseEdition,
  UserProfile,
} from '@/types/catalogs';

const Icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const statusLabels: Record<RequestStatus, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const statusColors: Record<RequestStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
};

export default function SolicitudesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_rh' || user?.role === 'super_admin';
  const isManager = user?.role === 'jefe_area' || user?.role === 'director';

  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');

  // Modal para crear solicitud
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedEdition, setSelectedEdition] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal para revisar solicitud (admin)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<TrainingRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'aprobada' | 'rechazada'>('aprobada');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Cargar solicitudes
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      let data: TrainingRequest[];
      if (isAdmin) {
        data = await api.get<TrainingRequest[]>('/requests');
      } else {
        data = await api.get<TrainingRequest[]>('/requests/my-requests');
      }
      setRequests(data);
    } catch {
      notify.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Cargar cursos para el modal de crear
  const loadCourses = async () => {
    const data = await api.get<Course[]>('/courses');
    setCourses(data.filter((c) => c.is_active));
  };

  // Cargar ediciones de un curso
  const loadEditions = async (courseId: string) => {
    const data = await api.get<CourseEdition[]>(`/courses/${courseId}/editions`);
    setEditions(data.filter((e) => e.is_active));
  };

  // Cargar colaboradores del departamento del jefe
  const loadCollaborators = async () => {
    if (!user?.department_id) return;
    // Endpoint /auth/my-team ya filtra por departamento y excluye al usuario actual
    const data = await api.get<UserProfile[]>('/auth/my-team');
    setCollaborators(data);
  };

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Abrir modal de crear
  const openCreateModal = async () => {
    await Promise.all([loadCourses(), loadCollaborators()]);
    setSelectedCourse('');
    setSelectedEdition('');
    setSelectedCollaborator('');
    setRequestReason('');
    setEditions([]);
    setCreateModalOpen(true);
  };

  // Cuando cambia el curso, cargar ediciones
  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedEdition('');
    if (courseId) {
      await loadEditions(courseId);
    } else {
      setEditions([]);
    }
  };

  // Crear solicitud
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEdition || !selectedCollaborator) {
      notify.error('Selecciona un curso, edición y colaborador');
      return;
    }

    setCreating(true);
    try {
      await api.post('/requests', {
        course_edition_id: selectedEdition,
        profile_id: selectedCollaborator,
        request_reason: requestReason || null,
      });
      notify.success('Solicitud creada exitosamente');
      setCreateModalOpen(false);
      loadRequests();
    } catch (err: any) {
      notify.error(err.message || 'Error al crear solicitud');
    } finally {
      setCreating(false);
    }
  };

  // Abrir modal de revisión
  const openReviewModal = (request: TrainingRequest, action: 'aprobada' | 'rechazada') => {
    setReviewingRequest(request);
    setReviewAction(action);
    setRejectionReason('');
    setReviewModalOpen(true);
  };

  // Revisar solicitud
  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRequest) return;

    if (reviewAction === 'rechazada' && !rejectionReason.trim()) {
      notify.error('Debes indicar el motivo del rechazo');
      return;
    }

    setReviewing(true);
    try {
      await api.put(`/requests/${reviewingRequest.id}/review`, {
        status: reviewAction,
        rejection_reason: reviewAction === 'rechazada' ? rejectionReason : undefined,
      });
      notify.success(
        reviewAction === 'aprobada'
          ? 'Solicitud aprobada - Inscripción creada'
          : 'Solicitud rechazada'
      );
      setReviewModalOpen(false);
      loadRequests();
    } catch (err: any) {
      notify.error(err.message || 'Error al procesar solicitud');
    } finally {
      setReviewing(false);
    }
  };

  // Cancelar solicitud (solo jefe_area, solo pendientes)
  const handleCancel = async (id: string) => {
    const confirmed = await notify.confirm('¿Cancelar esta solicitud?');
    if (!confirmed) return;

    try {
      await api.delete(`/requests/${id}`);
      notify.success('Solicitud cancelada');
      loadRequests();
    } catch (err: any) {
      notify.error(err.message || 'Error al cancelar');
    }
  };

  // Filtrar solicitudes
  const filteredRequests = requests.filter((r) =>
    filter === 'all' ? true : r.status === filter
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Capacitación</h1>
          <p className="text-gray-500">
            {isAdmin
              ? 'Gestiona las solicitudes de capacitación de todas las áreas'
              : 'Solicita cursos para los colaboradores de tu equipo'}
          </p>
        </div>
        {isManager && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {Icons.plus}
            <span>Nueva Solicitud</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('pendiente')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pendiente'
              ? 'bg-yellow-500 text-white'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter('aprobada')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'aprobada'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          Aprobadas
        </button>
        <button
          onClick={() => setFilter('rechazada')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'rechazada'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          Rechazadas
        </button>
      </div>

      {/* Tabla de solicitudes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay solicitudes {filter !== 'all' ? statusLabels[filter].toLowerCase() + 's' : ''}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Colaborador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Curso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Área
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Solicitante
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {req.profiles?.full_name || '—'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {req.profiles?.email || '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {req.course_editions?.courses?.name || '—'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {req.course_editions?.start_date || '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {req.profiles?.departments?.name || '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {req.requester?.full_name || '—'}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(req.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[req.status]}`}
                    >
                      {statusLabels[req.status]}
                    </span>
                    {req.status === 'rechazada' && req.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">{req.rejection_reason}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      {/* Admin puede aprobar/rechazar pendientes */}
                      {isAdmin && req.status === 'pendiente' && (
                        <>
                          <button
                            onClick={() => openReviewModal(req, 'aprobada')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Aprobar"
                          >
                            {Icons.check}
                          </button>
                          <button
                            onClick={() => openReviewModal(req, 'rechazada')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rechazar"
                          >
                            {Icons.x}
                          </button>
                        </>
                      )}
                      {/* Jefe puede cancelar sus pendientes */}
                      {isManager && req.status === 'pendiente' && (
                        <button
                          onClick={() => handleCancel(req.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Cancelar solicitud"
                        >
                          {Icons.x}
                        </button>
                      )}
                      {/* Si no hay acciones */}
                      {req.status !== 'pendiente' && (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear Solicitud */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Nueva Solicitud</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Curso *
                <select
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">— Seleccionar curso —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (${c.cost.toLocaleString()})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Edición *
                <select
                  value={selectedEdition}
                  onChange={(e) => setSelectedEdition(e.target.value)}
                  required
                  disabled={!selectedCourse}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                >
                  <option value="">— Seleccionar edición —</option>
                  {editions.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.start_date} {ed.instructor ? `- ${ed.instructor}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Colaborador *
                <select
                  value={selectedCollaborator}
                  onChange={(e) => setSelectedCollaborator(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">— Seleccionar colaborador —</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.position || 'Sin puesto'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Motivo de la solicitud
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={3}
                  placeholder="¿Por qué se solicita esta capacitación?"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Revisar Solicitud */}
      {reviewModalOpen && reviewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {reviewAction === 'aprobada' ? 'Aprobar' : 'Rechazar'} Solicitud
              </h2>
            </div>
            <form onSubmit={handleReview} className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Colaborador:</span>{' '}
                  {reviewingRequest.profiles?.full_name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Curso:</span>{' '}
                  {reviewingRequest.course_editions?.courses?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Área:</span>{' '}
                  {reviewingRequest.profiles?.departments?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Costo:</span> $
                  {reviewingRequest.course_editions?.courses?.cost?.toLocaleString()}
                </p>
                {reviewingRequest.request_reason && (
                  <p className="text-sm">
                    <span className="font-medium">Motivo:</span>{' '}
                    {reviewingRequest.request_reason}
                  </p>
                )}
              </div>

              {reviewAction === 'rechazada' && (
                <label className="block text-sm font-medium text-gray-700">
                  Motivo del rechazo *
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                    rows={3}
                    placeholder="Indica el motivo del rechazo"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </label>
              )}

              {reviewAction === 'aprobada' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                  Al aprobar esta solicitud, se inscribirá automáticamente al colaborador en el
                  curso y se actualizará el presupuesto del área.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                    reviewAction === 'aprobada'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewing
                    ? 'Procesando...'
                    : reviewAction === 'aprobada'
                    ? 'Aprobar Solicitud'
                    : 'Rechazar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
