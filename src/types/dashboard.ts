export interface KpiValue {
  value: number;
  formatted: string;
  subtitle: string;
}

export interface DashboardSummary {
  period: {
    id: string;
    label: string;
    year: number;
    semester: number | null;
  } | null;
  kpis: {
    budgetExecution: KpiValue;
    investmentPerEmployee: KpiValue;
    hoursPerEmployee: KpiValue;
    coverageRate: KpiValue;
    completionRate: KpiValue;
  };
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
