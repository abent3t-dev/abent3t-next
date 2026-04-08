// ==========================================
// TIPOS PARA MODULO DE COMPRAS
// ==========================================

// Estados de Requisicion (segun DB enum)
export type RequisitionStatus =
  | 'en_revision'
  | 'en_aprobacion'
  | 'aprobada'
  | 'en_progreso'
  | 'cerrada'
  | 'cancelada';

// Tipo de gasto
export type ExpenseType = 'CAPEX' | 'OPEX';

// Fuente de la requisicion
export type RequisitionSource = 'manual' | 'maximo' | 'sap';

// Estados del workflow de aprobacion
export type ApprovalWorkflowStatus = 'pendiente' | 'aprobado' | 'rechazado';

// Estados de aprobacion individual
export type ApprovalStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'esperando';

// Estados de PO
export type POStatus =
  | 'emitida'
  | 'en_transito'
  | 'entregada_parcial'
  | 'entregada_completa'
  | 'cancelada';

// Tipos de adquisicion
export type ProcurementType =
  | 'adjudicacion_directa'
  | 'licitacion_publica'
  | 'invitacion_restringida'
  | 'convenio_marco'
  | 'compra_consolidada';

// ==========================================
// INTERFACES
// ==========================================

// Proveedor
export interface Supplier {
  id: string;
  legal_name: string;
  commercial_name: string | null;
  tax_id: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  performance_score: number;
  is_blocked: boolean;
  blocked_reason: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Desempeno del proveedor
export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  performance_score: number;
  total_orders: number;
  delivered_orders: number;
  on_time_delivery_rate: number;
  total_amount: number;
  is_blocked: boolean;
}

// Tipo de compra
export interface PurchaseType {
  id: string;
  name: string;
  key: string;
  requires_contract: boolean;
  description: string | null;
  is_active: boolean;
}

// Dia festivo
export interface Holiday {
  id: string;
  holiday_date: string;
  description: string;
  is_active: boolean;
}

// Requisicion de compra
export interface Requisition {
  id: string;
  rq_number: string;
  description: string;
  requester_id: string;
  department_id: string | null;
  buyer_id: string | null;
  status: RequisitionStatus;
  expense_type: ExpenseType;
  source: RequisitionSource;
  external_id: string | null;
  estimated_amount: number;
  justification: string | null;
  created_date: string;
  required_date: string | null;
  closed_date: string | null;
  business_days_elapsed: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  requester?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  buyer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

// Historial de cambios de requisicion
export interface RequisitionHistory {
  id: string;
  requisition_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string;
  changed_by: string;
  changed_at: string;
  changed_by_user?: {
    id: string;
    full_name: string;
  } | null;
}

// Workflow de aprobaciones
export interface ApprovalWorkflow {
  id: string;
  requisition_id: string;
  current_level: number;
  status: ApprovalWorkflowStatus;
  started_at: string;
  completed_at: string | null;
  is_active: boolean;
  approvals?: Approval[];
  level_names?: Record<number, string>;
}

// Aprobacion individual
export interface Approval {
  id: string;
  workflow_id: string;
  level: number;
  approver_id: string;
  status: ApprovalStatus;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  time_to_approve: number | null;
  is_active: boolean;
  approver?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
  workflow?: ApprovalWorkflow & {
    requisition?: Requisition;
  };
}

// Orden de compra
export interface PurchaseOrder {
  id: string;
  po_number: string;
  requisition_id: string;
  supplier_id: string;
  contract_id: string | null;
  purchase_type_id: string | null;
  expense_type: ExpenseType;
  amount: number;
  currency: string;
  expected_delivery_date: string;
  actual_delivery_date: string | null;
  status: POStatus;
  notes: string | null;
  buyer_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  requisition?: {
    id: string;
    rq_number: string;
    description: string;
    expense_type: ExpenseType;
    requester_id: string;
  } | null;
  supplier?: {
    id: string;
    legal_name: string;
    commercial_name: string | null;
    tax_id: string;
    email: string | null;
  } | null;
  buyer?: {
    id: string;
    full_name: string;
  } | null;
  purchase_type?: {
    id: string;
    name: string;
    key: string;
  } | null;
}

// ==========================================
// ESTADISTICAS
// ==========================================

// Estadisticas de requisiciones
export interface RequisitionStats {
  total: number;
  by_status: Record<RequisitionStatus, number>;
  by_type: Record<ExpenseType, number>;
  total_estimated_amount: number;
  average_business_days: number;
}

// Estadisticas de aprobaciones por nivel
export interface ApprovalStats {
  [level: number]: {
    level: number;
    level_name: string;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    approval_rate: number;
    average_time_days: number;
    approver: {
      id: string;
      full_name: string;
      role: string;
    } | null;
  };
}

// Estadisticas de POs
export interface PurchaseOrderStats {
  total: number;
  total_amount: number;
  by_status: Record<POStatus, { count: number; amount: number }>;
  by_type: Record<ExpenseType, { count: number; amount: number }>;
  by_purchase_type: Record<string, { count: number; amount: number }>;
}

// ==========================================
// FILTROS
// ==========================================

export interface RequisitionFilters {
  status?: RequisitionStatus;
  expense_type?: ExpenseType;
  buyer_id?: string;
  requester_id?: string;
  department_id?: string;
  source?: RequisitionSource;
  date_from?: string;
  date_to?: string;
}

export interface PurchaseOrderFilters {
  status?: POStatus;
  supplier_id?: string;
  purchase_type_id?: string;
  expense_type?: ExpenseType;
  date_from?: string;
  date_to?: string;
}

// ==========================================
// LABELS PARA UI
// ==========================================

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  en_revision: 'En Revision',
  en_aprobacion: 'En Aprobacion',
  aprobada: 'Aprobada',
  en_progreso: 'En Progreso',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
};

export const REQUISITION_STATUS_COLORS: Record<RequisitionStatus, string> = {
  en_revision: 'blue',
  en_aprobacion: 'yellow',
  aprobada: 'green',
  en_progreso: 'yellow',
  cerrada: 'green',
  cancelada: 'red',
};

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  emitida: 'Emitida',
  en_transito: 'En Transito',
  entregada_parcial: 'Entregada Parcial',
  entregada_completa: 'Entregada Completa',
  cancelada: 'Cancelada',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  emitida: 'blue',
  en_transito: 'yellow',
  entregada_parcial: 'orange',
  entregada_completa: 'green',
  cancelada: 'red',
};

export const PROCUREMENT_TYPE_LABELS: Record<ProcurementType, string> = {
  adjudicacion_directa: 'Adjudicacion Directa',
  licitacion_publica: 'Licitacion Publica',
  invitacion_restringida: 'Invitacion Restringida',
  convenio_marco: 'Convenio Marco',
  compra_consolidada: 'Compra Consolidada',
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  CAPEX: 'CAPEX',
  OPEX: 'OPEX',
};

export const APPROVAL_LEVEL_NAMES: Record<number, string> = {
  1: 'Nivel 1 (David)',
  2: 'Nivel 2 (Gilberto)',
  3: 'Nivel 3 (Uriel)',
  4: 'Director General',
};
