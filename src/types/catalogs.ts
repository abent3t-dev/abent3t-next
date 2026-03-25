export interface Department {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  type: 'external' | 'platform' | 'internal';
  is_platform: boolean;
  annual_cost: number;
  platform_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseType {
  id: string;
  name: string;
  key: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Modality {
  id: string;
  name: string;
  key: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Period {
  id: string;
  year: number;
  semester: number | null;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'na';

export interface Course {
  id: string;
  name: string;
  institution_id: string | null;
  course_type_id: string | null;
  modality_id: string | null;
  total_hours: number;
  cost: number;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  payment_date: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  institutions: { id: string; name: string } | null;
  course_types: { id: string; name: string } | null;
  modalities: { id: string; name: string } | null;
}

export interface CourseEdition {
  id: string;
  course_id: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  instructor: string | null;
  max_participants: number | null;
  prorate_cost: boolean;
  require_evidence_for_completion: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  department_id: string;
  period_id: string;
  assigned_amount: number;
  consumed_amount: number;
  available_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments: { id: string; name: string } | null;
  periods: { id: string; label: string; year: number; semester: number } | null;
}

export type EnrollmentStatus =
  | 'inscrito'
  | 'en_curso'
  | 'completo'
  | 'pendiente_evidencia'
  | 'cancelado';

export interface CourseEnrollment {
  id: string;
  course_edition_id: string;
  profile_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    position: string | null;
    departments: { id: string; name: string } | null;
  } | null;
  course_editions: {
    id: string;
    course_id: string;
    start_date: string;
    end_date: string | null;
    max_participants: number | null;
    courses: { id: string; name: string } | null;
  } | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string | null;
  position: string | null;
  is_active: boolean;
  departments?: { id: string; name: string } | null;
}
