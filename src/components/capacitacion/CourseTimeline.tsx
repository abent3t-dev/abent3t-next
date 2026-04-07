'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

type ViewMode = 'monthly' | 'quarterly' | 'yearly';

interface CourseTimelineProps {
  enrollments: Array<{
    id: string;
    status: string;
    enrolled_at: string;
    completed_at: string | null;
    course_editions: {
      start_date: string;
      end_date: string;
      courses: {
        name: string;
        total_hours: number;
        institutions: { name: string } | null;
      };
    };
  }>;
}

interface ProcessedCourse {
  id: string;
  name: string;
  institution: string;
  hours: number;
  startDate: Date;
  endDate: Date;
  status: string;
  effectiveStatus: string;
  hasConflict: boolean;
}

interface TooltipData {
  course: ProcessedCourse;
  position: { x: number; y: number };
}

const CourseTimeline: React.FC<CourseTimelineProps> = ({ enrollments }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [hoveredCourse, setHoveredCourse] = useState<TooltipData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate effective status based on dates
  const getEffectiveStatus = (
    status: string,
    startDate: Date,
    endDate: Date
  ): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status === 'cancelado') return 'cancelado';
    if (status === 'completo') return 'completo';
    if (status === 'pendiente_evidencia') return 'pendiente_evidencia';

    // Calculate based on dates
    if (today < startDate) return 'inscrito'; // Future
    if (today >= startDate && today <= endDate) return 'en_curso'; // Active
    if (today > endDate) return 'pendiente_evidencia'; // Past without completion

    return status;
  };

  // Check if two courses have date conflicts
  const hasConflict = (course1: ProcessedCourse, course2: ProcessedCourse): boolean => {
    return course1.startDate <= course2.endDate && course2.startDate <= course1.endDate;
  };

  // Process enrollments
  const processedCourses = useMemo(() => {
    const courses: ProcessedCourse[] = enrollments.map((enrollment) => {
      const startDate = new Date(enrollment.course_editions.start_date);
      const endDate = new Date(enrollment.course_editions.end_date);

      return {
        id: enrollment.id,
        name: enrollment.course_editions.courses.name,
        institution: enrollment.course_editions.courses.institutions?.name || 'Sin institución',
        hours: enrollment.course_editions.courses.total_hours,
        startDate,
        endDate,
        status: enrollment.status,
        effectiveStatus: getEffectiveStatus(enrollment.status, startDate, endDate),
        hasConflict: false,
      };
    });

    // Detect conflicts
    for (let i = 0; i < courses.length; i++) {
      for (let j = i + 1; j < courses.length; j++) {
        if (
          courses[i].effectiveStatus !== 'cancelado' &&
          courses[j].effectiveStatus !== 'cancelado' &&
          courses[i].effectiveStatus !== 'completo' &&
          courses[j].effectiveStatus !== 'completo' &&
          hasConflict(courses[i], courses[j])
        ) {
          courses[i].hasConflict = true;
          courses[j].hasConflict = true;
        }
      }
    }

    return courses;
  }, [enrollments]);

  // Filter courses by selected year
  const yearCourses = useMemo(() => {
    return processedCourses.filter(
      (course) =>
        course.startDate.getFullYear() === selectedYear ||
        course.endDate.getFullYear() === selectedYear ||
        (course.startDate.getFullYear() < selectedYear &&
          course.endDate.getFullYear() > selectedYear)
    );
  }, [processedCourses, selectedYear]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = yearCourses.length;
    const totalHours = yearCourses.reduce((sum, c) => sum + c.hours, 0);
    const active = yearCourses.filter((c) => c.effectiveStatus === 'en_curso').length;
    const future = yearCourses.filter((c) => c.effectiveStatus === 'inscrito').length;
    const conflicts = yearCourses.filter((c) => c.hasConflict).length;

    return { total, totalHours, active, future, conflicts };
  }, [yearCourses]);

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completo':
        return 'bg-green-500';
      case 'en_curso':
        return 'bg-yellow-500';
      case 'inscrito':
        return 'bg-blue-500';
      case 'cancelado':
        return 'bg-red-500';
      case 'pendiente_evidencia':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusGradient = (status: string): string => {
    switch (status) {
      case 'completo':
        return 'from-green-400 to-green-600';
      case 'en_curso':
        return 'from-yellow-400 to-yellow-600';
      case 'inscrito':
        return 'from-blue-400 to-blue-600';
      case 'cancelado':
        return 'from-red-400 to-red-600';
      case 'pendiente_evidencia':
        return 'from-orange-400 to-orange-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completo':
        return 'Completado';
      case 'en_curso':
        return 'En Curso';
      case 'inscrito':
        return 'Próximo';
      case 'cancelado':
        return 'Cancelado';
      case 'pendiente_evidencia':
        return 'Pendiente Evidencia';
      default:
        return status;
    }
  };

  // Generate time periods
  const timePeriods = useMemo(() => {
    if (viewMode === 'monthly') {
      return Array.from({ length: 12 }, (_, i) => ({
        label: new Date(selectedYear, i).toLocaleDateString('es-ES', { month: 'short' }),
        month: i,
      }));
    } else if (viewMode === 'quarterly') {
      return [
        { label: 'Q1', months: [0, 1, 2] },
        { label: 'Q2', months: [3, 4, 5] },
        { label: 'Q3', months: [6, 7, 8] },
        { label: 'Q4', months: [9, 10, 11] },
      ];
    } else {
      return [{ label: selectedYear.toString(), year: selectedYear }];
    }
  }, [viewMode, selectedYear]);

  // Calculate course position and width on timeline
  const getCoursePosition = (course: ProcessedCourse) => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);
    const yearDays = 365;

    const courseStart = course.startDate < yearStart ? yearStart : course.startDate;
    const courseEnd = course.endDate > yearEnd ? yearEnd : course.endDate;

    const startDays = Math.floor(
      (courseStart.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const durationDays = Math.floor(
      (courseEnd.getTime() - courseStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const left = (startDays / yearDays) * 100;
    const width = (durationDays / yearDays) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  // Get today's position
  const getTodayPosition = () => {
    const today = new Date();
    if (today.getFullYear() !== selectedYear) return null;

    const yearStart = new Date(selectedYear, 0, 1);
    const yearDays = 365;
    const dayOfYear = Math.floor(
      (today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (dayOfYear / yearDays) * 100;
  };

  const todayPosition = getTodayPosition();

  // Tooltip component with Portal
  const Tooltip = ({ course, position }: TooltipData) => {
    if (!mounted) return null;

    return createPortal(
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-4 min-w-[280px] max-w-[320px] whitespace-normal mb-3">
          <div className="font-semibold mb-3 text-sm">{course.name}</div>
          <div className="space-y-2 text-gray-200">
            <div className="flex justify-between">
              <span className="font-medium text-gray-400">Institución:</span>
              <span className="text-right ml-2">{course.institution}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-400">Inicio:</span>
              <span>{course.startDate.toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-400">Fin:</span>
              <span>{course.endDate.toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-400">Horas:</span>
              <span className="font-bold text-white">{course.hours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-400">Estado:</span>
              <span className="font-semibold text-white">
                {getStatusLabel(course.effectiveStatus)}
              </span>
            </div>
          </div>
          <div
            className="absolute left-1/2 transform -translate-x-1/2"
            style={{ bottom: '-8px' }}
          >
            <div className="border-8 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Línea de Tiempo de Capacitación</h2>

          {/* View Mode Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-[#52AF32] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setViewMode('quarterly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'quarterly'
                  ? 'bg-[#52AF32] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Trimestral
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'yearly'
                  ? 'bg-[#52AF32] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium mb-1">Total Cursos</div>
            <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium mb-1">Horas Totales</div>
            <div className="text-3xl font-bold text-purple-900">{stats.totalHours}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="text-sm text-yellow-600 font-medium mb-1">En Curso</div>
            <div className="text-3xl font-bold text-yellow-900">{stats.active}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium mb-1">Próximos</div>
            <div className="text-3xl font-bold text-green-900">{stats.future}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="text-sm text-red-600 font-medium mb-1">Conflictos</div>
            <div className="text-3xl font-bold text-red-900">{stats.conflicts}</div>
          </div>
        </div>
      </div>

      {/* Conflict Alert */}
      {stats.conflicts > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="text-red-800 font-semibold">
                Conflictos de horario detectados
              </h3>
              <p className="text-red-700 text-sm mt-1">
                Hay {stats.conflicts} curso{stats.conflicts !== 1 ? 's' : ''} con fechas que se
                empalman. Revisa los cursos marcados con borde rojo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Year Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setSelectedYear(selectedYear - 1)}
          className="p-2 rounded-lg bg-white shadow hover:bg-gray-50 transition-colors"
          aria-label="Año anterior"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-2xl font-bold text-gray-800 min-w-[100px] text-center">
          {selectedYear}
        </div>
        <button
          onClick={() => setSelectedYear(selectedYear + 1)}
          className="p-2 rounded-lg bg-white shadow hover:bg-gray-50 transition-colors"
          aria-label="Año siguiente"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto overflow-y-visible mt-8">
        {/* Timeline Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex">
            <div className="w-64 font-semibold text-gray-700">Curso</div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timePeriods.length}, 1fr)` }}>
              {timePeriods.map((period, idx) => (
                <div
                  key={idx}
                  className="text-center text-sm font-medium text-gray-600 border-l border-gray-200 px-2"
                >
                  {period.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="divide-y divide-gray-100 relative">
          {yearCourses.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium">No hay cursos en {selectedYear}</p>
            </div>
          ) : (
            yearCourses.map((course) => {
              const position = getCoursePosition(course);
              return (
                <div key={course.id} className="flex hover:bg-gray-50 transition-colors py-4">
                  {/* Course Info */}
                  <div className="w-64 p-4 border-r border-gray-100">
                    <div className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                      {course.name}
                    </div>
                    <div className="text-xs text-gray-500">{course.institution}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                          course.effectiveStatus
                        )} text-white`}
                      >
                        {getStatusLabel(course.effectiveStatus)}
                      </span>
                      {course.hasConflict && (
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 border border-red-300">
                          Conflicto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-1 py-6 px-4 relative overflow-visible">
                    <div className="relative h-10 overflow-visible">
                      {/* Grid Lines */}
                      <div
                        className="absolute inset-0 grid"
                        style={{ gridTemplateColumns: `repeat(${timePeriods.length}, 1fr)` }}
                      >
                        {timePeriods.map((_, idx) => (
                          <div key={idx} className="border-l border-gray-100" />
                        ))}
                      </div>

                      {/* Today Indicator */}
                      {todayPosition !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[#52AF32] z-10"
                          style={{ left: `${todayPosition}%` }}
                        >
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#52AF32] text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                            Hoy
                          </div>
                        </div>
                      )}

                      {/* Course Bar */}
                      <div
                        className={`absolute top-1/2 transform -translate-y-1/2 h-8 rounded-lg shadow-md transition-all hover:shadow-lg hover:scale-105 cursor-pointer ${
                          course.hasConflict ? 'ring-2 ring-red-500 ring-offset-2' : ''
                        }`}
                        style={position}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCourse({
                            course,
                            position: {
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            },
                          });
                        }}
                        onMouseLeave={() => setHoveredCourse(null)}
                      >
                        <div
                          className={`h-full rounded-lg bg-gradient-to-r ${getStatusGradient(
                            course.effectiveStatus
                          )} flex items-center justify-center text-white text-xs font-medium px-2`}
                        >
                          <span className="truncate">{course.hours}h</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Leyenda</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${getStatusColor('completo')}`} />
            <span className="text-sm text-gray-700">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${getStatusColor('en_curso')}`} />
            <span className="text-sm text-gray-700">En Curso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${getStatusColor('inscrito')}`} />
            <span className="text-sm text-gray-700">Próximo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${getStatusColor('pendiente_evidencia')}`} />
            <span className="text-sm text-gray-700">Pendiente Evidencia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${getStatusColor('cancelado')}`} />
            <span className="text-sm text-gray-700">Cancelado</span>
          </div>
        </div>
      </div>

      {/* Tooltip Portal */}
      {hoveredCourse && <Tooltip {...hoveredCourse} />}
    </div>
  );
};

export default CourseTimeline;
