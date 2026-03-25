'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import type {
  Course,
  CourseEdition,
  Institution,
  CourseType,
  Modality,
  PaymentStatus,
} from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

const Icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

const paymentLabels: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Cancelado',
  na: 'N/A',
};

const paymentColors: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  na: 'bg-gray-100 text-gray-600',
};

const emptyCourseForm = {
  name: '',
  institution_id: '',
  course_type_id: '',
  modality_id: '',
  total_hours: 0,
  cost: 0,
  payment_status: 'pending' as PaymentStatus,
  description: '',
};

const emptyEditionForm = {
  start_date: '',
  end_date: '',
  location: '',
  instructor: '',
  max_participants: '',
};

export default function CoursesPage() {
  const router = useRouter();

  // --- Courses state ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyCourseForm);
  const [saving, setSaving] = useState(false);

  // --- Catalogs for selects ---
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);

  // --- Editions state ---
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const [editionModalOpen, setEditionModalOpen] = useState(false);
  const [editingEdition, setEditingEdition] = useState<CourseEdition | null>(null);
  const [editionForm, setEditionForm] = useState(emptyEditionForm);
  const [savingEdition, setSavingEdition] = useState(false);

  // --- Load courses ---
  const loadCourses = useCallback(async () => {
    setLoading(true);
    const items = await api.get<Course[]>('/courses');
    setCourses(items);
    setLoading(false);
  }, []);

  // --- Load catalogs for selects ---
  useEffect(() => {
    loadCourses();
    Promise.all([
      api.get<Institution[]>('/institutions'),
      api.get<CourseType[]>('/course-types'),
      api.get<Modality[]>('/modalities'),
    ]).then(([inst, ct, mod]) => {
      setInstitutions(inst.filter((i) => i.is_active));
      setCourseTypes(ct.filter((c) => c.is_active));
      setModalities(mod.filter((m) => m.is_active));
    });
  }, [loadCourses]);

  // --- Load editions when a course is selected ---
  const loadEditions = useCallback(async (courseId: string) => {
    setEditionsLoading(true);
    const items = await api.get<CourseEdition[]>(
      `/courses/${courseId}/editions`,
    );
    setEditions(items);
    setEditionsLoading(false);
  }, []);

  // --- Course CRUD ---
  const openAdd = () => {
    setEditing(null);
    setForm(emptyCourseForm);
    setModalOpen(true);
  };

  const openEdit = (item: Course) => {
    setEditing(item);
    setForm({
      name: item.name,
      institution_id: item.institution_id || '',
      course_type_id: item.course_type_id || '',
      modality_id: item.modality_id || '',
      total_hours: item.total_hours,
      cost: item.cost,
      payment_status: item.payment_status,
      description: item.description || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      institution_id: form.institution_id || null,
      course_type_id: form.course_type_id || null,
      modality_id: form.modality_id || null,
      description: form.description || null,
    };
    if (editing) {
      await api.put(`/courses/${editing.id}`, payload);
    } else {
      await api.post('/courses', payload);
    }
    setSaving(false);
    setModalOpen(false);
    loadCourses();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await notify.confirm('¿Desactivar este curso?');
    if (!confirmed) return;
    await api.delete(`/courses/${id}`);
    loadCourses();
    if (selectedCourse?.id === id) {
      setSelectedCourse(null);
      setEditions([]);
    }
  };

  // --- Edition CRUD ---
  const openCourseEditions = (course: Course) => {
    setSelectedCourse(course);
    loadEditions(course.id);
  };

  const openAddEdition = () => {
    setEditingEdition(null);
    setEditionForm(emptyEditionForm);
    setEditionModalOpen(true);
  };

  const openEditEdition = (edition: CourseEdition) => {
    setEditingEdition(edition);
    setEditionForm({
      start_date: edition.start_date,
      end_date: edition.end_date || '',
      location: edition.location || '',
      instructor: edition.instructor || '',
      max_participants: edition.max_participants?.toString() || '',
    });
    setEditionModalOpen(true);
  };

  const handleEditionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setSavingEdition(true);
    const payload = {
      start_date: editionForm.start_date,
      end_date: editionForm.end_date || null,
      location: editionForm.location || null,
      instructor: editionForm.instructor || null,
      max_participants: editionForm.max_participants
        ? parseInt(editionForm.max_participants)
        : null,
    };
    if (editingEdition) {
      await api.put(
        `/courses/${selectedCourse.id}/editions/${editingEdition.id}`,
        payload,
      );
    } else {
      await api.post(`/courses/${selectedCourse.id}/editions`, payload);
    }
    setSavingEdition(false);
    setEditionModalOpen(false);
    loadEditions(selectedCourse.id);
  };

  const handleDeleteEdition = async (editionId: string) => {
    if (!selectedCourse) return;
    const confirmed = await notify.confirm('¿Desactivar esta edición?');
    if (!confirmed) return;
    await api.delete(
      `/courses/${selectedCourse.id}/editions/${editionId}`,
    );
    loadEditions(selectedCourse.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Gestión de Cursos</h1>

      {/* --- Courses Table --- */}
      <CatalogTable
        title="Cursos"
        data={courses}
        columns={[
          { key: 'name', label: 'Nombre' },
          {
            key: 'institutions',
            label: 'Institución',
            render: (val) => {
              const inst = val as Course['institutions'];
              return inst?.name || '—';
            },
          },
          {
            key: 'course_types',
            label: 'Tipo',
            render: (val) => {
              const ct = val as Course['course_types'];
              return ct?.name || '—';
            },
          },
          {
            key: 'modalities',
            label: 'Modalidad',
            render: (val) => {
              const m = val as Course['modalities'];
              return m?.name || '—';
            },
          },
          {
            key: 'total_hours',
            label: 'Horas',
            render: (val) => `${val}h`,
          },
          {
            key: 'cost',
            label: 'Costo',
            render: (val) =>
              `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          },
          {
            key: 'payment_status',
            label: 'Pago',
            render: (val) => {
              const status = val as PaymentStatus;
              return (
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${paymentColors[status]}`}
                >
                  {paymentLabels[status]}
                </span>
              );
            },
          },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        loading={loading}
        extraAction={{
          label: 'Ediciones',
          onClick: openCourseEditions,
        }}
      />

      {/* --- Editions Panel --- */}
      {selectedCourse && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Ediciones: {selectedCourse.name}
              </h2>
              <p className="text-sm text-gray-500">
                Cohortes, fechas e instructores
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedCourse(null);
                  setEditions([]);
                }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Cerrar"
              >
                {Icons.x}
              </button>
              <button
                onClick={openAddEdition}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                {Icons.plus}
                <span>Agregar Edición</span>
              </button>
            </div>
          </div>

          {editionsLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Instructor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Máx. participantes
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
                {editions.map((ed) => (
                  <tr key={ed.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ed.start_date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ed.end_date || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ed.location || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ed.instructor || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ed.max_participants || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          ed.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ed.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() =>
                            router.push(
                              `/courses/${selectedCourse.id}/editions/${ed.id}/participants`,
                            )
                          }
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Participantes"
                        >
                          {Icons.users}
                        </button>
                        <button
                          onClick={() => openEditEdition(ed)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          {Icons.edit}
                        </button>
                        <button
                          onClick={() => handleDeleteEdition(ed.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Desactivar"
                        >
                          {Icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {editions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Sin ediciones registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --- Course Modal --- */}
      <CatalogModal
        title={editing ? 'Editar Curso' : 'Nuevo Curso'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <label className="block text-sm font-medium text-gray-700">
          Nombre del curso *
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Institución
          <select
            value={form.institution_id}
            onChange={(e) =>
              setForm({ ...form, institution_id: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Seleccionar —</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de curso
            <select
              value={form.course_type_id}
              onChange={(e) =>
                setForm({ ...form, course_type_id: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar —</option>
              {courseTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Modalidad
            <select
              value={form.modality_id}
              onChange={(e) =>
                setForm({ ...form, modality_id: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar —</option>
              {modalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-gray-700">
            Horas totales
            <input
              type="number"
              min="0"
              value={form.total_hours}
              onChange={(e) =>
                setForm({ ...form, total_hours: parseInt(e.target.value) || 0 })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Costo (MXN)
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cost}
              onChange={(e) =>
                setForm({
                  ...form,
                  cost: parseFloat(e.target.value) || 0,
                })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-gray-700">
          Estatus de pago
          <select
            value={form.payment_status}
            onChange={(e) =>
              setForm({
                ...form,
                payment_status: e.target.value as PaymentStatus,
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="cancelled">Cancelado</option>
            <option value="na">N/A</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Descripción
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </CatalogModal>

      {/* --- Edition Modal --- */}
      <CatalogModal
        title={editingEdition ? 'Editar Edición' : 'Nueva Edición'}
        open={editionModalOpen}
        onClose={() => setEditionModalOpen(false)}
        onSubmit={handleEditionSubmit}
        loading={savingEdition}
      >
        <label className="block text-sm font-medium text-gray-700">
          Fecha inicio *
          <input
            type="date"
            required
            value={editionForm.start_date}
            onChange={(e) =>
              setEditionForm({ ...editionForm, start_date: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fecha fin
          <input
            type="date"
            value={editionForm.end_date}
            onChange={(e) =>
              setEditionForm({ ...editionForm, end_date: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Ubicación
          <input
            type="text"
            value={editionForm.location}
            onChange={(e) =>
              setEditionForm({ ...editionForm, location: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ej: Campus Monterrey, Sala Virtual"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Instructor
          <input
            type="text"
            value={editionForm.instructor}
            onChange={(e) =>
              setEditionForm({ ...editionForm, instructor: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Máx. participantes
          <input
            type="number"
            min="1"
            value={editionForm.max_participants}
            onChange={(e) =>
              setEditionForm({
                ...editionForm,
                max_participants: e.target.value,
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </CatalogModal>
    </div>
  );
}
