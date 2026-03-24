export interface DashboardSummary {
  totalHours: number;
  totalSpent: number;
  activeCourses: number;
  totalEnrolled: number;
  completedCount: number;
  avgCompletionDays: number;
}

export interface DepartmentStats {
  department_id: string;
  department_name: string;
  totalHours: number;
  totalSpent: number;
  enrolledCount: number;
  completedCount: number;
  budgetAssigned: number;
  budgetRemaining: number;
}

export interface InstitutionStats {
  institution_id: string;
  institution_name: string;
  activeCourses: number;
  totalInvestment: number;
}

export interface CompletionTimeStats {
  modality: string;
  avgDays: number;
  minDays: number;
  maxDays: number;
  count: number;
}
