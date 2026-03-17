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
