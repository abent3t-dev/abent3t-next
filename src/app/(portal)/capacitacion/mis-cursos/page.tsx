'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';

interface Evidence {
  id: string;
  file_name: string;
  evidence_type: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  uploaded_at: string;
}

interface MyCourse {
  id: string;
  course_edition_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  profile_id: string;
  course_editions: {
    id: string;
    start_date: string;
    end_date: string;
    location: string | null;
    instructor: string | null;
    courses: {
      id: string;
      name: string;
      total_hours: number;
      cost: number;
      description: string | null;
      course_types: { id: string; name: string } | null;
      modalities: { id: string; name: string } | null;
      institutions: { id: string; name: string } | null;
    };
  };
}

interface EffectiveStatus {
  status: string;
  effectiveStatus: string;
  canFinish: boolean;
  canUploadEvidence: boolean;
  courseStarted: boolean;
  courseEnded: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; border: string; icon: string }> = {
  inscrito: { label: 'Inscrito', color: 'text-blue-700', bgColor: 'bg-blue-50', border: 'border-blue-200', icon: 'calendar' },
  en_curso: { label: 'En Curso', color: 'text-amber-700', bgColor: 'bg-amber-50', border: 'border-amber-200', icon: 'play' },
  completo: { label: 'Completado', color: 'text-emerald-700', bgColor: 'bg-emerald-50', border: 'border-emerald-200', icon: 'check' },
  pendiente_evidencia: { label: 'Pendiente Evidencia', color: 'text-orange-700', bgColor: 'bg-orange-50', border: 'border-orange-200', icon: 'upload' },
  cancelado: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-50', border: 'border-red-200', icon: 'x' },
};

const evidenceTypeLabels: Record<string, string> = {
  certificate: 'Certificado',
  attendance: 'Constancia de asistencia',
  assessment: 'Evaluación',
  other: 'Otro',
};

const verificationStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En revisión', color: 'text-amber-600', bg: 'bg-amber-50' },
  approved: { label: 'Aprobada', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  rejected: { label: 'Rechazada', color: 'text-red-600', bg: 'bg-red-50' },
};

const Icons = {
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  upload: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  file: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  play: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  office: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

function getEffectiveStatus(course: MyCourse): EffectiveStatus {
  const today = new Date().toISOString().split('T')[0];
  const startDate = course.course_editions?.start_date;
  const endDate = course.course_editions?.end_date;

  const courseStarted = startDate ? today >= startDate : false;
  const courseEnded = endDate ? today > endDate : false;

  let effectiveStatus = course.status;

  if (course.status === 'inscrito' && courseStarted) {
    effectiveStatus = 'en_curso';
  }

  if (['inscrito', 'en_curso'].includes(course.status) && courseEnded) {
    effectiveStatus = 'pendiente_evidencia';
  }

  const canFinish =
    ['inscrito', 'en_curso'].includes(course.status) &&
    courseStarted &&
    !courseEnded;

  const canUploadEvidence =
    effectiveStatus === 'pendiente_evidencia' ||
    course.status === 'pendiente_evidencia' ||
    course.status === 'completo';

  return {
    status: course.status,
    effectiveStatus,
    canFinish,
    canUploadEvidence,
    courseStarted,
    courseEnded,
  };
}

export default function MisCursosPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [evidences, setEvidences] = useState<Record<string, Evidence[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [finishingId, setFinishingId] = useState<string | null>(null);

  // Evidence upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<MyCourse | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<string>('certificate');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await api.get<MyCourse[]>(`/enrollments/profile/${user.id}`);
      setCourses(data);

      const evidencesMap: Record<string, Evidence[]> = {};
      for (const course of data) {
        try {
          const evs = await api.get<Evidence[]>(`/evidences/enrollment/${course.id}`);
          evidencesMap[course.id] = evs;
        } catch {
          evidencesMap[course.id] = [];
        }
      }
      setEvidences(evidencesMap);
    } catch {
      notify.error('Error al cargar tus cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishCourse = async (enrollmentId: string) => {
    const confirmed = await notify.confirm(
      '¿Confirmas que has terminado este curso? Después podrás subir tu evidencia (certificado, diploma, etc.)'
    );
    if (!confirmed) return;

    setFinishingId(enrollmentId);
    try {
      await api.put(`/enrollments/${enrollmentId}/finish`, {});
      notify.success('Curso finalizado. Ahora puedes subir tu evidencia.');
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      notify.error(error.message || 'Error al finalizar curso');
    } finally {
      setFinishingId(null);
    }
  };

  const openUploadModal = (course: MyCourse) => {
    setSelectedEnrollment(course);
    setUploadFile(null);
    setEvidenceType('certificate');
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!selectedEnrollment || !uploadFile) {
      notify.error('Selecciona un archivo');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('enrollment_id', selectedEnrollment.id);
      formData.append('evidence_type', evidenceType);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/evidences/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Error al subir evidencia');
      }

      notify.success('Evidencia subida correctamente. Será revisada por RRHH.');
      setShowUploadModal(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      notify.error(error.message || 'Error al subir evidencia');
    } finally {
      setUploading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const effective = getEffectiveStatus(course);
    if (filter === 'active') return ['inscrito', 'en_curso', 'pendiente_evidencia'].includes(effective.effectiveStatus);
    if (filter === 'completed') return effective.effectiveStatus === 'completo';
    return true;
  });

  // Estadísticas
  const activeCourses = courses.filter((c) => {
    const e = getEffectiveStatus(c);
    return ['inscrito', 'en_curso', 'pendiente_evidencia'].includes(e.effectiveStatus);
  }).length;

  const completedCourses = courses.filter((c) => getEffectiveStatus(c).effectiveStatus === 'completo').length;

  const totalHours = courses
    .filter((c) => getEffectiveStatus(c).effectiveStatus === 'completo')
    .reduce((acc, c) => acc + (c.course_editions?.courses?.total_hours || 0), 0);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">Cargando tus cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
          <p className="text-gray-500 mt-1">Seguimiento de tu capacitación profesional</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setFilter('active')}
            className={`p-5 rounded-xl transition-all text-left ${
              filter === 'active'
                ? 'bg-blue-50 shadow-lg ring-2 ring-blue-400'
                : 'bg-white/60 hover:bg-blue-50 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-blue-500">{Icons.play}</span>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Cursos Activos</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{activeCourses}</p>
            <p className="text-sm text-blue-500/70 mt-1">En progreso o pendientes</p>
          </button>

          <button
            onClick={() => setFilter('completed')}
            className={`p-5 rounded-xl transition-all text-left ${
              filter === 'completed'
                ? 'bg-emerald-50 shadow-lg ring-2 ring-emerald-400'
                : 'bg-white/60 hover:bg-emerald-50 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-emerald-500">{Icons.check}</span>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Completados</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{completedCourses}</p>
            <p className="text-sm text-emerald-500/70 mt-1">Cursos finalizados con éxito</p>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`p-5 rounded-xl transition-all text-left ${
              filter === 'all'
                ? 'bg-purple-50 shadow-lg ring-2 ring-purple-400'
                : 'bg-white/60 hover:bg-purple-50 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-purple-500">{Icons.clock}</span>
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Horas de Capacitación</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{totalHours}h</p>
            <p className="text-sm text-purple-500/70 mt-1">Acumuladas en cursos completados</p>
          </button>
        </div>

        {/* Courses List */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              {Icons.book}
            </div>
            <p className="text-gray-600 font-medium">
              {filter === 'active'
                ? 'No tienes cursos activos'
                : filter === 'completed'
                ? 'No tienes cursos completados'
                : 'No tienes cursos registrados'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Los cursos que te inscriban aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => {
              const courseData = course.course_editions?.courses;
              const edition = course.course_editions;
              const effective = getEffectiveStatus(course);
              const config = statusConfig[effective.effectiveStatus] || statusConfig.inscrito;
              const courseEvidences = evidences[course.id] || [];
              const hasApprovedEvidence = courseEvidences.some(e => e.verification_status === 'approved');

              return (
                <div
                  key={course.id}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${config.border}`}
                >
                  {/* Header con estado */}
                  <div className={`px-6 py-3 ${config.bgColor} border-b ${config.border} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                        {config.icon === 'check' && Icons.check}
                        {config.icon === 'play' && Icons.play}
                        {config.icon === 'upload' && Icons.upload}
                        {config.icon === 'calendar' && Icons.calendar}
                        {config.icon === 'x' && Icons.x}
                        {config.label}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        Inscrito el {formatDate(course.enrolled_at)}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      {effective.canFinish && (
                        <button
                          onClick={() => handleFinishCourse(course.id)}
                          disabled={finishingId === course.id}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {finishingId === course.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            Icons.check
                          )}
                          Finalizar Curso
                        </button>
                      )}
                      {effective.canUploadEvidence && (
                        <button
                          onClick={() => openUploadModal(course)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors text-sm font-medium"
                        >
                          {Icons.upload}
                          Subir Evidencia
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contenido principal */}
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      {/* Información del curso */}
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-gray-900 mb-3">
                          {courseData?.name || 'Curso sin nombre'}
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {/* Institución */}
                          {courseData?.institutions?.name && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-1 text-gray-500 mb-1">
                                {Icons.office}
                                <span className="text-xs">Institución</span>
                              </div>
                              <p className="font-medium text-gray-900 text-sm">{courseData.institutions.name}</p>
                            </div>
                          )}

                          {/* Modalidad */}
                          {courseData?.modalities?.name && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-1 text-gray-500 mb-1">
                                {Icons.book}
                                <span className="text-xs">Modalidad</span>
                              </div>
                              <p className="font-medium text-gray-900 text-sm">{courseData.modalities.name}</p>
                            </div>
                          )}

                          {/* Horas */}
                          <div className="bg-purple-50 rounded-lg p-3">
                            <div className="flex items-center gap-1 text-purple-600 mb-1">
                              {Icons.clock}
                              <span className="text-xs">Duración</span>
                            </div>
                            <p className="font-bold text-purple-700">{courseData?.total_hours || 0} horas</p>
                          </div>

                          {/* Tipo de curso */}
                          {courseData?.course_types?.name && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-1 text-gray-500 mb-1">
                                <span className="text-xs">Tipo</span>
                              </div>
                              <p className="font-medium text-gray-900 text-sm">{courseData.course_types.name}</p>
                            </div>
                          )}
                        </div>

                        {/* Fechas de la edición */}
                        {edition && (
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1.5">
                              {Icons.calendar}
                              <span>Inicio: {formatDate(edition.start_date)}</span>
                            </span>
                            {edition.end_date && (
                              <span className="flex items-center gap-1.5">
                                {Icons.calendar}
                                <span>Fin: {formatDate(edition.end_date)}</span>
                              </span>
                            )}
                            {edition.instructor && (
                              <span className="flex items-center gap-1.5">
                                {Icons.user}
                                <span>Instructor: {edition.instructor}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Evidencias */}
                    {courseEvidences.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          {Icons.file}
                          Evidencias subidas
                        </h4>
                        <div className="space-y-2">
                          {courseEvidences.map((ev) => {
                            const verConfig = verificationStatusConfig[ev.verification_status];
                            return (
                              <div
                                key={ev.id}
                                className={`flex items-center justify-between p-3 rounded-lg ${verConfig.bg}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-gray-500">{Icons.file}</div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{ev.file_name}</p>
                                    <p className="text-xs text-gray-500">
                                      {evidenceTypeLabels[ev.evidence_type] || ev.evidence_type}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-sm font-medium ${verConfig.color}`}>
                                    {verConfig.label}
                                  </span>
                                  {ev.verification_status === 'rejected' && ev.rejection_reason && (
                                    <p className="text-xs text-red-500 mt-1">{ev.rejection_reason}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {hasApprovedEvidence && effective.effectiveStatus !== 'completo' && (
                          <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                            <p className="text-sm text-emerald-700 flex items-center gap-2">
                              {Icons.check}
                              Tu evidencia fue aprobada. RRHH actualizará el estado de tu curso pronto.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && selectedEnrollment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Subir Evidencia</h2>
                <p className="text-blue-100 text-sm">Sube tu certificado o diploma del curso</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-900">
                    {selectedEnrollment.course_editions?.courses?.name}
                  </p>
                  {selectedEnrollment.course_editions?.courses?.total_hours && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedEnrollment.course_editions.courses.total_hours} horas
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de evidencia
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="certificate">Certificado</option>
                    <option value="attendance">Constancia de asistencia</option>
                    <option value="assessment">Evaluación</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archivo
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos: PDF, JPG, PNG, Word, Excel. Máximo 10MB.
                  </p>
                </div>

                {uploadFile && (
                  <div className="flex items-center gap-3 p-3 bg-[#52AF32]/10 rounded-xl">
                    {Icons.file}
                    <span className="text-sm text-[#52AF32] font-medium">{uploadFile.name}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2.5 bg-[#52AF32] text-white rounded-xl hover:bg-[#67B52E] disabled:opacity-50 flex items-center gap-2 font-medium"
                >
                  {uploading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{uploading ? 'Subiendo...' : 'Subir Evidencia'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
