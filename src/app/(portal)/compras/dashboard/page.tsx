'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatAmounts, formatDays, NO_DISPONIBLE } from '@/lib/compras-format';
import { PieChart } from '@/components/charts/PieChart';
import {
  ApprovalStats,
  DashboardSummary,
  MaximoSummary,
  maximoStatusLabel,
  SapSummary,
  sapStatusLabel,
} from '@/types/purchases';

/**
 * Sprint 2026-09-22 (A1/A2/A3) — Dashboard de Compras con las TRES fuentes
 * (SAP + Maximo + propias): tarjetas KPI desde GET /compras/dashboard/summary
 * (agregado en SQL, montos por moneda, "No disponible" cuando no hay base),
 * cuatro pies por estatus con clic → tabla filtrada, y las tarjetas de
 * detalle de cada ERP. Errores de carga visibles (no se ocultan en silencio).
 */

const Icons = {
  document: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  clock: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  truck: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
};

const PIE_COLORS = ['#52AF32', '#222D59', '#DFA922', '#67B52E', '#3b82f6', '#f59e0b', '#ef4444', '#74B82B', '#424846'];

/** Colores fijos por estatus (mismos que los badges) para que un pie sea legible. */
const SAP_COLORS: Record<string, string> = { open: '#52AF32', close: '#9ca3af', cancelled: '#ef4444' };
const MAXIMO_COLORS: Record<string, string> = {
  APPR: '#52AF32',
  WAPPR: '#f59e0b',
  PNDREV: '#DFA922',
  REVISD: '#3b82f6',
  INPRG: '#222D59',
  COMP: '#67B52E',
  CLOSE: '#9ca3af',
  CAN: '#ef4444',
  CANCEL: '#ef4444',
};

type SourceKpi = { total?: number; count?: number; pendientes?: number };

function KpiCard({
  label,
  value,
  sub,
  hint,
  icon,
  border,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  hint: string;
  icon: React.ReactNode;
  border: string;
  color: string;
}) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${border}`} title={hint}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            {label}
            <span className="text-gray-300" aria-label="Definición">ⓘ</span>
          </p>
          <p className="text-2xl font-bold text-[#424846] truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1 leading-snug">{sub}</p>}
        </div>
        <div className={`${color} shrink-0`}>{icon}</div>
      </div>
    </div>
  );
}

function StatusPie({
  title,
  data,
  labelOf,
  colorOf,
  onSlice,
  emptyText,
}: {
  title: string;
  data: Array<{ status: string | null; count: number }>;
  labelOf: (s: string | null) => string;
  colorOf: (s: string | null) => string | undefined;
  onSlice: (status: string | null) => void;
  emptyText: string;
}) {
  const rows = data
    .filter((d) => d.count > 0)
    .map((d) => ({ key: d.status ?? 'sin_estatus', name: labelOf(d.status), value: d.count, status: d.status }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const colors = rows.map((r, i) => colorOf(r.status) ?? PIE_COLORS[i % PIE_COLORS.length]);
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-base font-semibold text-[#424846]">{title}</h3>
        <span className="text-sm text-gray-500">{total.toLocaleString('es-MX')} en total</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-10 text-center">{emptyText}</p>
      ) : (
        <>
          <PieChart
            data={rows}
            dataKey="value"
            nameKey="name"
            colors={colors}
            height={260}
            onSliceClick={(entry) => onSlice((entry as { status: string | null }).status)}
          />
          <p className="text-xs text-gray-400 text-center">Clic en una rebanada para ver esas órdenes</p>
        </>
      )}
    </div>
  );
}

const fuente = (
  s: { sap: SourceKpi; maximo: SourceKpi; abent: SourceKpi },
  key: 'total' | 'count' | 'pendientes',
) => `SAP ${s.sap[key] ?? 0} · Maximo ${s.maximo[key] ?? 0} · ABENT ${s.abent[key] ?? 0}`;

export default function ComprasDashboardPage() {
  const router = useRouter();

  const summaryQ = useQuery({
    queryKey: ['compras', 'dashboard', 'summary'],
    queryFn: () => api.get<DashboardSummary>('/compras/dashboard/summary'),
  });
  const sapQ = useQuery({
    queryKey: ['sap', 'summary'],
    queryFn: () => api.get<SapSummary>('/sap/summary'),
  });
  const maximoQ = useQuery({
    queryKey: ['maximo', 'summary'],
    queryFn: () => api.get<MaximoSummary>('/maximo/summary'),
  });
  const approvalStatsQuery = useQuery({
    queryKey: ['approvals', 'stats'],
    queryFn: () => api.get<ApprovalStats>('/approvals/stats'),
  });

  const summary = summaryQ.data;
  const sap = sapQ.data;
  const maximo = maximoQ.data;
  const approvalStats = approvalStatsQuery.data;

  const goSapOrders = (status: string | null) =>
    router.push(`/compras/ordenes?tab=sap_po${status ? `&status=${status}` : ''}`);
  const goSapRequests = (status: string | null) =>
    router.push(`/compras/solicitudes?tab=sap_pr${status ? `&status=${status}` : ''}`);
  const goMaximoOrders = (status: string | null) =>
    router.push(`/compras/ordenes?tab=maximo_po${status ? `&status=${status}` : ''}`);
  const goMaximoRequests = (status: string | null) =>
    router.push(`/compras/solicitudes?tab=maximo_pr${status ? `&status=${status}` : ''}`);

  const diasGestion: Array<[string, number | null]> = summary
    ? [
        ['SAP solicitudes', summary.dias_gestion.sap_solicitudes],
        ['SAP OC', summary.dias_gestion.sap_ordenes],
        ['Maximo OC', summary.dias_gestion.maximo_ordenes],
        ['ABENT', summary.dias_gestion.abent_requisiciones],
      ]
    : [];
  const diasConBase = diasGestion.filter(([, v]) => v !== null);
  const diasPromedio =
    diasConBase.length === 0
      ? null
      : Math.round((diasConBase.reduce((s, [, v]) => s + (v as number), 0) / diasConBase.length) * 10) / 10;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Dashboard de Compras</h1>
          <p className="text-gray-500">SAP Business One + Maximo + registros propios de ABENT</p>
        </div>
        <Link
          href="/compras/reportes"
          className="px-4 py-2 text-sm bg-white border border-gray-200 text-[#424846] rounded-lg hover:bg-gray-50 transition-colors"
        >
          Ver reportes
        </Link>
      </div>

      {/* KPIs (A1) */}
      {summaryQ.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : summaryQ.isError || !summary ? (
        <div className="bg-white p-6 rounded-lg shadow text-red-600">
          No se pudo cargar el resumen del dashboard. Intenta de nuevo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            label="Solicitudes totales"
            value={summary.solicitudes.total.toLocaleString('es-MX')}
            sub={fuente(summary.solicitudes.por_fuente, 'total')}
            hint="Solicitudes de pedido de SAP + solicitudes (PR) de Maximo + requisiciones de ABENT. Fuente: staging sincronizado de cada ERP."
            icon={Icons.document}
            border="border-blue-500"
            color="text-blue-500"
          />
          <KpiCard
            label="Pendientes de gestionar"
            value={summary.solicitudes.pendientes.toLocaleString('es-MX')}
            sub={fuente(summary.solicitudes.por_fuente, 'pendientes')}
            hint="SAP: solicitudes abiertas no canceladas. Maximo: PR en espera de aprobación (WAPPR) o pendientes de revisión (PNDREV). ABENT: en revisión o en aprobación."
            icon={Icons.clock}
            border="border-yellow-500"
            color="text-yellow-500"
          />
          <KpiCard
            label="Días promedio de gestión"
            value={diasPromedio === null ? NO_DISPONIBLE : formatDays(diasPromedio)}
            sub={diasGestion.map(([k, v]) => `${k}: ${v === null ? 'N/D' : v}`).join(' · ')}
            hint="SAP: fecha de cierre (o última actualización) − fecha del documento, de las cerradas. Maximo: aprobación − primer WAPPR de las OC aprobadas. ABENT: días hábiles de las requisiciones cerradas. Promedio simple de las fuentes con datos; N/D = sin base."
            icon={Icons.clock}
            border="border-[#DFA922]"
            color="text-[#DFA922]"
          />
          <KpiCard
            label="Órdenes de compra"
            value={summary.ordenes.total.toLocaleString('es-MX')}
            sub={`${formatAmounts(summary.ordenes.monto_por_moneda)} · ${fuente(summary.ordenes.por_fuente, 'count')}`}
            hint="OC no canceladas de SAP (DocTotal) + OC vigentes de Maximo (TOTALCOST) + OC propias. Montos por moneda: nunca se suman MXN con USD."
            icon={Icons.check}
            border="border-[#52AF32]"
            color="text-[#52AF32]"
          />
          <KpiCard
            label="OC abiertas (por recibir)"
            value={summary.por_recibir.total.toLocaleString('es-MX')}
            sub={`${formatAmounts(summary.por_recibir.monto_por_moneda)} · ${fuente(summary.por_recibir.por_fuente, 'count')}`}
            hint="SAP no reporta 'en tránsito': se usan las OC abiertas (bost_Open, no canceladas). Maximo: OC en APPR o INPRG. ABENT: emitida/enviada/confirmada/en tránsito."
            icon={Icons.truck}
            border="border-orange-500"
            color="text-orange-500"
          />
        </div>
      )}

      {/* Pies por estatus (A2) */}
      {(sapQ.isError || maximoQ.isError) && (
        <div className="bg-white p-4 rounded-lg shadow text-sm text-red-600">
          {sapQ.isError && 'No se pudo cargar el resumen de SAP. '}
          {maximoQ.isError && 'No se pudo cargar el resumen de Maximo.'}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusPie
          title="Órdenes de compra SAP — por estatus"
          data={sap?.purchaseOrders.byStatus ?? []}
          labelOf={sapStatusLabel}
          colorOf={(s) => (s ? SAP_COLORS[s] : undefined)}
          onSlice={goSapOrders}
          emptyText={sap && !sap.syncEnabled ? 'Sincronización de SAP pendiente de activación' : 'Sin órdenes sincronizadas'}
        />
        <StatusPie
          title="Solicitudes de pedido SAP — por estatus"
          data={sap?.purchaseRequests.byStatus ?? []}
          labelOf={sapStatusLabel}
          colorOf={(s) => (s ? SAP_COLORS[s] : undefined)}
          onSlice={goSapRequests}
          emptyText={sap && !sap.syncEnabled ? 'Sincronización de SAP pendiente de activación' : 'Sin solicitudes sincronizadas'}
        />
        <StatusPie
          title="Órdenes de compra Maximo — por estatus"
          data={maximo?.purchaseOrders.byStatus ?? []}
          labelOf={maximoStatusLabel}
          colorOf={(s) => (s ? MAXIMO_COLORS[s] : undefined)}
          onSlice={goMaximoOrders}
          emptyText={maximo && !maximo.syncEnabled ? 'Sincronización de Maximo pendiente de activación' : 'Sin órdenes sincronizadas'}
        />
        <StatusPie
          title="Solicitudes / contratos Maximo — por estatus"
          data={maximo?.contracts.byStatus ?? []}
          labelOf={maximoStatusLabel}
          colorOf={(s) => (s ? MAXIMO_COLORS[s] : undefined)}
          onSlice={goMaximoRequests}
          emptyText={maximo && !maximo.syncEnabled ? 'Sincronización de Maximo pendiente de activación' : 'Sin solicitudes sincronizadas'}
        />
      </div>

      {/* Detalle SAP */}
      {sap && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#424846]">SAP Business One</h3>
            {!sap.syncEnabled && (
              <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                Pendiente de activacion
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Órdenes de compra</p>
              <p className="text-2xl font-bold text-[#424846]">{sap.purchaseOrders.total}</p>
              <p className="text-xs text-gray-600 mt-1">{formatAmounts(sap.purchaseOrders.montoPorMoneda)}</p>
              <p className="mt-2 text-xs text-gray-500">
                {sap.purchaseOrders.linesClassified > 0
                  ? `${sap.purchaseOrders.linesClassified} de ${sap.purchaseOrders.linesTotal} lineas clasificadas`
                  : 'Clasificacion aun sin capturar en el ERP'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Solicitudes de pedido</p>
              <p className="text-2xl font-bold text-[#424846]">{sap.purchaseRequests.total}</p>
              <p className="text-xs text-gray-600 mt-1">{formatAmounts(sap.purchaseRequests.montoPorMoneda)}</p>
              <p className="mt-2 text-xs text-gray-500">
                Días promedio de gestión: {formatDays(sap.purchaseRequests.diasPromedioGestion)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cola de autorización</p>
              <p className="text-2xl font-bold text-[#424846]">{sap.approvalRequests.pending}</p>
              <p className="text-xs text-gray-500 mt-1">
                pendientes de autorizar en SAP ·{' '}
                <Link href="/compras/aprobaciones" className="text-[#52AF32] hover:underline">ver bandeja</Link>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ultima sincronizacion</p>
              {(['purchase_orders', 'purchase_requests', 'approval_requests'] as const).map((t) => {
                const run = sap.lastSync[t];
                return (
                  <p key={t} className="text-sm text-gray-700 mt-1">
                    {t === 'purchase_orders' ? 'Ordenes' : t === 'purchase_requests' ? 'Solicitudes' : 'Autorizaciones'}:{' '}
                    {run
                      ? `${new Date(run.started_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (${run.status})`
                      : 'sin corridas'}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detalle Maximo */}
      {maximo && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#424846]">Maximo</h3>
            {!maximo.syncEnabled && (
              <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                Pendiente de activacion
              </span>
            )}
          </div>
          {maximo.purchaseOrders.total === 0 && maximo.contracts.total === 0 && !maximo.syncEnabled ? (
            <p className="text-sm text-gray-500">
              Sincronizacion pendiente de activacion (configuracion del servidor). Los datos de Maximo apareceran aqui en cuanto se habilite.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Órdenes de Maximo</p>
                <p className="text-2xl font-bold text-[#424846]">{maximo.purchaseOrders.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contratos de Maximo</p>
                <p className="text-2xl font-bold text-[#424846]">
                  {maximo.contracts.total}
                  <span className="ml-2 text-sm font-normal text-gray-500">({maximo.contracts.withContract} con contrato)</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ultima sincronizacion</p>
                {(['purchase_orders', 'contracts'] as const).map((t) => {
                  const run = maximo.lastSync[t];
                  return (
                    <p key={t} className="text-sm text-gray-700 mt-1">
                      {t === 'purchase_orders' ? 'Ordenes' : 'Contratos'}:{' '}
                      {run
                        ? `${new Date(run.started_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (${run.status})`
                        : 'sin corridas'}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tiempos de aprobación del flujo propio (ABENT) */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-[#424846]">Tiempos de aprobación por nivel (flujo ABENT)</h3>
          <Link href="/compras/reportes" className="text-sm text-[#52AF32] hover:underline">
            Tiempos de SAP y Maximo en Reportes
          </Link>
        </div>
        {!approvalStats || Object.values(approvalStats).every((l) => l.total === 0) ? (
          <p className="text-sm text-gray-500">Sin aprobaciones registradas en el flujo propio todavía.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.values(approvalStats).map((level) => (
              <div key={level.level} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">{level.level_name}</p>
                <p className="text-2xl font-bold text-[#424846]">{level.average_time_days} dias</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-green-600">{level.approved} aprobadas</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-red-600">{level.rejected} rechazadas</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">Tasa: {level.approval_rate}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
