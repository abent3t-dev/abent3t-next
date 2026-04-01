'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import type {
  CourseEnrollment,
  EnrollmentStatus,
  Course,
  CourseEdition,
  Department,
  UserProfile,
} from '@/types/catalogs';
import { EvidenceModal } from '@/components/evidences/EvidenceModal';

const Icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  ban: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  arrowLeft: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  file: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const statusLabels: Record<EnrollmentStatus, string> = {
  inscrito: 'Inscrito',
  en_curso: 'En Curso',
  completo: 'Completo',
  pendiente_evidencia: 'Pendiente Evidencia',
  cancelado: 'Cancelado',
};

const statusColors: Record<EnrollmentStatus, string> = {
  inscrito: 'bg-blue-100 text-blue-800',
  en_curso: 'bg-yellow-100 text-yellow-800',
  completo: 'bg-green-100 text-green-800',
  pendiente_evidencia: 'bg-orange-100 text-orange-800',
  cancelado: 'bg-red-100 text-red-800',
};

// Etiquetas de roles en español
const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_rh: 'Admin RRHH',
  jefe_area: 'Jefe de Área',
  director: 'Director',
  colaborador: 'Colaborador',
  collaborator: 'Colaborador',
  executive: 'Ejecutivo',
};

// Roles activos en el sistema (solo estos se muestran en filtros)
const activeRoles = ['admin_rh', 'jefe_area', 'colaborador'];

// Colores para badges de roles
const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border border-purple-200',
  admin_rh: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  jefe_area: 'bg-blue-100 text-blue-800 border border-blue-200',
  director: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  colaborador: 'bg-green-100 text-green-800 border border-green-200',
  collaborator: 'bg-green-100 text-green-800 border border-green-200',
  executive: 'bg-orange-100 text-orange-800 border border-orange-200',
};

// Semáforo visual: colores de círculo indicador
const trafficLightColors: Record<EnrollmentStatus, string> = {
  inscrito: 'bg-blue-500',      // Azul: recién inscrito
  en_curso: 'bg-yellow-500',    // Amarillo: en progreso
  completo: 'bg-green-500',     // Verde: completado
  pendiente_evidencia: 'bg-orange-500', // Naranja: falta evidencia
  cancelado: 'bg-red-500',      // Rojo: cancelado
};

export default function ParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const editionId = params.editionId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [edition, setEdition] = useState<CourseEdition | null>(null);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Status edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<EnrollmentStatus>('inscrito');

  // Evidence modal
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<CourseEnrollment | null>(null);

  const openEvidenceModal = (enrollment: CourseEnrollment) => {
    setSelectedEnrollment(enrollment);
    setEvidenceModalOpen(true);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [courseData, editionsData, enrollmentsData] = await Promise.all([
        api.get<Course>(`/courses/${courseId}`),
        api.get<CourseEdition[]>(`/courses/${courseId}/editions`),
        api.get<CourseEnrollment[]>(`/enrollments/edition/${editionId}`),
      ]);
      setCourse(courseData);
      const ed = editionsData.find((e) => e.id === editionId);
      setEdition(ed || null);
      setEnrollments(enrollmentsData);
    } catch (error) {
      notify.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [courseId, editionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openSelector = async () => {
    setSelectorOpen(true);
    setSelectedUsers([]);
    setSearch('');
    setSelectedDept('');
    setSelectedRole('');

    const [usersData, deptsData] = await Promise.all([
      api.get<UserProfile[]>('/auth/users?is_active=true'),
      api.get<Department[]>('/departments'),
    ]);
    setUsers(usersData);
    setDepartments(deptsData.filter((d) => d.is_active));
  };

  const enrolledIds = enrollments.map((e) => e.profile_id);

  const filteredUsers = users.filter((u) => {
    if (enrolledIds.includes(u.id)) return false;
    if (selectedDept && u.department_id !== selectedDept) return false;
    if (selectedRole && u.role !== selectedRole) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const selectAll = () => {
    const allIds = filteredUsers.map((u) => u.id);
    setSelectedUsers(allIds);
  };

  const handleEnroll = async () => {
    if (selectedUsers.length === 0) return;
    setSaving(true);
    try {
      if (selectedUsers.length === 1) {
        await api.post('/enrollments', {
          course_edition_id: editionId,
          profile_id: selectedUsers[0],
        });
      } else {
        await api.post('/enrollments/bulk', {
          course_edition_id: editionId,
          profile_ids: selectedUsers,
        });
      }
      setSelectorOpen(false);
      notify.success('Participantes inscritos correctamente');
      loadData();
    } catch (error) {
      notify.error('Error al inscribir participantes');
    } finally {
      setSaving(false);
    }
  };

  const openStatusEdit = (enrollment: CourseEnrollment) => {
    setEditingId(enrollment.id);
    setEditingStatus(enrollment.status);
  };

  const saveStatus = async () => {
    if (!editingId) return;
    try {
      await api.put(`/enrollments/${editingId}`, { status: editingStatus });
      setEditingId(null);
      notify.success('Estado actualizado');
      loadData();
    } catch (error) {
      notify.error('Error al actualizar estado');
    }
  };

  const cancelEnrollment = async (id: string) => {
    const confirmed = await notify.confirm('¿Cancelar esta inscripción?');
    if (!confirmed) return;
    try {
      await api.delete(`/enrollments/${id}`);
      notify.success('Inscripción cancelada');
      loadData();
    } catch (error) {
      notify.error('Error al cancelar inscripción');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/courses')}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            {Icons.arrowLeft}
            <span>Volver a Cursos</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Participantes: {course?.name}
          </h1>
          <p className="text-gray-500">
            Edición: {edition?.start_date}
            {edition?.end_date && ` - ${edition.end_date}`}
            {edition?.max_participants && ` | Máx: ${edition.max_participants}`}
          </p>
        </div>
        <button
          onClick={openSelector}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {Icons.plus}
          <span>Agregar Participantes</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Inscritos</p>
          <p className="text-2xl font-bold text-gray-900">{enrollments.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">En Curso</p>
          <p className="text-2xl font-bold text-yellow-600">
            {enrollments.filter((e) => e.status === 'en_curso').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Completados</p>
          <p className="text-2xl font-bold text-green-600">
            {enrollments.filter((e) => e.status === 'completo').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Pendiente Evidencia</p>
          <p className="text-2xl font-bold text-orange-600">
            {enrollments.filter((e) => e.status === 'pendiente_evidencia').length}
          </p>
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Participante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Área
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estatus
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fecha Inscripción
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {enrollment.profiles?.full_name || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {enrollment.profiles?.email || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {enrollment.profiles?.departments?.name || '—'}
                </td>
                <td className="px-6 py-4 text-sm">
                  {editingId === enrollment.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingStatus}
                        onChange={(e) =>
                          setEditingStatus(e.target.value as EnrollmentStatus)
                        }
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={saveStatus}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${trafficLightColors[enrollment.status]}`}
                        title={`Semáforo: ${statusLabels[enrollment.status]}`}
                      />
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer ${statusColors[enrollment.status]}`}
                        onClick={() => openStatusEdit(enrollment)}
                        title="Click para cambiar estatus"
                      >
                        {statusLabels[enrollment.status]}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(enrollment.enrolled_at).toLocaleDateString('es-MX')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEvidenceModal(enrollment)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver/Subir evidencias"
                    >
                      {Icons.file}
                    </button>
                    <button
                      onClick={() => cancelEnrollment(enrollment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancelar inscripción"
                    >
                      {Icons.ban}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay participantes inscritos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selector Modal */}
      {selectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Agregar Participantes
              </h3>
              <button
                onClick={() => setSelectorOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {Icons.x}
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas las áreas</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los roles</option>
                  {activeRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {filteredUsers.length} disponibles | {selectedUsers.length}{' '}
                  seleccionados
                </span>
                <button
                  onClick={selectAll}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Seleccionar todos
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}
                        >
                          {roleLabels[user.role] || user.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                        {user.departments && (
                          <span className="ml-1">
                            • {user.departments.name}
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No hay usuarios disponibles
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setSelectorOpen(false)}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnroll}
                disabled={selectedUsers.length === 0 || saving}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {saving
                  ? 'Inscribiendo...'
                  : `Inscribir ${selectedUsers.length} participante(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {selectedEnrollment && (
        <EvidenceModal
          enrollmentId={selectedEnrollment.id}
          participantName={selectedEnrollment.profiles?.full_name || 'Participante'}
          courseName={course?.name || 'Curso'}
          isOpen={evidenceModalOpen}
          onClose={() => {
            setEvidenceModalOpen(false);
            setSelectedEnrollment(null);
          }}
          canValidate={true}
        />
      )}
    </div>
  );
}
