'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  AmountLine,
  formatAmountLines,
  formatDays,
  formatOrderAmountLines,
  NO_DISPONIBLE,
  subtotalNota,
} from '@/lib/compras-format';
import { SHOW_INTERNAL_REQUISITIONS } from '@/lib/features';
import { PieChart } from '@/components/charts/PieChart';
import AmountList from '@/components/compras/AmountList';
import { AbentLevels, SapPendingApprovers } from '@/components/compras/ApprovalDelays';
import { MaximoChainSummary, useCadenaMaximo } from '@/components/compras/MaximoChain';
import YearChips from '@/components/compras/YearChips';
import {
  ApprovalStats,
  ApprovalTimesReport,
  DashboardSummary,
  GestionStats,
  groupMaximoStatusCounts,
  MAXIMO_RUN_STATUS_LABELS,
  MAXIMO_STATUS_CHART_COLORS,
  MaximoSummary,
  maximoGroupLabel,
  maximoPrStatusLabel,
  SAP_STATUS_CHART_COLORS,
  SapSummary,
  sapStatusLabel,
  statusChartColors,
} from '@/types/purchases';
import { periodText } from '@/components/compras/LinkedFilterChips';

/**
 * Sprint 2026-09-22 (A1/A2/A3) — Dashboard de Compras con las TRES fuentes
 * (SAP + Maximo + propias): tarjetas KPI desde GET /compras/dashboard/summary
 * (agregado en SQL, montos por moneda, "No disponible" cuando no hay base),
 * cuatro pies por estatus con clic → tabla filtrada, y las tarjetas de
 * detalle de cada ERP. Errores de carga visibles (no se ocultan en silencio).
 *
 * Bloque 2026-09-23 (check-in Ingrid):
 *  - D4: cabecera "datos desde… / última sync", chips de año que filtran
 *    tarjetas, pies y montos (y viajan en los clics a las tablas); la tarjeta
 *    de pendientes navega a Solicitudes con el filtro de pendientes.
 *  - D1: las OC migradas de Maximo a SAP se cuentan una vez (desglose en la
 *    tarjeta de órdenes).
 *  - D3: días de gestión de OC SAP = OC − solicitud de pedido, con N visible.
 *  - D2: "Sin estatus en Maximo" explicado en el pie de solicitudes Maximo
 *    (K7 lo quita: el pie va por el estatus de la PR).
 *  - D7: el bloque del flujo propio solo se muestra si hay niveles con
 *    persona asignada (o si la captura propia está activa).
 *
 * Reunión con Ingrid 2026-09-28:
 *  - G2: "Días de gestión" = UN número por sistema (de la solicitud a la OC)
 *    con mediana y N; salen "SAP solicitudes" y el tiempo de aprobación de
 *    Maximo (vive en Aprobaciones/Reportes).
 *  - G3: "Pendientes de gestionar" = solicitudes sin OC (año o 12 meses) y
 *    navega a esas mismas solicitudes.
 *  - G7: WAPPR / APPRn / APPRnREV de Maximo se juntan como "En aprobación".
 *
 * Bloque K (2026-10-05, K7.9):
 *  - pie "Solicitudes Maximo (PR)" por el estatus DE LA PR
 *    (`maximo.requests`); el clic manda `pr_status` a Solicitudes;
 *  - Maximo en Solicitudes totales con "N llegaron a Compras"; Pendientes =
 *    PR aprobadas (APPR) sin OC ni contrato, con las WAPPR aparte;
 *  - días de gestión de Maximo con el dato "desde la aprobación";
 *  - montos de OC con su base (`monto_nota`) y el subtotal sin IVA por
 *    moneda como dato secundario (K6.3).
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

type SourceKpi = { total?: number; count?: number; pendientes?: number | null };

function KpiCard({
  label,
  value,
  lines,
  sub,
  hint,
  icon,
  border,
  color,
  onClick,
}: {
  label: string;
  value: string | number;
  /** Un renglón por dato (p. ej. un monto por moneda); K6: `sub` en letra chica. */
  lines?: Array<string | AmountLine>;
  sub?: string;
  hint: string;
  icon: React.ReactNode;
  border: string;
  color: string;
  /** D4: la tarjeta navega a su tabla filtrada. */
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <div
      className={`bg-white p-4 rounded-lg shadow border-l-4 ${border} ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      title={clickable ? `${hint} Clic para ver el detalle.` : hint}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-600">
            {label}
            <span className="ml-1 text-gray-400 cursor-help" aria-label="Definición">ⓘ</span>
          </p>
          <p className="text-2xl font-bold text-[#424846] truncate">{value}</p>
        </div>
        <div className={`${color} shrink-0`}>{icon}</div>
      </div>
      {lines && lines.length > 0 && <AmountList lines={lines} className="mt-2 space-y-0.5 text-sm text-gray-800" />}
      {sub && <p className="text-xs text-gray-600 mt-2 leading-snug">{sub}</p>}
      {clickable && <p className="text-xs text-[#52AF32] mt-1">Ver detalle →</p>}
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
  noun,
}: {
  title: string;
  data: Array<{ status: string | null; count: number; codes?: string[] }>;
  labelOf: (s: string | null) => string;
  colorOf: Record<string, string>;
  /** G7: `codes` = estatus reales detrás de un segmento agrupado. */
  onSlice: (status: string | null, codes?: string[]) => void;
  emptyText: string;
  /** "órdenes" / "solicitudes": texto del centro y de la ayuda. */
  noun: string;
}) {
  const rows = data
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((d) => ({ key: d.status ?? 'sin_estatus', name: labelOf(d.status), value: d.count, status: d.status, codes: d.codes }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const colors = statusChartColors(
    rows.map((r) => r.status),
    colorOf,
  );
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-[#424846]">{title}</h3>
        <span className="shrink-0 whitespace-nowrap text-sm text-gray-600">{total.toLocaleString('es-MX')} en total</span>
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
            height={240}
            centerCaption={noun}
            onSliceClick={(entry) => {
              const slice = entry as { status: string | null; codes?: string[] };
              onSlice(slice.status, slice.codes);
            }}
          />
          <p className="mt-2 text-xs text-gray-600 text-center">
            Clic en un estatus para ver esas {noun} en su tabla
          </p>
        </>
      )}
    </div>
  );
}

const kpiNumber = (v: number | null | undefined) =>
  v === null ? NO_DISPONIBLE : (v ?? 0).toLocaleString('es-MX');

/** `maximoExtra` va pegado al número de Maximo (K7.9: "(N llegaron a Compras)"). */
const fuente = (
  s: { sap: SourceKpi; maximo: SourceKpi; abent: SourceKpi },
  key: 'total' | 'count' | 'pendientes',
  maximoExtra = '',
) =>
  `SAP ${kpiNumber(s.sap[key])} · Maximo ${kpiNumber(s.maximo[key])}${maximoExtra}` +
  (SHOW_INTERNAL_REQUISITIONS || (s.abent[key] ?? 0) > 0 ? ` · ABENT ${kpiNumber(s.abent[key])}` : '');

const GESTION_HINT =
  'Días naturales desde que se crea la solicitud hasta que se crea la orden de compra (la fecha de la OC cierra la gestión). ' +
  'SAP: fecha de la solicitud de pedido (la más antigua, si hay varias) → fecha de la OC; solo OC que nacieron de una solicitud. ' +
  'Maximo: fecha de creación de la solicitud (PR) → fecha de la OC en Maximo; solo OC con PR. Si la línea de la OC no trae la fecha de su PR, se toma la de la PR (la más antigua, si hay varias). ' +
  'Maximo "desde la aprobación": de que la PR llega a Compras (su primera aprobación, APPR) a la fecha de la OC. ' +
  'La mediana es el caso típico: las OC capturadas meses después suben el promedio. Con año, cuentan las OC creadas ese año.';

type GestionRow = {
  label: string;
  stats: GestionStats | null;
  abent?: number | null;
  /** K7.9: dato secundario (Maximo desde la aprobación de la PR). */
  secondary?: { label: string; stats: GestionStats };
};

/** G2: un número por sistema (promedio y mediana) con su N. */
function GestionCard({ rows }: { rows: GestionRow[] }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#DFA922]" title={GESTION_HINT}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-600">
          Días de gestión (solicitud → OC)
          <span className="ml-1 text-gray-400 cursor-help" aria-label="Definición">ⓘ</span>
        </p>
        <div className="text-[#DFA922] shrink-0">{Icons.clock}</div>
      </div>
      <ul className="mt-1 space-y-2">
        {rows.map(({ label, stats, abent, secondary }) => {
          const promedio = stats ? stats.promedio_dias : (abent ?? null);
          return (
            <li key={label}>
              <p className="flex items-baseline gap-2">
                <span className="w-16 shrink-0 text-sm font-medium text-gray-700">{label}</span>
                <span className="text-xl font-bold text-[#424846] tabular-nums">
                  {promedio === null ? NO_DISPONIBLE : formatDays(promedio)}
                </span>
              </p>
              {stats && (
                <p className="pl-[4.5rem] -mt-0.5 text-xs text-gray-600 tabular-nums">
                  {stats.total === 0
                    ? 'sin OC con solicitud'
                    : `mediana ${formatDays(stats.mediana_dias)} · ${stats.total.toLocaleString('es-MX')} OC con solicitud`}
                </p>
              )}
              {secondary && (
                <p className="pl-[4.5rem] text-xs text-gray-500 tabular-nums" title={secondary.stats.definicion}>
                  {secondary.label}:{' '}
                  {secondary.stats.promedio_dias === null
                    ? NO_DISPONIBLE
                    : `${formatDays(secondary.stats.promedio_dias)} · mediana ${formatDays(secondary.stats.mediana_dias)} · ${secondary.stats.total.toLocaleString('es-MX')} OC`}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const monthYear = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) : null;
const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

export default function ComprasDashboardPage() {
  const router = useRouter();
  const [year, setYear] = useState<number | null>(null);
  const yearQs = year ? `?year=${year}` : '';
  const yearParam = year ? `&year=${year}` : '';

  const summaryQ = useQuery({
    queryKey: ['compras', 'dashboard', 'summary', year],
    queryFn: () => api.get<DashboardSummary>(`/compras/dashboard/summary${yearQs}`),
  });
  const sapQ = useQuery({
    queryKey: ['sap', 'summary', year],
    queryFn: () => api.get<SapSummary>(`/sap/summary${yearQs}`),
  });
  const maximoQ = useQuery({
    queryKey: ['maximo', 'summary', year],
    queryFn: () => api.get<MaximoSummary>(`/maximo/summary${yearQs}`),
  });
  const approvalStatsQuery = useQuery({
    queryKey: ['approvals', 'stats'],
    queryFn: () => api.get<ApprovalStats>('/approvals/stats'),
  });

  const summary = summaryQ.data;
  const sap = sapQ.data;
  const maximo = maximoQ.data;
  const approvalStats = approvalStatsQuery.data;
  const tiemposQ = useQuery({
    queryKey: ['reportes', 'tiempos-aprobacion'],
    queryFn: () => api.get<ApprovalTimesReport>('/compras/reportes/tiempos-aprobacion'),
  });
  const tiempos = tiemposQ.data;
  // G6: cadena de aprobación de Maximo (OC por nivel que esperan)
  const cadenaQ = useCadenaMaximo();

  const goSapOrders = (status: string | null) =>
    router.push(`/compras/ordenes?tab=sap_po${status ? `&status=${status}` : ''}${yearParam}`);
  // G7: el segmento "En aprobación" lleva todos sus estatus reales
  const goMaximoOrders = (status: string | null, codes?: string[]) => {
    const list = codes && codes.length > 0 ? codes.join(',') : status;
    router.push(`/compras/ordenes?tab=maximo_po${list ? `&status=${list}` : ''}${yearParam}`);
  };
  const goSapRequests = (status: string | null) =>
    router.push(`/compras/solicitudes?tab=sap_pr${status ? `&status=${status}` : ''}${yearParam}`);
  // K7.9: el pie de solicitudes de Maximo va por el estatus DE LA PR
  const goMaximoRequests = (status: string | null) =>
    router.push(`/compras/solicitudes?tab=maximo_pr${status ? `&pr_status=${status}` : ''}${yearParam}`);
  // G3: pendientes = solicitudes sin OC del periodo (cada pestaña con su filtro)
  const pendingPeriod = summary?.solicitudes.pendientes_periodo;
  const goPending = () =>
    router.push(
      `/compras/solicitudes?tab=sap_pr&status=open&sin_oc=true` +
        (year ? yearParam : pendingPeriod ? `&desde=${pendingPeriod.desde}` : ''),
    );

  const gestionRows: GestionRow[] = summary
    ? [
        { label: 'SAP', stats: summary.dias_gestion.sap },
        {
          label: 'Maximo',
          stats: summary.dias_gestion.maximo,
          secondary: { label: 'desde la aprobación', stats: summary.dias_gestion.maximo_desde_aprobacion },
        },
        ...(SHOW_INTERNAL_REQUISITIONS || summary.dias_gestion.abent !== null
          ? [{ label: 'ABENT', stats: null, abent: summary.dias_gestion.abent }]
          : []),
      ]
    : [];
  // K4/K7.9: Maximo cuenta PR (llegada a Compras = primer APPR; WAPPR aparte)
  const maximoPr = summary?.solicitudes.por_fuente.maximo;
  const llegaron = maximoPr
    ? maximoPr.llegaron_a_compras === null
      ? ' (llegada a Compras no disponible)'
      : ` (${maximoPr.llegaron_a_compras.toLocaleString('es-MX')} llegaron a Compras)`
    : '';
  const sinLimite =
    summary && maximoPr
      ? `Sin límite de fecha: SAP ${summary.solicitudes.por_fuente.sap.pendientes_sin_limite.toLocaleString('es-MX')} · Maximo ${maximoPr.pendientes_sin_limite.toLocaleString('es-MX')} (y ${maximoPr.en_aprobacion_sin_limite.toLocaleString('es-MX')} en aprobación).`
      : '';
  const migradas = summary?.ordenes.migradas;
  // G6: los niveles 1/2/3 y Director General son del Comité (CCC), no de
  // las aprobaciones de SAP/Maximo: solo se muestran con la captura propia
  const showAbentLevels = SHOW_INTERNAL_REQUISITIONS;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Dashboard de Compras</h1>
          <p className="text-gray-500">SAP Business One + Maximo{SHOW_INTERNAL_REQUISITIONS ? ' + registros propios de ABENT' : ''}</p>
          {summary && (
            <p className="mt-1 text-xs text-gray-600">
              Datos desde {monthYear(summary.datos.sap_desde) ?? '—'} (SAP) y {monthYear(summary.datos.maximo_desde) ?? '—'} (Maximo) ·
              sincronización cada hora · última: SAP {dateTime(summary.datos.ultima_sync.sap) ?? 'sin corridas'}, Maximo{' '}
              {dateTime(summary.datos.ultima_sync.maximo) ?? 'sin corridas'}
            </p>
          )}
        </div>
        <Link
          href="/compras/reportes"
          className="px-4 py-2 text-sm bg-white border border-gray-200 text-[#424846] rounded-lg hover:bg-gray-50 transition-colors"
        >
          Ver reportes
        </Link>
      </div>

      {/* D4: filtro por año (los años vienen de los datos sincronizados) */}
      {summary && summary.datos.anios.length > 0 && (
        <div className="bg-white px-4 py-3 rounded-lg shadow flex flex-wrap items-center justify-between gap-3">
          <YearChips years={summary.datos.anios} value={year} onChange={setYear} />
          <span className="text-xs text-gray-500">
            {year
              ? `Tarjetas, gráficas y montos acotados a ${year} (SAP por fecha del documento; Maximo: órdenes por su fecha y solicitudes por la fecha de la PR).`
              : 'Todos los años sincronizados.'}
          </span>
        </div>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
          <KpiCard
            label="Solicitudes totales"
            value={summary.solicitudes.total.toLocaleString('es-MX')}
            sub={fuente(summary.solicitudes.por_fuente, 'total', llegaron)}
            hint={
              'Solicitudes de pedido de SAP (por su fecha) + solicitudes (PR) de Maximo, una por PR, por su fecha de creación (ISSUEDATE). ' +
              '"Llegaron a Compras" = las PR de Maximo que ya se aprobaron (APPR). Fuente: staging sincronizado de cada ERP.'
            }
            icon={Icons.document}
            border="border-blue-500"
            color="text-blue-500"
            onClick={() => goSapRequests(null)}
          />
          <KpiCard
            label="Pendientes de gestionar"
            value={summary.solicitudes.pendientes.toLocaleString('es-MX')}
            sub={[
              fuente(summary.solicitudes.por_fuente, 'pendientes'),
              year ? `de ${year}` : periodText(pendingPeriod?.desde),
              // I8: las de contrato se muestran aparte (la OC se genera sola)
              summary.solicitudes.por_fuente.maximo.de_contrato
                ? `aparte, ${summary.solicitudes.por_fuente.maximo.de_contrato.toLocaleString('es-MX')} de contrato`
                : '',
              // K7.9: las WAPPR todavía no llegan a Compras (no son pendientes)
              summary.solicitudes.por_fuente.maximo.en_aprobacion !== null
                ? `${summary.solicitudes.por_fuente.maximo.en_aprobacion.toLocaleString('es-MX')} en aprobación`
                : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            hint={
              'Solicitudes que todavía no tienen orden de compra (la gestión termina cuando nace la OC). ' +
              'SAP: solicitudes de pedido abiertas que ninguna OC usa como base, por su fecha. ' +
              'Maximo: PR aprobadas (APPR, ya en Compras) sin OC ni contrato, por fecha de aprobación; las que están en aprobación (WAPPR) van aparte. ' +
              'Las PR de contrato sin OC van aparte ("de contrato"): la OC se genera en automático y no son carga de Compras. ' +
              (year ? `Del ${year}. ` : 'Solo las de los últimos 12 meses, para no contar solicitudes históricas que nunca se cerraron. ') +
              sinLimite
            }
            icon={Icons.clock}
            border="border-yellow-500"
            color="text-yellow-500"
            onClick={goPending}
          />
          <GestionCard rows={gestionRows} />
          <KpiCard
            label="Órdenes de compra"
            value={summary.ordenes.total.toLocaleString('es-MX')}
            lines={formatOrderAmountLines(summary.ordenes.monto_por_moneda, summary.ordenes.monto_base)}
            sub={
              fuente(summary.ordenes.por_fuente, 'count') +
              (migradas && migradas.total > 0
                ? ` · ${migradas.en_maximo.toLocaleString('es-MX')} migradas de Maximo a SAP contadas una sola vez` +
                  (migradas.total > migradas.en_maximo
                    ? ` (${(migradas.total - migradas.en_maximo).toLocaleString('es-MX')} con referencia a Maximo que no existe allá sí cuentan)`
                    : '')
                : '')
            }
            hint={
              `OC no canceladas de SAP + OC vigentes de Maximo. Montos ${summary.ordenes.monto_nota}. ${subtotalNota(summary.ordenes.monto_base)} ` +
              'Una OC que Maximo migró a SAP se cuenta una sola vez (del lado de Maximo). Montos por moneda: nunca se suman MXN con USD.'
            }
            icon={Icons.check}
            border="border-[#52AF32]"
            color="text-[#52AF32]"
            onClick={() => goSapOrders(null)}
          />
          <KpiCard
            label="OC abiertas (por recibir)"
            value={summary.por_recibir.total.toLocaleString('es-MX')}
            lines={formatAmountLines(summary.por_recibir.monto_por_moneda)}
            sub={fuente(summary.por_recibir.por_fuente, 'count')}
            hint={
              "SAP no reporta 'en tránsito': se usan las OC abiertas (bost_Open, no canceladas), contadas una vez si vienen de Maximo. Maximo: OC en APPR o INPRG. " +
              `Montos ${summary.por_recibir.monto_nota}.`
            }
            icon={Icons.truck}
            border="border-orange-500"
            color="text-orange-500"
            onClick={() => goSapOrders('open')}
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
          title={`Órdenes de compra SAP — por estatus${year ? ` (${year})` : ''}`}
          data={sap?.purchaseOrders.byStatus ?? []}
          labelOf={sapStatusLabel}
          colorOf={SAP_STATUS_CHART_COLORS}
          onSlice={goSapOrders}
          noun="órdenes"
          emptyText={sap && !sap.syncEnabled ? 'Sincronización de SAP pendiente de activación' : 'Sin órdenes sincronizadas'}
        />
        <StatusPie
          title={`Solicitudes de pedido SAP — por estatus${year ? ` (${year})` : ''}`}
          data={sap?.purchaseRequests.byStatus ?? []}
          labelOf={sapStatusLabel}
          colorOf={SAP_STATUS_CHART_COLORS}
          onSlice={goSapRequests}
          noun="solicitudes"
          emptyText={sap && !sap.syncEnabled ? 'Sincronización de SAP pendiente de activación' : 'Sin solicitudes sincronizadas'}
        />
        <StatusPie
          title={`Órdenes de compra Maximo — por estatus${year ? ` (${year})` : ''}`}
          data={groupMaximoStatusCounts(maximo?.purchaseOrders.byStatus ?? [])}
          labelOf={maximoGroupLabel}
          colorOf={MAXIMO_STATUS_CHART_COLORS}
          onSlice={goMaximoOrders}
          noun="órdenes"
          emptyText={maximo && !maximo.syncEnabled ? 'Sincronización de Maximo pendiente de activación' : 'Sin órdenes sincronizadas'}
        />
        {/* K7.9: una por PR, por su estatus (WAPPR, APPR, CLOSE, CAN); sin agrupar */}
        <StatusPie
          title={`Solicitudes Maximo (PR) — por estatus${year ? ` (${year})` : ''}`}
          data={maximo?.requests.byStatus ?? []}
          labelOf={maximoPrStatusLabel}
          colorOf={MAXIMO_STATUS_CHART_COLORS}
          onSlice={goMaximoRequests}
          noun="solicitudes"
          emptyText={maximo && !maximo.syncEnabled ? 'Sincronización de Maximo pendiente de activación' : 'Sin solicitudes sincronizadas'}
        />
      </div>

      {/* Detalle SAP */}
      {sap && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#424846]">SAP Business One{year ? ` · ${year}` : ''}</h3>
            {!sap.syncEnabled && (
              <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                Pendiente de activación
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Órdenes de compra</p>
              <p className="text-2xl font-bold text-[#424846]">{sap.purchaseOrders.total.toLocaleString('es-MX')}</p>
              <div title={`Montos ${sap.purchaseOrders.montoBase === 'sin_iva' ? 'sin IVA' : 'con IVA (DocTotal)'}. ${subtotalNota(sap.purchaseOrders.montoBase)}`}>
                <AmountList
                  lines={formatOrderAmountLines(sap.purchaseOrders.montoPorMoneda, sap.purchaseOrders.montoBase)}
                  className="mt-1 text-xs text-gray-600"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {sap.purchaseOrders.linesClassified > 0
                  ? `${sap.purchaseOrders.linesClassified.toLocaleString('es-MX')} de ${sap.purchaseOrders.linesTotal.toLocaleString('es-MX')} líneas clasificadas`
                  : 'Clasificación aún sin capturar en el ERP'}
              </p>
              {sap.migradas.total > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  <button type="button" onClick={() => router.push(`/compras/ordenes?tab=sap_po&origin=maximo${yearParam}`)} className="text-[#52AF32] hover:underline">
                    {sap.migradas.total.toLocaleString('es-MX')} creadas desde Maximo
                  </button>
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Solicitudes de pedido</p>
              <p className="text-2xl font-bold text-[#424846]">{sap.purchaseRequests.total.toLocaleString('es-MX')}</p>
              {/* K6: las solicitudes de SAP ya son sin IVA (suma de sus líneas) */}
              <ul className="mt-1 text-xs text-gray-600 tabular-nums" title="Montos sin IVA (suma de las líneas de la solicitud)">
                {formatAmountLines(sap.purchaseRequests.montoPorMoneda).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {/* G2: la misma gestión de la tarjeta (solicitud → OC), no el cierre del documento */}
              {summary && (
                <p className="mt-2 text-xs text-gray-500" title={summary.dias_gestion.sap.definicion}>
                  Días de gestión (solicitud → OC): {formatDays(summary.dias_gestion.sap.promedio_dias)}
                  {summary.dias_gestion.sap.mediana_dias !== null && ` · mediana ${formatDays(summary.dias_gestion.sap.mediana_dias)}`}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Cola de autorización</p>
              <p className="text-2xl font-bold text-[#424846]">{sap.approvalRequests.pending.toLocaleString('es-MX')}</p>
              <p className="text-xs text-gray-500 mt-1">
                pendientes de autorizar en SAP ·{' '}
                <Link href="/compras/aprobaciones" className="whitespace-nowrap text-[#52AF32] hover:underline">ver bandeja</Link>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Última sincronización</p>
              {(['purchase_orders', 'purchase_requests', 'approval_requests'] as const).map((t) => {
                const run = sap.lastSync[t];
                return (
                  <p key={t} className="text-sm text-gray-700 mt-1">
                    {t === 'purchase_orders' ? 'Órdenes' : t === 'purchase_requests' ? 'Solicitudes' : 'Autorizaciones'}:{' '}
                    {run
                      ? `${new Date(run.started_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (${MAXIMO_RUN_STATUS_LABELS[run.status as keyof typeof MAXIMO_RUN_STATUS_LABELS] ?? run.status})`
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
            <h3 className="text-lg font-semibold text-[#424846]">Maximo{year ? ` · ${year}` : ''}</h3>
            {!maximo.syncEnabled && (
              <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                Pendiente de activación
              </span>
            )}
          </div>
          {maximo.purchaseOrders.total === 0 && maximo.contracts.total === 0 && maximo.requests.total === 0 && !maximo.syncEnabled ? (
            <p className="text-sm text-gray-500">
              Sincronización pendiente de activación (configuración del servidor). Los datos de Maximo aparecerán aquí en cuanto se habilite.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Órdenes de Maximo</p>
                <p className="text-2xl font-bold text-[#424846]">{maximo.purchaseOrders.total.toLocaleString('es-MX')}</p>
              </div>
              {/* K7.9: una por PR, como el pie; los contratos van aparte (otra fecha) */}
              <div>
                <p className="text-sm text-gray-500">Solicitudes (PR) de Maximo</p>
                <p className="text-2xl font-bold text-[#424846]">{maximo.requests.total.toLocaleString('es-MX')}</p>
                <p
                  className="mt-1 text-xs text-gray-500"
                  title={year ? 'Contratos por su fecha; las solicitudes, por la fecha de la PR' : undefined}
                >
                  Contratos: {maximo.contracts.withContract.toLocaleString('es-MX')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Última sincronización</p>
                {(['purchase_orders', 'contracts'] as const).map((t) => {
                  const run = maximo.lastSync[t];
                  return (
                    <p key={t} className="text-sm text-gray-700 mt-1">
                      {t === 'purchase_orders' ? 'Órdenes' : 'Contratos'}:{' '}
                      {run
                        ? `${new Date(run.started_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (${MAXIMO_RUN_STATUS_LABELS[run.status as keyof typeof MAXIMO_RUN_STATUS_LABELS] ?? run.status})`
                        : 'sin corridas'}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tiempos de aprobación: quién tiene detenidas las autorizaciones + niveles ABENT */}
      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-[#424846]">Tiempos de aprobación</h3>
          <Link href="/compras/reportes" className="text-sm text-[#52AF32] hover:underline">
            Tiempos por aprobador en Reportes
          </Link>
        </div>
        {tiemposQ.isError ? (
          <p className="text-sm text-red-600">No se pudieron cargar los tiempos de aprobación.</p>
        ) : !tiempos ? (
          <div className="w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <div>
              <h4 className="text-sm font-semibold text-[#424846] mb-2">
                Autorizaciones pendientes en SAP — quién las tiene y desde cuándo
              </h4>
              <SapPendingApprovers tiempos={tiempos} />
            </div>
            <div>
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
                <h4 className="text-sm font-semibold text-[#424846]">Cadena de aprobación Maximo</h4>
                <Link href="/compras/aprobaciones?tab=historico" className="text-sm text-[#52AF32] hover:underline">
                  Tiempos por aprobador
                </Link>
              </div>
              {cadenaQ.isError ? (
                <p className="text-sm text-red-600">No se pudo cargar la cadena de aprobación de Maximo.</p>
              ) : !cadenaQ.data ? (
                <div className="w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
              ) : (
                <MaximoChainSummary cadena={cadenaQ.data} />
              )}
            </div>
            {showAbentLevels && (
              <div>
                <h4 className="text-sm font-semibold text-[#424846] mb-2">Flujo propio ABENT — por nivel</h4>
                <AbentLevels niveles={tiempos.abent_niveles} stats={approvalStats} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
