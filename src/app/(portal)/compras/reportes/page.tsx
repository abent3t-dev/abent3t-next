'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatAmountLines, formatCurrencyAmount, formatDays, NO_DISPONIBLE } from '@/lib/compras-format';
import { AbentLevels, SapPendingApprovers } from '@/components/compras/ApprovalDelays';
import ExportExcelButton from '@/components/compras/ExportExcelButton';
import { PieChart } from '@/components/charts/PieChart';
import {
  ApprovalStats,
  ApprovalTimesReport,
  CurrencyAmount,
  MAXIMO_STATUS_CHART_COLORS,
  MaximoSummary,
  maximoStatusLabel,
  SAP_STATUS_CHART_COLORS,
  sapStatusLabel,
  statusChartColors,
} from '@/types/purchases';

/**
 * Fase Reportes — datos REALES desde /compras/reportes/* (adios datos
 * simulados). Aprobaciones, entregas y comite consumen las formulas
 * existentes (acumuladas); el resto respeta el periodo. El ahorro se muestra
 * POR FUENTE (T10: ABENT y Maximo no se suman) y los historicos de Maximo
 * aparecen como "sin clasificar", nunca ocultos.
 *
 * 2026-09-23 (Ingrid): periodo "Semana" (lunes a domingo, con navegación y
 * comparación contra la semana anterior) y descarga del reporte en Excel.
 */

// ── Tipos de las respuestas del backend ────────────────────────────────────

interface Resumen {
  periodo: { from: string; to: string };
  requisiciones: {
    creadas_en_periodo: number;
    abiertas_actuales: number;
    promedio_dias_gestion: number | null;
  };
  ordenes: { creadas_en_periodo: number; monto_total: number };
  entregas: {
    pendientes: number;
    vencidas: number;
    entregadas: number;
    retraso_promedio_dias: number | null;
  };
  contratos: { por_vencer_30_dias: number; valor_vigentes: number };
  proveedores: { bloqueados: number };
  todas_las_fuentes: {
    solicitudes: {
      creadas: number;
      abiertas: number;
      por_fuente: Record<'sap' | 'maximo' | 'abent', { creadas: number; abiertas: number }>;
    };
    dias_gestion: { sap: number | null; maximo: number | null; abent: number | null };
    ordenes: {
      total: number;
      monto_por_moneda: CurrencyAmount[];
      por_fuente: Record<'sap' | 'maximo' | 'abent', number>;
    };
    contratos_por_vencer_30_dias: { total: number; por_fuente: { abent: number; maximo: number } };
  };
}

interface RequisicionesReport {
  serie_mensual: Array<{ month: string; creadas: number; cerradas: number }>;
  por_estatus: Array<{ status: string; count: number; monto: number }>;
  por_tipo: Array<{ expense_type: string; count: number; monto: number }>;
  por_departamento: Array<{ departamento: string; count: number }>;
}

interface OrdenesReport {
  serie_mensual: Array<{ month: string; count: number; monto: number }>;
  por_tipo_compra: Array<{ tipo: string; count: number; monto: number }>;
  por_tipo_gasto: Array<{ expense_type: string; count: number; monto: number }>;
  top_proveedores: Array<{ proveedor: string; count: number; monto: number }>;
}

interface AprobacionesReport {
  stats: Record<
    string,
    {
      level: number;
      level_name: string;
      total: number;
      approved: number;
      rejected: number;
      pending: number;
      approval_rate: number;
      average_time_days: number;
    }
  >;
}

interface EntregasReport {
  stats: {
    counts: Record<string, number>;
    avg_delay_days: number | null;
    top_delayed_suppliers: Array<{ legal_name: string; late_orders: number }>;
  };
  on_time_por_proveedor: Array<{
    proveedor: string;
    entregadas: number;
    a_tiempo: number;
    rate: number;
  }>;
}

interface ContratosReport {
  por_vencer_30_dias: Array<{
    id: string;
    contract_number: string;
    proveedor: string;
    end_date: string;
    total_amount: number | null;
  }>;
  vigentes: { total: number; valor_total: number };
  promedio_consumo_pct: number | null;
}

interface ComiteReport {
  tiempos: {
    byApprover: Array<{
      approver_profile_id: string;
      full_name: string | null;
      avg_hours: number;
      actions: number;
      bottleneck: boolean;
    }>;
    avgTotalHours: number | null;
    byStatus: Array<{ status: string; count: number }>;
    rejectionRateByLevel: Array<{
      level: number;
      total: number;
      rejected: number;
      rate: number;
    }>;
  };
}

interface MaximoReport {
  purchase_orders: {
    por_estatus: Array<{ status: string; count: number }>;
    serie_mensual_aprobadas: Array<{ month: string; count: number }>;
    sin_fecha_aprobacion: number;
  };
  contracts: { por_estatus: Array<{ status: string; count: number }> };
}

// Sprint 2026-09-22 (B2/B3): SAP + Maximo por periodo y tiempos de aprobación
interface ErpSerie {
  monedas: string[];
  meses: Array<{
    month: string;
    count: number;
    por_moneda: Array<{ currency: string; count: number; monto: number }>;
  }>;
}
interface ErpReport {
  sap: {
    ordenes: { serie_mensual: ErpSerie; por_estatus: Array<{ status: string | null; count: number }> };
    solicitudes: { serie_mensual: ErpSerie; por_estatus: Array<{ status: string | null; count: number }> };
    top_proveedores: Array<{ proveedor: string; currency: string | null; count: number; monto: number }>;
  };
  maximo: {
    ordenes: { serie_mensual: ErpSerie; por_estatus: Array<{ status: string | null; count: number }> };
    contratos: { por_estatus: Array<{ status: string | null; count: number }> };
    top_proveedores: Array<{ proveedor: string; currency: string | null; count: number; monto: number }>;
  };
}
type TiemposReport = ApprovalTimesReport;

interface AhorroReport {
  sap?: {
    por_moneda: Array<{ currency: string; total: number; documentos_con_ahorro: number }>;
    lineas_total: number;
    lineas_clasificadas: number;
    nota: string;
  };
  abent: { disponible: boolean; motivo?: string };
  maximo: {
    por_moneda: Array<{ currency: string; total: number; registros: number }>;
    sin_clasificar: number;
  };
}

// ── Utilerías de presentación ──────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    amount,
  );

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const monthLabel = (month: string) => {
  const [year, m] = month.split('-');
  return `${MESES_CORTOS[Number(m) - 1]} ${year.slice(2)}`;
};

// Sin Date: el input "Personalizado" puede quedar vacío ('') mientras se edita.
const fechaCorta = (s: string) => {
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return '—';
  return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]} ${y}`;
};

const iso = (d: Date) => d.toISOString().split('T')[0];

type Preset = 'semana' | 'mes' | 'trimestre' | '12m' | 'custom';

/** Fecha local (no UTC) en YYYY-MM-DD: el lunes no debe correrse de día. */
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Semana de lunes a domingo; offset 0 = la semana en curso, -1 = la anterior. */
function weekRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: isoLocal(monday), to: isoLocal(sunday) };
}

/** Diferencia contra la semana anterior: "▲ 7 vs semana anterior (15)". */
function versus(actual: number, anterior: number | undefined): string | undefined {
  if (anterior === undefined) return undefined;
  const diff = actual - anterior;
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '=';
  const amount = diff === 0 ? '' : ` ${Math.abs(diff).toLocaleString('es-MX')}`;
  return `${arrow}${amount} vs semana anterior (${anterior.toLocaleString('es-MX')})`;
}

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = iso(now);
  if (preset === 'mes') {
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  }
  if (preset === 'trimestre') {
    return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to };
  }
  return { from: iso(new Date(now.getFullYear(), now.getMonth() - 11, 1)), to };
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-lg font-semibold text-[#424846]">{title}</h3>
        {note && <span className="text-xs text-gray-500">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text = 'Sin datos en el periodo' }: { text?: string }) {
  return <p className="text-sm text-gray-500">{text}</p>;
}

function HBar({
  label,
  value,
  max,
  display,
  color = 'bg-[#52AF32]',
  highlight = false,
  labelClassName = 'w-40',
  displayClassName = 'w-28',
}: {
  label: string;
  value: number;
  max: number;
  display?: string;
  color?: string;
  highlight?: boolean;
  labelClassName?: string;
  displayClassName?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={`${labelClassName} text-sm truncate ${highlight ? 'text-red-700 font-medium' : 'text-gray-600'}`} title={label}>
        {label}
      </div>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${highlight ? 'bg-red-500' : color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`${displayClassName} text-sm text-right text-gray-700`}>{display ?? value}</div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  lines,
  sub,
  compare,
  hint,
  border,
}: {
  label: string;
  value: string | number;
  /** Un renglón por dato (p. ej. un monto por moneda). */
  lines?: string[];
  sub?: string;
  /** Comparación contra el periodo anterior (solo en "Semana"). */
  compare?: string;
  hint?: string;
  border: string;
}) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${border}`} title={hint}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-[#424846] tabular-nums">{value}</p>
      {compare && <p className="text-xs font-medium text-[#222D59] mt-0.5">{compare}</p>}
      {lines && lines.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {lines.map((line) => (
            <li key={line} className="text-sm text-gray-800 tabular-nums break-words">
              {line}
            </li>
          ))}
        </ul>
      )}
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function porFuente<T>(
  fuentes: Record<'sap' | 'maximo' | 'abent', T>,
  valor: (v: T) => number,
): string {
  return `SAP ${valor(fuentes.sap).toLocaleString('es-MX')} · Maximo ${valor(fuentes.maximo).toLocaleString('es-MX')} · ABENT ${valor(fuentes.abent).toLocaleString('es-MX')}`;
}

function ErpPie({
  data,
  labelOf,
  colorOf,
  noun,
}: {
  data: Array<{ status: string | null; count: number }>;
  labelOf: (s: string | null) => string;
  colorOf: Record<string, string>;
  noun: string;
}) {
  const rows = data
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((d) => {
      // La API manda el centinela 'sin_estatus' en vez de null.
      const status = d.status === 'sin_estatus' ? null : d.status;
      return { name: labelOf(status), value: d.count, status };
    });
  if (rows.length === 0) return <Empty />;
  const colors = statusChartColors(
    rows.map((r) => r.status),
    colorOf,
  );
  return <PieChart data={rows} dataKey="value" nameKey="name" colors={colors} height={200} centerCaption={noun} />;
}

function ErpMonths({ serie }: { serie: ErpSerie }) {
  const max = Math.max(...serie.meses.map((m) => m.count), 1);
  if (serie.meses.every((m) => m.count === 0)) return <Empty />;
  return (
    <div className="space-y-2">
      {serie.meses.map((m) => (
        <div key={m.month} className="flex items-start gap-3">
          <div className="w-14 shrink-0 text-sm text-gray-600">{monthLabel(m.month)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#52AF32]" style={{ width: `${Math.round((m.count / max) * 100)}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-semibold text-gray-700 tabular-nums">{m.count}</span>
            </div>
            {m.count > 0 && (
              <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-600">
                {m.por_moneda
                  .filter((c) => c.count > 0)
                  .map((c) => (
                    <span key={c.currency} className="whitespace-nowrap">
                      {formatCurrencyAmount(c.monto, c.currency)}
                    </span>
                  ))}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function ReportesComprasPage() {
  const [preset, setPreset] = useState<Preset>('12m');
  const [customRange, setCustomRange] = useState(presetRange('12m'));
  // Reporte semanal: por default la última semana completa
  const [weekOffset, setWeekOffset] = useState(-1);
  const range =
    preset === 'custom'
      ? customRange
      : preset === 'semana'
        ? weekRange(weekOffset)
        : presetRange(preset);
  const periodQs = `from=${range.from}&to=${range.to}`;
  const prevWeek = weekRange(weekOffset - 1);
  const semanaEnCurso = preset === 'semana' && weekOffset === 0;

  const resumenQ = useQuery({
    queryKey: ['reportes', 'resumen', periodQs],
    queryFn: () => api.get<Resumen>(`/compras/reportes/resumen?${periodQs}`),
  });
  const prevQs = `from=${prevWeek.from}&to=${prevWeek.to}`;
  const resumenAnteriorQ = useQuery({
    queryKey: ['reportes', 'resumen', prevQs],
    queryFn: () => api.get<Resumen>(`/compras/reportes/resumen?${prevQs}`),
    enabled: preset === 'semana',
  });
  const anterior = preset === 'semana' ? resumenAnteriorQ.data?.todas_las_fuentes : undefined;
  const rqQ = useQuery({
    queryKey: ['reportes', 'requisiciones', periodQs],
    queryFn: () =>
      api.get<RequisicionesReport>(`/compras/reportes/requisiciones?${periodQs}`),
  });
  const poQ = useQuery({
    queryKey: ['reportes', 'ordenes', periodQs],
    queryFn: () => api.get<OrdenesReport>(`/compras/reportes/ordenes?${periodQs}`),
  });
  const aprobacionesQ = useQuery({
    queryKey: ['reportes', 'aprobaciones'],
    queryFn: () =>
      api.get<AprobacionesReport>('/compras/reportes/aprobaciones'),
  });
  const entregasQ = useQuery({
    queryKey: ['reportes', 'entregas'],
    queryFn: () => api.get<EntregasReport>('/compras/reportes/entregas'),
  });
  const contratosQ = useQuery({
    queryKey: ['reportes', 'contratos'],
    queryFn: () => api.get<ContratosReport>('/compras/reportes/contratos'),
  });
  const comiteQ = useQuery({
    queryKey: ['reportes', 'comite'],
    queryFn: () => api.get<ComiteReport>('/compras/reportes/comite'),
  });
  const maximoQ = useQuery({
    queryKey: ['reportes', 'maximo', periodQs],
    queryFn: () => api.get<MaximoReport>(`/compras/reportes/maximo?${periodQs}`),
  });
  const ahorroQ = useQuery({
    queryKey: ['reportes', 'ahorro', periodQs],
    queryFn: () => api.get<AhorroReport>(`/compras/reportes/ahorro?${periodQs}`),
  });
  const maximoSummaryQ = useQuery({
    queryKey: ['maximo', 'summary'],
    queryFn: () => api.get<MaximoSummary>('/maximo/summary'),
    retry: false,
  });
  const erpQ = useQuery({
    queryKey: ['reportes', 'erp', periodQs],
    queryFn: () => api.get<ErpReport>(`/compras/reportes/erp?${periodQs}`),
  });
  const tiemposQ = useQuery({
    queryKey: ['reportes', 'tiempos-aprobacion'],
    queryFn: () => api.get<TiemposReport>('/compras/reportes/tiempos-aprobacion'),
  });
  const erp = erpQ.data;
  const tiempos = tiemposQ.data;

  const resumen = resumenQ.data;
  const rq = rqQ.data;
  const po = poQ.data;
  const aprobaciones = aprobacionesQ.data;
  const entregas = entregasQ.data;
  const contratos = contratosQ.data;
  const comite = comiteQ.data;
  const maximo = maximoQ.data;
  const ahorro = ahorroQ.data;

  const maximoPendiente =
    maximoSummaryQ.data?.syncEnabled === false &&
    (maximo?.purchase_orders.por_estatus.length ?? 0) === 0;

  const diasGestion: Array<[string, number | null]> = resumen
    ? [
        ['SAP', resumen.todas_las_fuentes.dias_gestion.sap],
        ['Maximo', resumen.todas_las_fuentes.dias_gestion.maximo],
        ['ABENT', resumen.todas_las_fuentes.dias_gestion.abent],
      ]
    : [];
  const diasConBase = diasGestion.filter(([, v]) => v !== null) as Array<[string, number]>;
  const diasPromedio =
    diasConBase.length === 0
      ? null
      : Math.round((diasConBase.reduce((sum, [, v]) => sum + v, 0) / diasConBase.length) * 10) / 10;

  // Captura propia de ABENT: si todo está vacío se muestra un aviso compacto
  // al final en lugar de cuatro tarjetas "Sin datos" arriba.
  const abentVacio =
    !!rq &&
    !!po &&
    rq.serie_mensual.every((m) => m.creadas === 0 && m.cerradas === 0) &&
    po.serie_mensual.every((m) => m.count === 0) &&
    (!comite || comite.tiempos.byApprover.length === 0);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header + periodo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Reportes de Compras</h1>
          <p className="text-gray-500">
            Datos reales del periodo {fechaCorta(range.from)} — {fechaCorta(range.to)}
            {semanaEnCurso && ' (semana en curso)'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              ['semana', 'Semana'],
              ['mes', 'Este mes'],
              ['trimestre', 'Trimestre'],
              ['12m', '12 meses'],
              ['custom', 'Personalizado'],
            ] as Array<[Preset, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPreset(value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                preset === value
                  ? 'bg-[#52AF32] text-white'
                  : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          {preset === 'semana' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-[#424846] hover:bg-gray-50"
                title="Semana anterior"
              >
                ‹
              </button>
              <span className="px-2 text-sm text-[#424846] tabular-nums whitespace-nowrap">
                {fechaCorta(range.from)} al {fechaCorta(range.to)}
              </span>
              <button
                type="button"
                onClick={() => setWeekOffset(weekOffset + 1)}
                disabled={weekOffset >= 0}
                className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-[#424846] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Semana siguiente"
              >
                ›
              </button>
            </div>
          )}
          {preset === 'custom' && (
            <>
              <input
                type="date"
                value={customRange.from}
                onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-900 text-sm"
              />
              <input
                type="date"
                value={customRange.to}
                onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-900 text-sm"
              />
            </>
          )}
          <ExportExcelButton
            path={`/compras/reportes/semanal/export?${periodQs}`}
            filename={`reporte_compras_${range.from}_${range.to}.xlsx`}
            disabled={!range.from || !range.to}
            label={preset === 'semana' ? 'Reporte semanal' : 'Descargar reporte'}
            title="Excel con el resumen contra el periodo anterior, las OC y solicitudes de SAP y Maximo del periodo, y las autorizaciones pendientes"
          />
        </div>
      </div>

      {/* KPIs cabecera: SAP + Maximo + registros propios */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
          <KpiCard
            label="Solicitudes del periodo"
            value={resumen.todas_las_fuentes.solicitudes.creadas.toLocaleString('es-MX')}
            lines={[`${resumen.todas_las_fuentes.solicitudes.abiertas.toLocaleString('es-MX')} abiertas hoy`]}
            sub={porFuente(resumen.todas_las_fuentes.solicitudes.por_fuente, (f) => f.creadas)}
            compare={versus(resumen.todas_las_fuentes.solicitudes.creadas, anterior?.solicitudes.creadas)}
            hint="Solicitudes de pedido de SAP y solicitudes (PR) de Maximo creadas en el periodo, más requisiciones capturadas en ABENT."
            border="border-blue-500"
          />
          <KpiCard
            label="Días de gestión (prom.)"
            value={diasPromedio === null ? NO_DISPONIBLE : formatDays(diasPromedio)}
            lines={diasGestion.map(([k, v]) => `${k}: ${v === null ? 'sin datos' : formatDays(v)}`)}
            hint="SAP: de la fecha del documento al cierre, en solicitudes cerradas en el periodo (la gestión de OC — solicitud de pedido → OC — está en Tiempos de aprobación). Maximo: de la solicitud a su aprobación. ABENT: días hábiles de requisiciones cerradas. Promedio simple de las fuentes con datos."
            border="border-yellow-500"
          />
          <KpiCard
            label="Órdenes del periodo"
            value={resumen.todas_las_fuentes.ordenes.total.toLocaleString('es-MX')}
            lines={formatAmountLines(resumen.todas_las_fuentes.ordenes.monto_por_moneda)}
            sub={porFuente(resumen.todas_las_fuentes.ordenes.por_fuente, (n) => n)}
            compare={versus(resumen.todas_las_fuentes.ordenes.total, anterior?.ordenes.total)}
            hint="OC no canceladas de SAP y Maximo creadas en el periodo, más OC propias. Un monto por moneda: nunca se suman MXN con USD."
            border="border-[#52AF32]"
          />
          <KpiCard
            label="Entregas abiertas"
            value={(resumen.entregas.pendientes + resumen.entregas.vencidas).toLocaleString('es-MX')}
            lines={[
              `${resumen.entregas.vencidas.toLocaleString('es-MX')} vencidas`,
              `${resumen.entregas.pendientes.toLocaleString('es-MX')} en tiempo o en riesgo`,
            ]}
            hint="OC abiertas por recibir (SAP, Maximo y propias) según su fecha comprometida; mismo cálculo que Expeditación."
            border="border-orange-500"
          />
          <KpiCard
            label="Contratos por vencer (30 días)"
            value={resumen.todas_las_fuentes.contratos_por_vencer_30_dias.total}
            sub={`ABENT ${resumen.todas_las_fuentes.contratos_por_vencer_30_dias.por_fuente.abent} · Maximo ${resumen.todas_las_fuentes.contratos_por_vencer_30_dias.por_fuente.maximo}`}
            lines={resumen.contratos.valor_vigentes > 0 ? [`Vigentes: ${formatCurrencyAmount(resumen.contratos.valor_vigentes, 'MXN')}`] : undefined}
            border="border-[#222D59]"
          />
          <KpiCard
            label="Proveedores bloqueados"
            value={resumen.proveedores.bloqueados}
            sub="bloqueados en ABENT por desempeño"
            border="border-red-500"
          />
        </div>
      )}

      {/* SAP + Maximo por periodo (sprint 2026-09-22, B2) */}
      <Section title="SAP Business One — órdenes y solicitudes en el periodo" note="montos por moneda, nunca sumados entre monedas">
        {erpQ.isError ? (
          <p className="text-sm text-red-600">No se pudo cargar el reporte de los ERPs.</p>
        ) : !erp ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-[#424846] mb-2">Órdenes por estatus</p>
              <ErpPie data={erp.sap.ordenes.por_estatus} labelOf={sapStatusLabel} colorOf={SAP_STATUS_CHART_COLORS} noun="órdenes" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#424846] mb-2">Solicitudes por estatus</p>
              <ErpPie data={erp.sap.solicitudes.por_estatus} labelOf={sapStatusLabel} colorOf={SAP_STATUS_CHART_COLORS} noun="solicitudes" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#424846]">Órdenes por mes</p>
              <ErpMonths serie={erp.sap.ordenes.serie_mensual} />
            </div>
            <div className="lg:col-span-3 space-y-2">
              <p className="text-sm font-medium text-[#424846]">Top proveedores por monto (OC)</p>
              {erp.sap.top_proveedores.length === 0 ? (
                <Empty />
              ) : (
                erp.sap.top_proveedores.map((row) => (
                  <HBar
                    key={`${row.proveedor}-${row.currency}`}
                    label={row.proveedor}
                    value={row.monto}
                    max={Math.max(...erp.sap.top_proveedores.filter((r) => r.currency === row.currency).map((r) => r.monto), 1)}
                    display={`${formatCurrencyAmount(row.monto, row.currency)} · ${row.count}`}
                    labelClassName="w-40 lg:w-72"
                    displayClassName="w-28 lg:w-48 lg:whitespace-nowrap"
                  />
                ))
              )}
            </div>
          </div>
        )}
      </Section>

      <Section title="Maximo — órdenes y contratos en el periodo" note="vista vigente (última revisión); estatus en español">
        {erpQ.isError ? (
          <p className="text-sm text-red-600">No se pudo cargar el reporte de los ERPs.</p>
        ) : !erp ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-[#424846] mb-2">Órdenes por estatus</p>
              <ErpPie data={erp.maximo.ordenes.por_estatus} labelOf={maximoStatusLabel} colorOf={MAXIMO_STATUS_CHART_COLORS} noun="órdenes" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#424846] mb-2">Solicitudes / contratos por estatus</p>
              <ErpPie data={erp.maximo.contratos.por_estatus} labelOf={maximoStatusLabel} colorOf={MAXIMO_STATUS_CHART_COLORS} noun="solicitudes" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#424846]">Órdenes por mes</p>
              <ErpMonths serie={erp.maximo.ordenes.serie_mensual} />
            </div>
            <div className="lg:col-span-3 space-y-2">
              <p className="text-sm font-medium text-[#424846]">Top proveedores por monto (OC)</p>
              {erp.maximo.top_proveedores.length === 0 ? (
                <Empty />
              ) : (
                erp.maximo.top_proveedores.map((row) => (
                  <HBar
                    key={`${row.proveedor}-${row.currency}`}
                    label={row.proveedor}
                    value={row.monto}
                    max={Math.max(...erp.maximo.top_proveedores.filter((r) => r.currency === row.currency).map((r) => r.monto), 1)}
                    display={`${formatCurrencyAmount(row.monto, row.currency)} · ${row.count}`}
                    color="bg-[#222D59]"
                    labelClassName="w-40 lg:w-72"
                    displayClassName="w-28 lg:w-48 lg:whitespace-nowrap"
                  />
                ))
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Tiempos de aprobación SAP + Maximo (sprint 2026-09-22, B3) */}
      <Section title="Tiempos de aprobación — SAP, Maximo y ABENT" note="días naturales; 'No disponible' = sin base para calcular">
        {tiemposQ.isError ? (
          <p className="text-sm text-red-600">No se pudo cargar el reporte de tiempos.</p>
        ) : !tiempos ? (
          <Empty />
        ) : (
          <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-[#424846] mb-2">Autorizaciones pendientes en SAP — quién las tiene y desde cuándo</p>
            <SapPendingApprovers tiempos={tiempos} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#424846]">Maximo — tiempo de aprobación</p>
              <div className="flex gap-4 flex-wrap text-sm text-gray-700">
                <span>OC (en espera → aprobada): <strong>{formatDays(tiempos.maximo.ordenes.promedio_dias)}</strong> ({tiempos.maximo.ordenes.total})</span>
                <span>Contratos: <strong>{formatDays(tiempos.maximo.contratos.promedio_dias)}</strong> ({tiempos.maximo.contratos.total})</span>
              </div>
              <p className="text-xs text-gray-500">Por aprobador (usuario Maximo que aprobó la OC)</p>
              {tiempos.maximo.ordenes_por_aprobador.length === 0 ? (
                <Empty text="Sin aprobaciones con aprobador identificado" />
              ) : (
                tiempos.maximo.ordenes_por_aprobador.map((row) => (
                  <HBar
                    key={row.aprobador}
                    label={row.aprobador}
                    value={row.promedio_dias}
                    max={Math.max(...tiempos.maximo.ordenes_por_aprobador.map((r) => r.promedio_dias), 1)}
                    display={`${formatDays(row.promedio_dias)} · ${row.total}`}
                    color="bg-[#222D59]"
                    labelClassName="w-52"
                  />
                ))
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#424846]">SAP — tiempo de autorización y gestión</p>
              <div className="flex gap-4 flex-wrap text-sm text-gray-700">
                <span title={tiempos.sap.gestion_oc.definicion}>
                  Gestión de OC (solicitud de pedido → OC): <strong>{formatDays(tiempos.sap.gestion_oc.promedio_dias)}</strong>
                  {tiempos.sap.gestion_oc.total > 0 && ` (promedio de ${tiempos.sap.gestion_oc.total.toLocaleString('es-MX')} OC con solicitud)`}
                </span>
                <span>Autorizadas: <strong>{formatDays(tiempos.sap.solicitudes_autorizadas.promedio_dias)}</strong> ({tiempos.sap.solicitudes_autorizadas.total})</span>
                <span>Pendientes: <strong>{tiempos.sap.pendientes.total}</strong>{tiempos.sap.pendientes.dias_esperando_promedio !== null && ` · esperando ${tiempos.sap.pendientes.dias_esperando_promedio} días en promedio`}</span>
              </div>
              <p className="text-xs text-gray-500">Por aprobador (usuario SAP que autorizó)</p>
              {tiempos.sap.por_aprobador.length === 0 ? (
                <Empty text="Sin autorizaciones sincronizadas todavía" />
              ) : (
                tiempos.sap.por_aprobador.map((row) => (
                  <HBar
                    key={row.aprobador}
                    label={row.aprobador}
                    value={row.promedio_dias}
                    max={Math.max(...tiempos.sap.por_aprobador.map((r) => r.promedio_dias), 1)}
                    display={`${formatDays(row.promedio_dias)} · ${row.total}`}
                    labelClassName="w-52"
                  />
                ))
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[#424846] mb-2">Flujo propio ABENT — por nivel</p>
            <AbentLevels niveles={tiempos.abent_niveles} stats={aprobaciones?.stats as ApprovalStats | undefined} />
          </div>
          </div>
        )}
      </Section>

      {/* Entregas + Contratos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Desempeño de entregas" note="acumulado">
          {!entregas ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                <span><strong>En tiempo:</strong> {entregas.stats.counts.en_tiempo}</span>
                <span><strong>En riesgo:</strong> {entregas.stats.counts.en_riesgo}</span>
                <span className="text-red-700"><strong>Retrasadas:</strong> {entregas.stats.counts.retrasada}</span>
                <span><strong>Entregadas:</strong> {entregas.stats.counts.entregada}</span>
                <span><strong>Retraso prom.:</strong> {formatDays(entregas.stats.avg_delay_days)}</span>
              </div>
              {entregas.on_time_por_proveedor.length === 0 ? (
                <Empty text="Aún no hay entregas completadas" />
              ) : (
                entregas.on_time_por_proveedor.map((row) => (
                  <HBar
                    key={row.proveedor}
                    label={row.proveedor}
                    value={row.rate}
                    max={100}
                    display={`${row.rate}% (${row.a_tiempo}/${row.entregadas})`}
                    color={row.rate >= 80 ? 'bg-[#52AF32]' : row.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                  />
                ))
              )}
            </div>
          )}
        </Section>
        <Section title="Contratos">
          {!contratos ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              <div className="flex gap-6 text-sm text-gray-600 flex-wrap">
                <span><strong>Vigentes:</strong> {contratos.vigentes.total} ({contratos.vigentes.total > 0 && contratos.vigentes.valor_total === 0 ? 'monto no disponible' : formatCurrency(contratos.vigentes.valor_total)})</span>
                <span><strong>Consumo prom.:</strong> {contratos.promedio_consumo_pct === null ? 'No disponible' : `${contratos.promedio_consumo_pct}%`}</span>
              </div>
              {contratos.por_vencer_30_dias.length === 0 ? (
                <Empty text="Sin contratos por vencer en 30 días" />
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700">Por vencer (≤30 días):</p>
                  {contratos.por_vencer_30_dias.map((contract) => (
                    <p key={contract.id} className="text-sm text-gray-700">
                      <span className="font-mono">{contract.contract_number}</span>
                      {' · '}{contract.proveedor}{' · vence '}
                      {new Date(contract.end_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Ahorro */}
      <Section
          title="Ahorro por fuente"
          note="fuentes no sumables entre sí"
        >
          {!ahorro ? (
            <Empty />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-[#424846]">ABENT</p>
                {ahorro.abent.disponible ? null : (
                  <p className="text-xs text-gray-500 mt-1">
                    No disponible: las requisiciones y órdenes de ABENT aún no registran el ahorro.
                  </p>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-[#424846]">Maximo</p>
                {ahorro.maximo.por_moneda.length === 0 ? (
                  <p className="text-xs text-gray-500 mt-1">Sin registros con ahorro</p>
                ) : (
                  ahorro.maximo.por_moneda.map((row) => (
                    <p key={row.currency} className="text-sm text-gray-700 mt-1">
                      <strong>{formatCurrencyAmount(row.total, row.currency)}</strong>{' '}
                      <span className="text-xs text-gray-500">({row.registros} {row.registros === 1 ? 'PO' : 'POs'})</span>
                    </p>
                  ))
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Sin clasificar (histórico): {ahorro.maximo.sin_clasificar} {ahorro.maximo.sin_clasificar === 1 ? 'PO' : 'POs'}
                </p>
              </div>
            </div>
          )}
      </Section>

      {/* Maximo */}
      <Section title="Maximo — volumen" note="históricos con campos vacíos = sin clasificar">
        {maximoPendiente ? (
          <Empty text="Sincronización pendiente de activación (configuración del servidor)" />
        ) : !maximo ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#424846]">Órdenes por estatus</p>
              {maximo.purchase_orders.por_estatus.map((row) => (
                <HBar
                  key={row.status}
                  label={row.status === 'sin_clasificar' ? 'Sin clasificar' : maximoStatusLabel(row.status)}
                  value={row.count}
                  max={Math.max(...maximo.purchase_orders.por_estatus.map((r) => r.count), 1)}
                  color={row.status === 'sin_clasificar' ? 'bg-gray-400' : 'bg-[#52AF32]'}
                />
              ))}
              <p className="text-xs text-gray-500">
                Sin fecha de aprobación: {maximo.purchase_orders.sin_fecha_aprobacion} {maximo.purchase_orders.sin_fecha_aprobacion === 1 ? 'PO' : 'POs'}
                (fuera de la serie mensual)
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#424846]">Contratos por estatus</p>
              {maximo.contracts.por_estatus.length === 0 ? (
                <Empty text="Sin contratos de Maximo en el periodo" />
              ) : (
                maximo.contracts.por_estatus.map((row) => (
                  <HBar
                    key={row.status}
                    label={row.status === 'sin_clasificar' ? 'Sin clasificar' : maximoStatusLabel(row.status)}
                    value={row.count}
                    max={Math.max(...maximo.contracts.por_estatus.map((r) => r.count), 1)}
                    color={row.status === 'sin_clasificar' ? 'bg-gray-400' : 'bg-[#222D59]'}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </Section>
      {/* Captura propia de ABENT */}
      {abentVacio ? (
        <Section title="Registros propios de ABENT" note="requisiciones, órdenes y comité capturados en ABENT">
          <p className="text-sm text-gray-700">
            En este periodo todavía no hay requisiciones, órdenes ni comités capturados directamente en ABENT, así que
            sus gráficas (creadas vs cerradas, monto adjudicado, top proveedores, tiempos del comité) aparecerán aquí en
            cuanto el equipo empiece a capturar. Lo de SAP y Maximo ya está arriba.
          </p>
        </Section>
      ) : (
        <>
      {/* Requisiciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Requisiciones ABENT — creadas vs cerradas por mes">
          {!rq || rq.serie_mensual.every((m) => m.creadas === 0 && m.cerradas === 0) ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {rq.serie_mensual.map((m) => {
                const max = Math.max(
                  1,
                  ...rq.serie_mensual.map((x) => Math.max(x.creadas, x.cerradas)),
                );
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <div className="w-14 text-xs text-gray-500">{monthLabel(m.month)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#52AF32]" style={{ width: `${(m.creadas / max) * 100}%` }} />
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#222D59]" style={{ width: `${(m.cerradas / max) * 100}%` }} />
                      </div>
                    </div>
                    <div className="w-20 text-xs text-right text-gray-600">
                      {m.creadas} / {m.cerradas}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 pt-1">
                <span className="inline-block w-2 h-2 bg-[#52AF32] rounded-full mr-1" />creadas
                <span className="inline-block w-2 h-2 bg-[#222D59] rounded-full ml-3 mr-1" />cerradas
              </p>
            </div>
          )}
        </Section>

        <Section title="Requisiciones ABENT — por estatus y tipo">
          {!rq || rq.por_estatus.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {rq.por_estatus.map((row) => (
                <HBar
                  key={row.status}
                  label={row.status.replace(/_/g, ' ')}
                  value={row.count}
                  max={Math.max(...rq.por_estatus.map((r) => r.count))}
                  display={`${row.count} · ${formatCurrency(row.monto)}`}
                />
              ))}
              <div className="pt-2 flex gap-6 text-sm text-gray-600">
                {rq.por_tipo.map((t) => (
                  <span key={t.expense_type}>
                    <strong>{t.expense_type}:</strong> {t.count} ({formatCurrency(t.monto)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Órdenes y montos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Órdenes ABENT — monto adjudicado por mes">
          {!po || po.serie_mensual.every((m) => m.count === 0) ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {po.serie_mensual.map((m) => (
                <HBar
                  key={m.month}
                  label={monthLabel(m.month)}
                  value={m.monto}
                  max={Math.max(1, ...po.serie_mensual.map((x) => x.monto))}
                  display={`${m.count} PO · ${formatCurrency(m.monto)}`}
                  color="bg-[#222D59]"
                />
              ))}
              <div className="pt-2 flex gap-6 text-sm text-gray-600">
                {po.por_tipo_gasto.map((t) => (
                  <span key={t.expense_type}>
                    <strong>{t.expense_type}:</strong> {formatCurrency(t.monto)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section title="Órdenes ABENT — top proveedores y tipo de compra">
          {!po || po.top_proveedores.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {po.top_proveedores.map((row) => (
                <HBar
                  key={row.proveedor}
                  label={row.proveedor}
                  value={row.monto}
                  max={Math.max(...po.top_proveedores.map((r) => r.monto))}
                  display={formatCurrency(row.monto)}
                />
              ))}
              {po.por_tipo_compra.length > 0 && (
                <div className="pt-2 text-sm text-gray-600 space-y-1">
                  {po.por_tipo_compra.map((t) => (
                    <p key={t.tipo}>
                      {t.tipo}: {t.count} PO · {formatCurrency(t.monto)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Comité (cierra el pendiente de §16) */}
      <Section title="Comité de Compras — tiempos por aprobador" note="acumulado">
        {!comite || comite.tiempos.byApprover.length === 0 ? (
          <Empty text="Sin comités con aprobaciones registradas" />
        ) : (
          <div className="space-y-2">
            {comite.tiempos.byApprover.map((approver) => (
              <HBar
                key={approver.approver_profile_id}
                label={approver.full_name ?? '—'}
                value={approver.avg_hours}
                max={Math.max(1, ...comite.tiempos.byApprover.map((a) => a.avg_hours))}
                display={`${approver.avg_hours} h · ${approver.actions} acciones`}
                highlight={approver.bottleneck}
              />
            ))}
            <div className="pt-2 flex gap-6 text-sm text-gray-600 flex-wrap">
              <span><strong>Prom. total del flujo:</strong> {comite.tiempos.avgTotalHours ?? '—'} h</span>
              {comite.tiempos.byStatus.map((s) => (
                <span key={s.status}>{s.status}: {s.count}</span>
              ))}
            </div>
            {comite.tiempos.rejectionRateByLevel.length > 0 && (
              <p className="text-xs text-gray-400">
                Rechazo por nivel:{' '}
                {comite.tiempos.rejectionRateByLevel
                  .map((l) => `N${l.level} ${l.rate}%`)
                  .join(' · ')}
                {' — '}En rojo: cuello de botella (&gt;72 h)
              </p>
            )}
          </div>
        )}
      </Section>

        </>
      )}
    </div>
  );
}
