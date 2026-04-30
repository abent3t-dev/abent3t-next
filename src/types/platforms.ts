// =====================================================
// TIPOS PARA INTEGRACIÓN DE PLATAFORMAS (Crehana, etc.)
// =====================================================

export type PlatformType =
  | 'crehana'
  | 'udemy_business'
  | 'linkedin_learning'
  | 'coursera'
  | 'other';

export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type PlatformEnrollmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'expired';

export type SyncType = 'full' | 'incremental' | 'users' | 'courses' | 'progress';

// =====================================================
// INTEGRACIÓN DE PLATAFORMA
// =====================================================

export interface PlatformIntegration {
  id: string;
  institution_id: string;
  platform_type: PlatformType;
  api_url: string | null;
  organization_slug: string | null;
  public_key: string | null;
  has_private_key: boolean; // El backend no devuelve la clave, solo indica si existe
  sync_enabled: boolean;
  sync_frequency_hours: number;
  last_sync_at: string | null;
  last_sync_status: SyncStatus;
  last_sync_error: string | null;
  sso_enabled: boolean;
  sso_type: string | null;
  sso_config: Record<string, unknown> | null;
  configured_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relación con institución
  institutions: {
    id: string;
    name: string;
    type: string;
    platform_url: string | null;
    annual_cost: number;
  } | null;
}

export interface CreateIntegrationDto {
  institution_id: string;
  platform_type: PlatformType;
  api_url?: string;
  organization_slug?: string;
  public_key?: string;
  private_key?: string;
  sync_enabled?: boolean;
  sync_frequency_hours?: number;
  sso_enabled?: boolean;
  sso_type?: string;
  sso_config?: Record<string, unknown>;
}

export interface UpdateIntegrationDto extends Partial<CreateIntegrationDto> {}

// =====================================================
// CURSOS DE PLATAFORMA
// =====================================================

export interface PlatformCourse {
  id: string;
  platform_integration_id: string;
  external_course_id: string;
  external_track_id: string | null;
  name: string;
  description: string | null;
  instructor: string | null;
  language: string;
  total_hours: number;
  total_modules: number;
  total_lessons: number;
  course_type_id: string | null;
  modality_id: string | null;
  course_url: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  platform_integrations: {
    id: string;
    platform_type: PlatformType;
    institutions: { id: string; name: string } | null;
  } | null;
  course_types: { id: string; name: string } | null;
  modalities: { id: string; name: string } | null;
}

// =====================================================
// INSCRIPCIONES/PROGRESO EN PLATAFORMAS
// =====================================================

export interface PlatformEnrollment {
  id: string;
  platform_course_id: string;
  profile_id: string | null;
  external_enrollment_id: string | null;
  external_user_id: string;
  progress_percentage: number;
  status: PlatformEnrollmentStatus;
  enrolled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  hours_completed: number;
  modules_completed: number;
  lessons_completed: number;
  certificate_url: string | null;
  certificate_issued_at: string | null;
  last_synced_at: string;
  sync_error: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  platform_courses: {
    id: string;
    name: string;
    external_course_id: string;
    total_hours: number;
    thumbnail_url: string | null;
    course_url: string | null;
    platform_integrations: {
      id: string;
      platform_type: PlatformType;
      institutions: { id: string; name: string } | null;
    } | null;
  } | null;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    departments: { id: string; name: string } | null;
  } | null;
}

// =====================================================
// LOGS DE SINCRONIZACIÓN
// =====================================================

export interface PlatformSyncLog {
  id: string;
  platform_integration_id: string;
  sync_type: SyncType;
  status: SyncStatus;
  started_at: string;
  completed_at: string | null;
  courses_synced: number;
  enrollments_synced: number;
  users_synced: number;
  errors_count: number;
  error_details: Record<string, unknown> | null;
  sync_summary: Record<string, unknown> | null;
  triggered_by: string | null;
  created_at: string;
  // Relación con usuario que disparó
  profiles: {
    id: string;
    full_name: string;
  } | null;
}

// =====================================================
// RESUMEN DE PROGRESO
// =====================================================

export interface PlatformEnrollmentsSummary {
  total_enrollments: number;
  by_status: {
    not_started: number;
    in_progress: number;
    completed: number;
    expired: number;
  };
  total_hours_completed: number;
  average_progress: number;
  by_platform: Record<PlatformType, number>;
}

// =====================================================
// RESULTADO DE SINCRONIZACIÓN
// =====================================================

export interface SyncResult {
  success: boolean;
  sync_log_id: string;
  courses_synced: number;
  enrollments_synced: number;
  users_synced: number;
  errors: string[];
  summary: Record<string, unknown>;
}

// =====================================================
// RESULTADO DE TEST DE CONEXIÓN
// =====================================================

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// =====================================================
// HELPERS Y CONSTANTES
// =====================================================

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  crehana: 'Crehana',
  udemy_business: 'Udemy Business',
  linkedin_learning: 'LinkedIn Learning',
  coursera: 'Coursera',
  other: 'Otra',
};

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  failed: 'Fallida',
};

export const PLATFORM_ENROLLMENT_STATUS_LABELS: Record<PlatformEnrollmentStatus, string> = {
  not_started: 'No iniciado',
  in_progress: 'En progreso',
  completed: 'Completado',
  expired: 'Expirado',
};

export const SYNC_TYPE_LABELS: Record<SyncType, string> = {
  full: 'Completa',
  incremental: 'Incremental',
  users: 'Solo usuarios',
  courses: 'Solo cursos',
  progress: 'Solo progreso',
};

// Colores para estados de sincronización
export const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

// Colores para estados de progreso
export const PLATFORM_ENROLLMENT_STATUS_COLORS: Record<PlatformEnrollmentStatus, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
};

// =====================================================
// CREHANA — RESPUESTAS PARA EL FRONTEND
// (alimentan /capacitacion/crehana)
// =====================================================

export interface CrehanaDashboard {
  integration_active: boolean;
  total_users: number;
  users_linked_to_abent: number;
  total_courses: number;
  total_enrollments: number;
  completed_enrollments: number;
  in_progress_enrollments: number;
  not_started_enrollments: number;
  total_hours_completed: number;
  total_certificates: number;
  average_progress: number;
  last_sync_at: string | null;
  last_sync_status: SyncStatus | null;
}

export interface CrehanaCourseRow {
  id: string;
  external_course_id: string;
  name: string;
  total_hours: number;
  course_url: string | null;
  thumbnail_url: string | null;
  last_synced_at: string;
  total_enrollments: number;
  completed_enrollments: number;
  in_progress_enrollments: number;
  average_progress: number;
}

export interface CrehanaUserRow {
  external_user_id: string;
  external_email: string | null;
  external_username: string | null;
  is_linked: boolean;
  profile: {
    id: string;
    full_name: string;
    email: string;
    departments: { id: string; name: string } | null;
  } | null;
  last_synced_at: string;
  total_enrollments: number;
  completed_enrollments: number;
  in_progress_enrollments: number;
  total_hours_completed: number;
  total_certificates: number;
  average_progress: number;
  last_activity_at: string | null;
}

export interface CrehanaUserDetailEnrollment {
  id: string;
  platform_course_id: string;
  external_user_id: string;
  status: PlatformEnrollmentStatus;
  progress_percentage: number;
  hours_completed: number;
  enrolled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  certificate_url: string | null;
  certificate_issued_at: string | null;
  course: {
    id: string;
    external_course_id: string;
    name: string;
    total_hours: number;
    course_url: string | null;
    thumbnail_url: string | null;
  } | null;
}

export interface CrehanaUserDetail {
  user: {
    external_user_id: string;
    external_email: string | null;
    external_username: string | null;
    profile_id: string | null;
    last_synced_at: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
      position: string | null;
      departments: { id: string; name: string } | null;
    } | null;
  };
  enrollments: CrehanaUserDetailEnrollment[];
}
