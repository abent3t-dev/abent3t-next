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
  chevronDown: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  money: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  building: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  location: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
  pending: 'bg-[#DFA922]/10 text-[#DFA922] border-[#DFA922]/30',
  paid: 'bg-[#52AF32]/10 text-[#52AF32] border-[#52AF32]/30',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  na: 'bg-[#424846]/10 text-[#424846] border-[#424846]/30',
};

const emptyCourseForm = {
  name: '',
  institution_id: '',
  course_type_id: '',
  modality_id: '',
  total_hours: 0,
  cost: 0,
  description: '',
};

const emptyEditionForm = {
  start_date: '',
  end_date: '',
  location: '',
  instructor: '',
  max_participants: '',
  prorate_cost: false,
  require_evidence_for_completion: true,
  // Campos de costo y pago por edición
  cost_override: '',
  payment_status: 'pending' as PaymentStatus,
  payment_reference: '',
  payment_date: '',
};

// Extended course with editions cache
interface CourseWithEditions extends Course {
  _editions?: CourseEdition[];
  _editionsLoaded?: boolean;
}

export default function CoursesPage() {
  const router = useRouter();

  // --- Courses state ---
  const [courses, setCourses] = useState<CourseWithEditions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyCourseForm);
  const [saving, setSaving] = useState(false);

  // --- Catalogs for selects ---
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);

  // --- Expanded courses (accordion) ---
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [editionsLoading, setEditionsLoading] = useState<string | null>(null);

  // --- Edition modal state ---
  const [editionModalOpen, setEditionModalOpen] = useState(false);
  const [editingEdition, setEditingEdition] = useState<CourseEdition | null>(null);
  const [editionForm, setEditionForm] = useState(emptyEditionForm);
  const [savingEdition, setSavingEdition] = useState(false);
  const [editionCourseId, setEditionCourseId] = useState<string | null>(null);

  // --- Load courses ---
  const loadCourses = useCallback(async () => {
    setLoading(true);
    const items = await api.get<Course[]>('/courses');
    setCourses(items.map(c => ({ ...c, _editions: [], _editionsLoaded: false })));
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

  // --- Toggle course expansion and load editions ---
  const toggleCourse = async (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }

    setExpandedCourseId(courseId);

    const course = courses.find(c => c.id === courseId);
    if (course && !course._editionsLoaded) {
      setEditionsLoading(courseId);
      const editions = await api.get<CourseEdition[]>(`/courses/${courseId}/editions`);
      setCourses(prev => prev.map(c =>
        c.id === courseId
          ? { ...c, _editions: editions, _editionsLoaded: true }
          : c
      ));
      setEditionsLoading(null);
    }
  };

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
      notify.success('Curso actualizado');
    } else {
      await api.post('/courses', payload);
      notify.success('Curso creado');
    }
    setSaving(false);
    setModalOpen(false);
    loadCourses();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await notify.confirm('¿Desactivar este curso?');
    if (!confirmed) return;
    await api.delete(`/courses/${id}`);
    notify.success('Curso desactivado');
    loadCourses();
    if (expandedCourseId === id) {
      setExpandedCourseId(null);
    }
  };

  // --- Edition CRUD ---
  const openAddEdition = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditionCourseId(courseId);
    setEditingEdition(null);
    setEditionForm(emptyEditionForm);
    setEditionModalOpen(true);
  };

  const openEditEdition = (courseId: string, edition: CourseEdition) => {
    setEditionCourseId(courseId);
    setEditingEdition(edition);
    setEditionForm({
      start_date: edition.start_date,
      end_date: edition.end_date || '',
      location: edition.location || '',
      instructor: edition.instructor || '',
      max_participants: edition.max_participants?.toString() || '',
      prorate_cost: edition.prorate_cost || false,
      require_evidence_for_completion: edition.require_evidence_for_completion ?? true,
      // Campos de pago
      cost_override: edition.cost_override?.toString() || '',
      payment_status: edition.payment_status || 'pending',
      payment_reference: edition.payment_reference || '',
      payment_date: edition.payment_date || '',
    });
    setEditionModalOpen(true);
  };

  const handleEditionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editionCourseId) return;
    setSavingEdition(true);
    const payload = {
      start_date: editionForm.start_date,
      end_date: editionForm.end_date || null,
      location: editionForm.location || null,
      instructor: editionForm.instructor || null,
      max_participants: editionForm.max_participants
        ? parseInt(editionForm.max_participants)
        : null,
      prorate_cost: editionForm.prorate_cost,
      require_evidence_for_completion: editionForm.require_evidence_for_completion,
      // Campos de pago por edición
      cost_override: editionForm.cost_override
        ? parseFloat(editionForm.cost_override)
        : null,
      payment_status: editionForm.payment_status,
      payment_reference: editionForm.payment_reference || null,
      payment_date: editionForm.payment_date || null,
    };
    if (editingEdition) {
      await api.put(`/courses/${editionCourseId}/editions/${editingEdition.id}`, payload);
      notify.success('Edición actualizada');
    } else {
      await api.post(`/courses/${editionCourseId}/editions`, payload);
      notify.success('Edición creada');
    }
    setSavingEdition(false);
    setEditionModalOpen(false);

    // Reload editions for this course
    const editions = await api.get<CourseEdition[]>(`/courses/${editionCourseId}/editions`);
    const activeCount = editions.filter(e => e.is_active).length;
    setCourses(prev => prev.map(c =>
      c.id === editionCourseId
        ? { ...c, _editions: editions, _editionsLoaded: true, active_editions_count: activeCount }
        : c
    ));
  };

  const handleDeleteEdition = async (courseId: string, editionId: string) => {
    const confirmed = await notify.confirm('¿Desactivar esta edición?');
    if (!confirmed) return;
    await api.delete(`/courses/${courseId}/editions/${editionId}`);
    notify.success('Edición desactivada');

    // Reload editions
    const editions = await api.get<CourseEdition[]>(`/courses/${courseId}/editions`);
    const activeCount = editions.filter(e => e.is_active).length;
    setCourses(prev => prev.map(c =>
      c.id === courseId
        ? { ...c, _editions: editions, _editionsLoaded: true, active_editions_count: activeCount }
        : c
    ));
  };

  // --- Filtered courses ---
  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.institutions?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.course_types?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const formatDate = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#424846]">Gestion de Cursos</h1>
        <p className="text-gray-500 mt-1">Administra cursos y sus ediciones</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {Icons.search}
            </span>
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            />
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 border-2 border-[#222D59] rounded-xl">
              <div className="w-8 h-8 bg-[#222D59]/10 rounded-lg flex items-center justify-center text-[#222D59]">
                {Icons.book}
              </div>
              <div>
                <p className="text-gray-500">Total cursos</p>
                <p className="font-semibold text-[#222D59]">{courses.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-2 border-[#52AF32] rounded-xl">
              <div className="w-8 h-8 bg-[#52AF32]/10 rounded-lg flex items-center justify-center text-[#52AF32]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500">Activos</p>
                <p className="font-semibold text-[#52AF32]">{courses.filter(c => c.is_active).length}</p>
              </div>
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors duration-200 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32]/50 focus:ring-offset-2"
          >
            {Icons.plus}
            <span>Nuevo Curso</span>
          </button>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando cursos...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {Icons.book}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No hay cursos</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'No se encontraron cursos con ese criterio' : 'Comienza agregando tu primer curso'}
          </p>
          {!searchTerm && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#52AF32]/50 focus:ring-offset-2"
            >
              {Icons.plus}
              <span>Agregar Curso</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const isExpanded = expandedCourseId === course.id;
            const isLoadingEditions = editionsLoading === course.id;
            const editions = course._editions || [];

            return (
              <div
                key={course.id}
                className={`bg-white rounded-xl shadow-sm border transition-all duration-200 ${
                  isExpanded ? 'border-[#52AF32]/50 ring-2 ring-[#52AF32]/20' : 'border-gray-200 hover:border-[#52AF32]/30 hover:shadow-md'
                }`}
              >
                {/* Course Card Header */}
                <div
                  onClick={() => toggleCourse(course.id)}
                  className="p-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Course Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        course.is_active ? 'bg-[#52AF32]/10 text-[#52AF32]' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {Icons.book}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-[#424846] truncate">{course.name}</h3>
                          {!course.is_active && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#424846]/10 text-[#424846] border border-[#424846]/30">
                              Inactivo
                            </span>
                          )}
                          {course.is_active && (course.active_editions_count ?? 0) === 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[#DFA922]/10 text-[#DFA922] border border-[#DFA922]/30">
                              {Icons.warning}
                              Sin ediciones
                            </span>
                          )}
                        </div>
                        {course.is_active && (course.active_editions_count ?? 0) === 0 && (
                          <p className="text-xs text-[#DFA922] mb-1 flex items-center gap-1">
                            No aparecera al jefe de area en solicitudes ni propuestas hasta agregar una edicion activa.
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          {course.institutions?.name && (
                            <span className="flex items-center gap-1">
                              {Icons.building}
                              {course.institutions.name}
                            </span>
                          )}
                          {course.course_types?.name && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {course.course_types.name}
                            </span>
                          )}
                          {course.modalities?.name && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                              {course.modalities.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Stats & Actions */}
                    <div className="flex items-center gap-6">
                      {/* Stats */}
                      <div className="hidden lg:flex items-center gap-4 text-sm">
                        <div className="text-center px-3">
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Horas</p>
                          <p className="font-semibold text-gray-900 flex items-center justify-center gap-1">
                            {Icons.clock}
                            {course.total_hours}h
                          </p>
                        </div>
                        <div className="text-center px-3 border-l border-gray-100">
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Costo</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(course.cost)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => openAddEdition(course.id, e)}
                          className="p-2 text-[#222D59] hover:bg-[#222D59]/10 rounded-lg transition-colors"
                          title="Agregar edicion"
                        >
                          {Icons.plus}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(course);
                          }}
                          className="p-2 text-[#52AF32] hover:bg-[#52AF32]/10 rounded-lg transition-colors"
                          title="Editar curso"
                        >
                          {Icons.edit}
                        </button>
                        <button
                          onClick={(e) => handleDelete(course.id, e)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Desactivar curso"
                        >
                          {Icons.trash}
                        </button>
                      </div>

                      {/* Expand Indicator */}
                      <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        {Icons.chevronDown}
                      </div>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="lg:hidden flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      {Icons.clock} {course.total_hours}h
                    </span>
                    <span className="flex items-center gap-1 text-gray-600">
                      {Icons.money} {formatCurrency(course.cost)}
                    </span>
                  </div>
                </div>

                {/* Editions Panel (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {/* Editions Header */}
                    <div className="px-5 py-3 flex items-center justify-between bg-[#424846] rounded-t-none">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Ediciones</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-white/20 text-white rounded-full">
                          {editions.length}
                        </span>
                      </div>
                      <button
                        onClick={(e) => openAddEdition(course.id, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors duration-200"
                      >
                        {Icons.plus}
                        <span>Nueva Edicion</span>
                      </button>
                    </div>

                    {/* Editions Content */}
                    <div className="p-4">
                      {isLoadingEditions ? (
                        <div className="py-8 text-center">
                          <div className="animate-spin w-6 h-6 border-3 border-[#52AF32] border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-sm text-gray-500">Cargando ediciones...</p>
                        </div>
                      ) : editions.length === 0 ? (
                        <div className="py-8 text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            {Icons.calendar}
                          </div>
                          <p className="text-gray-500 text-sm mb-3">No hay ediciones registradas</p>
                          <button
                            onClick={(e) => openAddEdition(course.id, e)}
                            className="text-sm text-[#52AF32] hover:text-[#67B52E] font-medium"
                          >
                            + Agregar primera edición
                          </button>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {editions.map((edition) => (
                            <div
                              key={edition.id}
                              className={`bg-white rounded-lg border p-4 transition-all ${
                                edition.is_active
                                  ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                  : 'border-red-100 bg-red-50/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                {/* Edition Info */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {/* Date range */}
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                                      {Icons.calendar}
                                      {formatDate(edition.start_date)}
                                      {edition.end_date && (
                                        <>
                                          <span className="text-gray-400">→</span>
                                          {formatDate(edition.end_date)}
                                        </>
                                      )}
                                    </span>

                                    {!edition.is_active && (
                                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#424846]/10 text-[#424846] border border-[#424846]/30">
                                        Inactiva
                                      </span>
                                    )}
                                  </div>

                                  {/* Edition details */}
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                    {edition.location && (
                                      <span className="flex items-center gap-1">
                                        {Icons.location}
                                        {edition.location}
                                      </span>
                                    )}
                                    {edition.instructor && (
                                      <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {edition.instructor}
                                      </span>
                                    )}
                                    {edition.max_participants && (
                                      <span className="flex items-center gap-1">
                                        {Icons.users}
                                        Máx. {edition.max_participants}
                                      </span>
                                    )}
                                    {/* Costo efectivo de la edición */}
                                    {(edition.cost_override !== null && edition.cost_override !== undefined) && (
                                      <span className="flex items-center gap-1 text-[#DFA922] font-medium">
                                        {Icons.money}
                                        {formatCurrency(edition.cost_override)}
                                      </span>
                                    )}
                                    {/* Estado de pago de la edición */}
                                    {edition.payment_status && (
                                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${paymentColors[edition.payment_status]}`}>
                                        {paymentLabels[edition.payment_status]}
                                      </span>
                                    )}
                                    {edition.prorate_cost && (
                                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#52AF32]/10 text-[#52AF32] border border-[#52AF32]/20">
                                        Prorrateo
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Edition Actions */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => router.push(`/courses/${course.id}/editions/${edition.id}/participants`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#222D59] bg-[#222D59]/10 hover:bg-[#222D59]/20 rounded-lg transition-colors"
                                  >
                                    {Icons.users}
                                    <span className="hidden sm:inline">Participantes</span>
                                  </button>
                                  <button
                                    onClick={() => openEditEdition(course.id, edition)}
                                    className="p-2 text-[#52AF32] hover:bg-[#52AF32]/10 rounded-lg transition-colors"
                                    title="Editar edicion"
                                  >
                                    {Icons.edit}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEdition(course.id, edition.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Desactivar edicion"
                                  >
                                    {Icons.trash}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Institución
          <select
            value={form.institution_id}
            onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          >
            <option value="">— Seleccionar —</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de curso
            <select
              value={form.course_type_id}
              onChange={(e) => setForm({ ...form, course_type_id: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            >
              <option value="">— Seleccionar —</option>
              {courseTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Modalidad
            <select
              value={form.modality_id}
              onChange={(e) => setForm({ ...form, modality_id: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            >
              <option value="">— Seleccionar —</option>
              {modalities.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
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
              onChange={(e) => setForm({ ...form, total_hours: parseInt(e.target.value) || 0 })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Costo (MXN)
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-gray-700">
          Descripción
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
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
            onChange={(e) => setEditionForm({ ...editionForm, start_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fecha fin
          <input
            type="date"
            value={editionForm.end_date}
            onChange={(e) => setEditionForm({ ...editionForm, end_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Ubicación
          <input
            type="text"
            value={editionForm.location}
            onChange={(e) => setEditionForm({ ...editionForm, location: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            placeholder="ej: Campus Monterrey, Sala Virtual"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Instructor
          <input
            type="text"
            value={editionForm.instructor}
            onChange={(e) => setEditionForm({ ...editionForm, instructor: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Máx. participantes
          <input
            type="number"
            min="1"
            value={editionForm.max_participants}
            onChange={(e) => setEditionForm({ ...editionForm, max_participants: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          />
        </label>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="prorate_cost"
            checked={editionForm.prorate_cost}
            onChange={(e) => setEditionForm({ ...editionForm, prorate_cost: e.target.checked })}
            className="mt-1 h-4 w-4 text-[#52AF32] border-gray-300 rounded focus:ring-[#52AF32]"
          />
          <label htmlFor="prorate_cost" className="text-sm text-gray-700">
            <span className="font-medium">Prorratear costo</span>
            <p className="text-gray-500 text-xs mt-0.5">
              Divide el costo del curso entre todos los participantes inscritos.
            </p>
          </label>
        </div>
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <input
            type="checkbox"
            id="require_evidence"
            checked={editionForm.require_evidence_for_completion}
            onChange={(e) => setEditionForm({ ...editionForm, require_evidence_for_completion: e.target.checked })}
            className="mt-1 h-4 w-4 text-[#DFA922] border-gray-300 rounded focus:ring-[#DFA922]"
          />
          <label htmlFor="require_evidence" className="text-sm text-gray-700">
            <span className="font-medium">Requerir evidencia para completar</span>
            <p className="text-gray-500 text-xs mt-0.5">
              Sin diploma/evidencia aprobada, el colaborador NO puede inscribirse en otro curso.
            </p>
          </label>
        </div>

        {/* Sección de Costo y Pago de la Edición */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            {Icons.money}
            Costo y Pago de esta Edición
          </h4>

          <label className="block text-sm font-medium text-gray-700 mb-3">
            Costo específico (opcional)
            <input
              type="number"
              step="0.01"
              min="0"
              value={editionForm.cost_override}
              onChange={(e) => setEditionForm({ ...editionForm, cost_override: e.target.value })}
              placeholder="Dejar vacío para usar costo del curso"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si esta edición tiene un costo diferente al del curso base
            </p>
          </label>

          <label className="block text-sm font-medium text-gray-700 mb-3">
            Estado de pago
            <select
              value={editionForm.payment_status}
              onChange={(e) => setEditionForm({ ...editionForm, payment_status: e.target.value as PaymentStatus })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            >
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="cancelled">Cancelado</option>
              <option value="na">N/A</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Referencia de pago
              <input
                type="text"
                value={editionForm.payment_reference}
                onChange={(e) => setEditionForm({ ...editionForm, payment_reference: e.target.value })}
                placeholder="Factura, transferencia..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Fecha de pago
              <input
                type="date"
                value={editionForm.payment_date}
                onChange={(e) => setEditionForm({ ...editionForm, payment_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
            </label>
          </div>
        </div>
      </CatalogModal>
    </div>
  );
}
