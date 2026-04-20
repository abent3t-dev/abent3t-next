// ==========================================
// TIPOS DEL MODULO DE CONTABILIDAD Y COMPLIANCE FISCAL
// ==========================================

// ==========================================
// ENUMS Y ESTADOS
// ==========================================

/** Estado de sincronizacion con SAP/SAT */
export type SyncStatus = 'pending' | 'running' | 'success' | 'error';

/** Tipo de CFDI del SAT */
export type CfdiType = 'I' | 'E' | 'P' | 'N' | 'T';

/** Estado de perdida fiscal */
export type FiscalLossStatus = 'vigente' | 'proxima_a_vencer' | 'vencida' | 'amortizada_total';

/** Estado del cruce de complementos de pago */
export type PaymentReconciliationStatus = 'conciliado' | 'diferencia_monto' | 'solo_en_sap' | 'solo_en_sat';

/** Tipo de OKR */
export type OkrType = 'objective' | 'key_result';

/** Estado de OKR */
export type OkrStatus = 'on_track' | 'at_risk' | 'behind' | 'completed';

// ==========================================
// INTEGRACIONES
// ==========================================

/** Configuracion de conexion SAP B1 */
export interface SapConnection {
  id: string;
  environment: string;
  base_url: string;
  company_db: string;
  username: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Configuracion de credenciales SAT (sin datos sensibles) */
export interface SatCredentials {
  id: string;
  rfc: string;
  has_ciec: boolean;
  has_efirma: boolean;
  efirma_password_hint: string | null;
  is_active: boolean;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Log de sincronizacion */
export interface SyncLog {
  id: string;
  source: 'sap' | 'sat';
  sync_type: string;
  status: SyncStatus;
  records_fetched: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

// ==========================================
// CFDIs Y DECLARACIONES
// ==========================================

/** CFDI descargado del SAT */
export interface Cfdi {
  id: string;
  uuid: string;
  tipo: CfdiType;
  rfc_emisor: string;
  nombre_emisor: string | null;
  rfc_receptor: string;
  nombre_receptor: string | null;
  fecha_emision: string;
  fecha_certificacion: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  moneda: string;
  tipo_cambio: number;
  forma_pago: string | null;
  metodo_pago: string | null;
  uso_cfdi: string | null;
  version_complementaria: boolean;
  uuid_relacionado: string | null;
  status: string;
  downloaded_at: string;
  is_active: boolean;
  created_at: string;
}

/** Declaracion del SAT */
export interface SatDeclaration {
  id: string;
  tipo_declaracion: string;
  ejercicio: number;
  periodo: string;
  fecha_presentacion: string;
  fecha_limite: string | null;
  acuse_url: string | null;
  monto_a_cargo: number;
  monto_a_favor: number;
  monto_pagado: number;
  status: string;
  is_active: boolean;
  created_at: string;
}

// ==========================================
// PERDIDAS FISCALES
// ==========================================

/** Factor INPC mensual */
export interface InpcFactor {
  id: string;
  year: number;
  month: number;
  factor: number;
  is_active: boolean;
  created_at: string;
}

/** Perdida fiscal */
export interface FiscalLoss {
  id: string;
  ejercicio: number;
  fecha_declaracion: string;
  fecha_vencimiento: string;
  monto_original: number;
  factor_actualizacion: number;
  monto_actualizado: number;
  amortizado: number;
  saldo_pendiente: number;
  status: FiscalLossStatus;
  notes: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Amortizacion de perdida fiscal */
export interface FiscalLossAmortization {
  id: string;
  fiscal_loss_id: string;
  ejercicio_aplicacion: number;
  monto_amortizado: number;
  declaracion_id: string | null;
  notes: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
}

// ==========================================
// NO DEDUCIBLES
// ==========================================

/** Gasto no deducible */
export interface NonDeductible {
  id: string;
  periodo: string; // YYYY-MM
  concepto: string;
  monto: number;
  department_id: string | null;
  cfdi_uuid: string | null;
  notes: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  departments?: { id: string; name: string } | null;
}

/** Estadisticas de no deducibles por departamento */
export interface NonDeductibleStats {
  department_id: string;
  department_name: string;
  total_monto: number;
  count: number;
}

// ==========================================
// TENENCIA ACCIONARIA
// ==========================================

/** Version de tenencia accionaria */
export interface ShareholdingRecord {
  id: string;
  version: number;
  effective_date: string;
  event_description: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  // Relaciones
  details?: ShareholdingDetail[];
}

/** Detalle de accionista */
export interface ShareholdingDetail {
  id: string;
  shareholding_record_id: string;
  accionista_nombre: string;
  rfc: string | null;
  tipo_accion: string;
  porcentaje: number;
  num_acciones: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

// ==========================================
// OKRs
// ==========================================

/** OKR del area de contabilidad */
export interface AccountingOkr {
  id: string;
  titulo: string;
  descripcion: string | null;
  periodo: string;
  tipo: OkrType;
  parent_okr_id: string | null;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  status: OkrStatus;
  due_date: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  key_results?: AccountingOkr[];
  parent?: AccountingOkr | null;
}

// ==========================================
// COMPLIANCE Y CRUCE
// ==========================================

/** Cruce de complementos de pago SAP vs SAT */
export interface PaymentReconciliation {
  id: string;
  periodo: string; // YYYY-MM
  sap_payment_id: string | null;
  cfdi_uuid: string | null;
  rfc_proveedor: string | null;
  proveedor_nombre: string | null;
  monto_sap: number | null;
  monto_sat: number | null;
  difference_amount: number;
  status: PaymentReconciliationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

/** Estado de compliance general */
export interface ComplianceStatus {
  periodo: string;
  total_registros: number;
  conciliados: number;
  con_diferencias: number;
  solo_sap: number;
  solo_sat: number;
  porcentaje_compliance: number;
}

// ==========================================
// DASHBOARDS Y KPIs
// ==========================================

/** Datos de EBITDA */
export interface EbitdaData {
  periodo: string;
  total: number;
  por_tipo_ingreso: {
    tipo: string;
    monto: number;
  }[];
}

/** Datos de costos de ventas */
export interface CostsData {
  periodo: string;
  total: number;
  costo_gas: number;
  costo_porteo: number;
  fees: number;
}

/** Datos de utilidad */
export interface UtilityData {
  periodo: string;
  utilidad_financiera: number;
  utilidad_fiscal: number;
  gastos_deducibles: number;
  intereses: number;
  depreciacion: number;
}

/** Datos de financiamiento */
export interface FinancingData {
  periodo: string;
  deuda_total: number;
  intereses_periodo: number;
  razon_deuda_ebitda: number;
  creditos: {
    institucion: string;
    saldo: number;
    tasa: number;
    vencimiento: string;
  }[];
}

/** KPIs generales del dashboard de contabilidad */
export interface AccountingDashboardKpis {
  ebitda_actual: number;
  ebitda_anterior: number;
  ebitda_variacion: number;
  utilidad_financiera: number;
  utilidad_fiscal: number;
  deuda_total: number;
  compliance_porcentaje: number;
  perdidas_vigentes: number;
  perdidas_proximas_vencer: number;
}

// ==========================================
// DTOs Y FILTROS
// ==========================================

/** Filtros para CFDIs */
export interface CfdiFilters {
  tipo?: CfdiType;
  fecha_inicio?: string;
  fecha_fin?: string;
  rfc?: string;
  status?: string;
}

/** Filtros para perdidas fiscales */
export interface FiscalLossFilters {
  ejercicio?: number;
  status?: FiscalLossStatus;
}

/** Filtros para no deducibles */
export interface NonDeductibleFilters {
  periodo?: string;
  department_id?: string;
}

/** Filtros para OKRs */
export interface OkrFilters {
  periodo?: string;
  tipo?: OkrType;
  status?: OkrStatus;
}

// ==========================================
// LABELS Y COLORES
// ==========================================

/** Labels para estados de perdida fiscal */
export const FISCAL_LOSS_STATUS_LABELS: Record<FiscalLossStatus, string> = {
  vigente: 'Vigente',
  proxima_a_vencer: 'Proxima a Vencer',
  vencida: 'Vencida',
  amortizada_total: 'Amortizada Total',
};

/** Colores para estados de perdida fiscal */
export const FISCAL_LOSS_STATUS_COLORS: Record<FiscalLossStatus, string> = {
  vigente: 'bg-green-100 text-green-800',
  proxima_a_vencer: 'bg-yellow-100 text-yellow-800',
  vencida: 'bg-red-100 text-red-800',
  amortizada_total: 'bg-gray-100 text-gray-800',
};

/** Labels para estados de cruce de pago */
export const PAYMENT_RECONCILIATION_STATUS_LABELS: Record<PaymentReconciliationStatus, string> = {
  conciliado: 'Conciliado',
  diferencia_monto: 'Diferencia de Monto',
  solo_en_sap: 'Solo en SAP',
  solo_en_sat: 'Solo en SAT',
};

/** Colores para estados de cruce de pago */
export const PAYMENT_RECONCILIATION_STATUS_COLORS: Record<PaymentReconciliationStatus, string> = {
  conciliado: 'bg-green-100 text-green-800',
  diferencia_monto: 'bg-yellow-100 text-yellow-800',
  solo_en_sap: 'bg-orange-100 text-orange-800',
  solo_en_sat: 'bg-red-100 text-red-800',
};

/** Labels para estados de OKR */
export const OKR_STATUS_LABELS: Record<OkrStatus, string> = {
  on_track: 'En Progreso',
  at_risk: 'En Riesgo',
  behind: 'Atrasado',
  completed: 'Completado',
};

/** Colores para estados de OKR */
export const OKR_STATUS_COLORS: Record<OkrStatus, string> = {
  on_track: 'bg-green-100 text-green-800',
  at_risk: 'bg-yellow-100 text-yellow-800',
  behind: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

/** Labels para tipos de CFDI */
export const CFDI_TYPE_LABELS: Record<CfdiType, string> = {
  I: 'Ingreso',
  E: 'Egreso',
  P: 'Pago',
  N: 'Nomina',
  T: 'Traslado',
};

/** Labels para estado de sincronizacion */
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: 'Pendiente',
  running: 'En Proceso',
  success: 'Exitoso',
  error: 'Error',
};

/** Colores para estado de sincronizacion */
export const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};
