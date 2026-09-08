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
  | 'borrador'
  | 'enviada'
  | 'confirmada'
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
  borrador: 'Borrador',
  enviada: 'Enviada',
  confirmada: 'Confirmada',
  en_transito: 'En Transito',
  entregada_parcial: 'Entregada Parcial',
  entregada_completa: 'Entregada Completa',
  cancelada: 'Cancelada',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  borrador: 'gray',
  enviada: 'blue',
  confirmada: 'indigo',
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

// ==========================================
// INTEGRACION MAXIMO (Fase INT-5) — lectura de staging
// Fuente: GET /maximo/* (dominio) y GET /integrations/maximo/* (sync Int-3).
// Los campos son snake_case como los entrega la API; null = dato que Maximo
// no trae (historicos, decision 20.A.1: la UI muestra "—", no oculta filas).
// ==========================================

export type MaximoSyncTarget = 'purchase_orders' | 'contracts';

export interface MaximoPurchaseOrder {
  id: string;
  ponum: string;
  siteid: string | null;
  revisionnum: number | null;
  status: string | null;
  description: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  total_cost: number | null;
  currency: string | null;
  ab_ahorro: number | null;
  ab_tipocomp: string | null;
  ab_clasfpo: string | null;
  requested_by: string | null;
  department: string | null;
  approved_at: string | null;
  created_at_source: string | null;
  last_changed_at: string | null;
  last_seen_at: string;
  raw?: unknown; // solo llega en el detalle para PURCHASE_ADMINS
}

export interface MaximoRevision {
  id: string;
  revisionnum: number | null;
  siteid: string | null;
  status: string | null;
  rowstamp: string | null;
  last_changed_at: string | null;
  last_seen_at: string;
}

export interface MaximoPurchaseOrderDetail {
  current: MaximoPurchaseOrder;
  revisions: MaximoRevision[];
}

export interface MaximoContract {
  id: string;
  prnum: string | null;
  contractnum: string | null;
  revisionnum: number | null;
  status: string | null;
  maxvol: number | null;
  total_cost: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  requested_by: string | null;
  department: string | null;
  approved_at: string | null;
  created_at_source: string | null;
  contract_ref_num: string | null;
  contract_value: number | null;
  purchview_count: number;
  has_contract: boolean;
  last_changed_at: string | null;
  last_seen_at: string;
  raw?: unknown;
}

export interface MaximoContractRevision {
  id: string;
  contractnum: string | null;
  revisionnum: number | null;
  status: string | null;
  pr_rowstamp: string | null;
  contract_rowstamp: string | null;
  last_changed_at: string | null;
  last_seen_at: string;
}

export interface MaximoContractLine {
  lineNum: number | null;
  itemNum: string | null;
  description: string | null;
  quantity: number | null;
  unitCost: number | null;
}

export interface MaximoContractStatusEntry {
  status: string | null;
  changedAt: string | null;
}

export interface MaximoContractDetail {
  current: MaximoContract;
  revisions: MaximoContractRevision[];
  lines: MaximoContractLine[];
  statusHistory: MaximoContractStatusEntry[];
}

export interface MaximoStatusCount {
  status: string | null;
  count: number;
}

export interface MaximoSyncRun {
  id: string;
  target: MaximoSyncTarget;
  triggered_by: 'cron' | 'manual' | 'seed';
  triggered_by_user_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  pages_total: number | null;
  pages_ok: number;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_unchanged: number;
  records_failed: number;
  filter_warnings: unknown;
  error_summary: string | null;
  mapper_version: string;
}

export interface MaximoSyncStatus {
  enabled: boolean;
  contractsEnabled: boolean;
  intervalMinutes: number;
  pageSize: number;
  running: MaximoSyncTarget[];
  lastRuns: Record<MaximoSyncTarget, MaximoSyncRun | null>;
  counts: Record<MaximoSyncTarget, number>;
}

export interface MaximoSummaryLastRun {
  status: string;
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  records_inserted: number;
  records_updated: number;
  records_unchanged: number;
  records_failed: number;
}

export interface MaximoSummary {
  syncEnabled: boolean;
  purchaseOrders: { total: number; byStatus: MaximoStatusCount[] };
  contracts: {
    total: number;
    withContract: number;
    byStatus: MaximoStatusCount[];
  };
  lastSync: Record<MaximoSyncTarget, MaximoSummaryLastRun | null>;
}

// Estatus de Maximo: vocabulario libre de la fuente — se muestran tal cual,
// solo se colorean los conocidos (clases completas, patron de platforms.ts).
export const MAXIMO_STATUS_BADGE_CLASSES: Record<string, string> = {
  APPR: 'bg-green-100 text-green-800',
  CLOSE: 'bg-gray-200 text-gray-700',
  COMP: 'bg-green-100 text-green-800',
  WAPPR: 'bg-yellow-100 text-yellow-800',
  PNDREV: 'bg-yellow-100 text-yellow-800',
  REVISD: 'bg-blue-100 text-blue-800',
  INPRG: 'bg-blue-100 text-blue-800',
  CAN: 'bg-red-100 text-red-800',
  CANCEL: 'bg-red-100 text-red-800',
};

export function maximoStatusBadgeClass(status: string | null): string {
  return (
    (status && MAXIMO_STATUS_BADGE_CLASSES[status]) ||
    'bg-gray-100 text-gray-800'
  );
}

export const MAXIMO_RUN_STATUS_LABELS: Record<MaximoSyncRun['status'], string> = {
  running: 'En curso',
  success: 'Exitosa',
  partial: 'Parcial',
  failed: 'Fallida',
};

export const MAXIMO_RUN_STATUS_CLASSES: Record<MaximoSyncRun['status'], string> = {
  running: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

export const MAXIMO_TARGET_LABELS: Record<MaximoSyncTarget, string> = {
  purchase_orders: 'Ordenes (PO)',
  contracts: 'Contratos',
};

export const MAXIMO_TRIGGER_LABELS: Record<MaximoSyncRun['triggered_by'], string> = {
  cron: 'Automatico',
  manual: 'Manual',
  seed: 'Seed (dev)',
};

// ==========================================
// GESTION DE CONTRATOS (§15) — repositorio documental
// NO confundir con MaximoContract (staging de solo lectura): son dos mundos
// separados sin vinculo (regla 1 de la fase §15).
// ==========================================

export type ContractDocumentType =
  | 'contrato'
  | 'addenda'
  | 'convenio'
  | 'carta_compromiso'
  | 'otro';

export type ContractStatus = 'vigente' | 'vencido' | 'renovado' | 'cancelado';

export interface ContractDocument {
  id: string;
  contract_id: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  version: number;
  is_current: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  // storage_key NUNCA viaja al cliente (la descarga es por signed URL)
}

export interface Contract {
  id: string;
  contract_number: string;
  tomo: string | null;
  document_type: ContractDocumentType;
  service_description: string;
  supplier_id: string;
  start_date: string;
  end_date: string;
  total_amount: number | null;
  currency: string | null;
  buyer_profile_id: string | null;
  responsible_user_email: string | null;
  responsible_user_name: string | null;
  status: ContractStatus;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier?: { id: string; legal_name: string; tax_id: string } | null;
  buyer?: { id: string; full_name: string; email: string } | null;
  documents?: ContractDocument[];
}

export interface ContractFilters {
  status?: ContractStatus;
  supplier_id?: string;
  vence_en_dias?: number;
  search?: string;
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  vigente: 'Vigente',
  vencido: 'Vencido',
  renovado: 'Renovado',
  cancelado: 'Cancelado',
};

export const CONTRACT_STATUS_CLASSES: Record<ContractStatus, string> = {
  vigente: 'bg-green-100 text-green-800',
  vencido: 'bg-red-100 text-red-800',
  renovado: 'bg-blue-100 text-blue-800',
  cancelado: 'bg-gray-200 text-gray-700',
};

export const CONTRACT_DOCUMENT_TYPE_LABELS: Record<ContractDocumentType, string> = {
  contrato: 'Contrato',
  addenda: 'Addenda',
  convenio: 'Convenio',
  carta_compromiso: 'Carta compromiso',
  otro: 'Otro',
};

// ==========================================
// COMITE DE COMPRAS (§16) — workflow secuencial data-driven
// La cadena vive en committee_approval_levels (backend); el mapeo esta
// PENDIENTE de confirmar con Ingrid (§20.A.5): la UI muestra un aviso a
// PURCHASE_ADMINS mientras exista algun nivel confirmed=false.
// ==========================================

export type CommitteeStatus =
  | 'borrador'
  | 'en_aprobacion'
  | 'aprobado'
  | 'rechazado'
  | 'cancelado';

export interface PurchaseCommittee {
  id: string;
  committee_number: string;
  committee_date: string;
  title: string;
  description: string | null;
  status: CommitteeStatus;
  current_version: number;
  current_approver_level: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  total_elapsed_hours: number | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean;
  author: { id: string; full_name: string | null; email: string } | null;
  current_level: { orden: number; role: string } | null;
  is_my_turn: boolean;
}

export interface CommitteeVersion {
  id: string;
  committee_id: string;
  version: number;
  file_name: string | null;
  external_link: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
}

export interface CommitteeApproval {
  id: string;
  version: number;
  approver_level: number;
  approver: { id: string; full_name: string | null } | null;
  approver_role: string;
  action: 'aprobado' | 'rechazado';
  justification: string | null;
  action_at: string | null;
  elapsed_hours_since_assigned: number | null;
}

export interface CommitteeLevelInfo {
  orden: number;
  role: string;
  has_specific_user: boolean;
  confirmed: boolean;
}

export interface CommitteeDetail extends PurchaseCommittee {
  versions: CommitteeVersion[];
  approvals: CommitteeApproval[];
  levels: CommitteeLevelInfo[];
}

export interface CommitteeApprovalLevel {
  id: string;
  orden: number;
  role: string;
  profile_id: string | null;
  confirmed: boolean;
  is_active: boolean;
  notes: string | null;
}

export const COMMITTEE_STATUS_LABELS: Record<CommitteeStatus, string> = {
  borrador: 'Borrador',
  en_aprobacion: 'En aprobacion',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export const COMMITTEE_STATUS_CLASSES: Record<CommitteeStatus, string> = {
  borrador: 'bg-gray-200 text-gray-700',
  en_aprobacion: 'bg-blue-100 text-blue-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-500',
};

// ==========================================
// EXPEDITACION — seguimiento de entregas de POs PROPIAS
// (las POs de Maximo son de solo lectura y no se expeditan desde ABENT).
// El estatus es DERIVADO de fechas + capturas; umbrales T9: riesgo <= 15
// dias naturales, critica desde 7 dias de vencida.
// ==========================================

export type DeliveryStatus =
  | 'sin_fecha'
  | 'en_tiempo'
  | 'en_riesgo'
  | 'retrasada'
  | 'parcial'
  | 'entregada';

export interface ExpeditingItem {
  purchase_order_id: string;
  po_number: string;
  po_status: POStatus;
  supplier: { id: string; legal_name: string; email: string | null } | null;
  buyer: { id: string; full_name: string | null; email: string } | null;
  requisition: { id: string; rq_number: string } | null;
  amount: number | null;
  expected_delivery_date: string | null;
  effective_expected_date: string | null;
  actual_delivery_date: string | null;
  delivery_status: DeliveryStatus;
  days_left: number | null;
  tracking: {
    id: string;
    current_status: string;
    alert_count: number;
    last_alert_sent: string | null;
    notes: string | null;
  } | null;
}

export interface DeliveryTrackingEvent {
  id: string;
  event_type:
    | 'seguimiento'
    | 'reprogramacion'
    | 'recepcion_parcial'
    | 'recepcion_total';
  comment: string | null;
  previous_expected_date: string | null;
  new_expected_date: string | null;
  received_date: string | null;
  quantity: number | null;
  created_by_name: string | null;
  created_at: string | null;
}

export interface ExpeditingAlert {
  id: string;
  alert_type: string;
  alert_date: string;
  sent_to: string[];
  sent_at: string | null;
}

export interface ExpeditingDetail extends ExpeditingItem {
  events: DeliveryTrackingEvent[];
  alerts: ExpeditingAlert[];
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  sin_fecha: 'Sin fecha',
  en_tiempo: 'En tiempo',
  en_riesgo: 'En riesgo',
  retrasada: 'Retrasada',
  parcial: 'Parcial',
  entregada: 'Entregada',
};

export const DELIVERY_STATUS_CLASSES: Record<DeliveryStatus, string> = {
  sin_fecha: 'bg-gray-100 text-gray-500',
  en_tiempo: 'bg-green-100 text-green-800',
  en_riesgo: 'bg-amber-100 text-amber-800',
  retrasada: 'bg-red-100 text-red-800',
  parcial: 'bg-orange-100 text-orange-800',
  entregada: 'bg-gray-200 text-gray-700',
};

export const DELIVERY_EVENT_LABELS: Record<
  DeliveryTrackingEvent['event_type'],
  string
> = {
  seguimiento: 'Seguimiento',
  reprogramacion: 'Reprogramacion',
  recepcion_parcial: 'Recepcion parcial',
  recepcion_total: 'Recepcion total',
};

/**
 * Chip aproximado para tablas que solo tienen la PO (sin tracking): misma
 * regla base del backend sobre las fechas de la orden. El dato exacto (con
 * reprogramaciones) lo da GET /compras/expeditacion.
 */
export function deriveDeliveryChip(po: {
  status: POStatus;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
}): DeliveryStatus {
  if (po.status === 'entregada_completa' || po.actual_delivery_date) {
    return 'entregada';
  }
  if (po.status === 'entregada_parcial') return 'parcial';
  if (!po.expected_delivery_date) return 'sin_fecha';
  const daysLeft = Math.round(
    (new Date(po.expected_delivery_date).getTime() - Date.now()) / 86_400_000,
  );
  if (daysLeft < 0) return 'retrasada';
  if (daysLeft <= 15) return 'en_riesgo';
  return 'en_tiempo';
}
