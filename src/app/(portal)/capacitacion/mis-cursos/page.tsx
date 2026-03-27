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
    courses: {
      id: string;
      name: string;
      total_hours: number;
      course_types: { name: string } | null;
      modalities: { name: string } | null;
      institutions: { name: string } | null;
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

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  inscrito: { label: 'Inscrito', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  en_curso: { label: 'En Curso', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  completo: { label: 'Completado', color: 'text-green-800', bgColor: 'bg-green-100' },
  pendiente_evidencia: { label: 'Pendiente Evidencia', color: 'text-orange-800', bgColor: 'bg-orange-100' },
  cancelado: { label: 'Cancelado', color: 'text-red-800', bgColor: 'bg-red-100' },
};

const evidenceTypeLabels: Record<string, string> = {
  certificate: 'Certificado',
  attendance: 'Constancia de asistencia',
  assessment: 'Evaluación',
  other: 'Otro',
};

const verificationStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En revisión', color: 'text-yellow-600' },
  approved: { label: 'Aprobada', color: 'text-green-600' },
  rejected: { label: 'Rechazada', color: 'text-red-600' },
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
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  // Si está inscrito y el curso ya comenzó, mostrar como "en_curso"
  if (course.status === 'inscrito' && courseStarted) {
    effectiveStatus = 'en_curso';
  }

  // Si el curso terminó y no ha finalizado manualmente, mostrar como "pendiente_evidencia"
  if (['inscrito', 'en_curso'].includes(course.status) && courseEnded) {
    effectiveStatus = 'pendiente_evidencia';
  }

  // Puede finalizar si el curso comenzó pero no ha terminado
  const canFinish =
    ['inscrito', 'en_curso'].includes(course.status) &&
    courseStarted &&
    !courseEnded;

  // Puede subir evidencia si está en pendiente_evidencia o completo
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

      // Load evidences for each enrollment
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
    } catch (err: any) {
      notify.error(err.message || 'Error al finalizar curso');
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
    } catch (err: any) {
      notify.error(err.message || 'Error al subir evidencia');
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

  const activeCourses = courses.filter((c) => {
    const e = getEffectiveStatus(c);
    return ['inscrito', 'en_curso', 'pendiente_evidencia'].includes(e.effectiveStatus);
  }).length;

  const completedCourses = courses.filter((c) => getEffectiveStatus(c).effectiveStatus === 'completo').length;

  const totalHours = courses
    .filter((c) => getEffectiveStatus(c).effectiveStatus === 'completo')
    .reduce((acc, c) => acc + (c.course_editions?.courses?.total_hours || 0), 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Cargando mis cursos...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
        <p className="text-gray-500">Seguimiento de tu capacitación</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Cursos Activos</p>
          <p className="text-2xl font-bold text-blue-600">{activeCourses}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Completados</p>
          <p className="text-2xl font-bold text-green-600">{completedCourses}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Horas de Capacitación</p>
          <p className="text-2xl font-bold text-purple-600">{totalHours}h</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos ({courses.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Activos ({activeCourses})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completados ({completedCourses})
        </button>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {filteredCourses.map((course) => {
          const courseData = course.course_editions?.courses;
          const edition = course.course_editions;
          const effective = getEffectiveStatus(course);
          const config = statusConfig[effective.effectiveStatus] || statusConfig.inscrito;
          const courseEvidences = evidences[course.id] || [];
          const hasApprovedEvidence = courseEvidences.some(e => e.verification_status === 'approved');

          return (
            <div key={course.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {courseData?.name || 'Curso sin nombre'}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
                      {courseData?.institutions?.name && (
                        <span>{courseData.institutions.name}</span>
                      )}
                      {courseData?.modalities?.name && (
                        <span>• {courseData.modalities.name}</span>
                      )}
                      {courseData?.total_hours && (
                        <span>• {courseData.total_hours}h</span>
                      )}
                    </div>
                    {edition && (
                      <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                        {Icons.clock}
                        <span>
                          {new Date(edition.start_date).toLocaleDateString('es-MX')} -{' '}
                          {new Date(edition.end_date).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {effective.canFinish && (
                    <button
                      onClick={() => handleFinishCourse(course.id)}
                      disabled={finishingId === course.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {finishingId === course.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        Icons.check
                      )}
                      <span>Finalizar Curso</span>
                    </button>
                  )}
                  {effective.canUploadEvidence && (
                    <button
                      onClick={() => openUploadModal(course)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      {Icons.upload}
                      <span>Subir Evidencia</span>
                    </button>
                  )}
                </div>

                {/* Evidences */}
                {courseEvidences.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Evidencias subidas</h4>
                    <div className="space-y-2">
                      {courseEvidences.map((ev) => {
                        const verConfig = verificationStatusConfig[ev.verification_status];
                        return (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              {Icons.file}
                              <div>
                                <p className="text-sm text-gray-900">{ev.file_name}</p>
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
                                <p className="text-xs text-red-500">{ev.rejection_reason}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {hasApprovedEvidence && effective.effectiveStatus !== 'completo' && (
                      <p className="mt-2 text-sm text-green-600">
                        Tu evidencia fue aprobada. RRHH actualizará el estado de tu curso.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No tienes cursos {filter === 'active' ? 'activos' : filter === 'completed' ? 'completados' : 'registrados'}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedEnrollment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Subir Evidencia</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {Icons.x}
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">
                  {selectedEnrollment.course_editions?.courses?.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de evidencia
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos: PDF, JPG, PNG, Word, Excel. Máximo 10MB.
                </p>
              </div>

              {uploadFile && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  {Icons.file}
                  <span className="text-sm text-blue-700">{uploadFile.name}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
  );
}
