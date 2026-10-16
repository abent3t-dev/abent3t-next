'use client';

import { useState } from 'react';
import { BarChart } from '@/components/charts';
import { useOrdersKpis } from '@/components/compras/OrdersKpiCards';
import {
  currencyLabel,
  formatCurrencyAmount,
  formatCurrencyNumber,
  formatDays,
  formatMonthYear,
  NO_DISPONIBLE,
} from '@/lib/compras-format';
import type {
  AdjudicadoAmount,
  BuyerKind,
  CompradorAdjudicado,
  GestionAmbosStats,
  GestionStats,
  OrdersKpis,
} from '@/types/purchases';

/**
 * Debajo de "Ahorro acumulado" y "CAPEX / OPEX" en Órdenes, con el mismo año.
 *
 * M1 y M2 (2026-10-14, Ingrid: "para que los compradores compitan"): ahorro
 * y tiempo de gestión por comprador.
 *
 * Bloque N (2026-10-16, Ingrid):
 *  - N1 "Monto adjudicado y ahorro por comprador": barras VERTICALES, por
 *    persona el monto adjudicado (OC sin IVA) y su ahorro lado a lado, en MXN;
 *    arriba del ahorro, el % sobre lo adjudicado. Las otras monedas van
 *    aparte, sin convertir. La suma de las barras = las tarjetas (Órdenes sin
 *    IVA del tablero y "Ahorro acumulado"): la API arma todo con los mismos
 *    renglones.
 *  - N2 "Gestiones por comprador": tabla con el total del año y, por
 *    persona, cuántas gestionó (N), su parte del total y sus días (promedio y
 *    mediana), con "Ambos" sistemas por defecto.
 *  - N3: "Ahorro capturado desde", calculado de los datos.
 * Comprador = regla E4/F1; la persona se junta entre SAP y Maximo por su
 * perfil de la plataforma (Compras → Roles). Usa la misma consulta que las
 * tarjetas (useOrdersKpis): una sola petición.
 */

const AZUL = '#222D59';
const DORADO = '#DFA922';
/** Barras atenuadas: "Sin comprador identificado". */
const GRIS = '#B8BDC2';
const GRIS_CLARO = '#D9DCDF';

const SIN_COMPRADOR = 'Sin comprador identificado';
const nombre = (comprador: string | null) => comprador ?? SIN_COMPRADOR;
const oc = (n: number) => `${n.toLocaleString('es-MX')} OC`;
const pct = (parte: number, total: number) => {
  const valor = (parte / total) * 100;
  // un ahorro de miles sobre cientos de millones no es "0%"
  return valor > 0 && valor < 0.1 ? '<0.1%' : `${valor.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;
};

const compacto = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const ejeMxn = (v: number) => `${v < 0 ? '-' : ''}$${compacto.format(Math.abs(v))}`;

const REGLA_COMPRADOR =
  'Comprador: en Maximo (y en la OC de SAP que nació allá) el agente de compras (PURCHASEAGENT) o, si no lo trae, quien creó la OC; ' +
  'en SAP, quien capturó la OC (SAP no registra comprador). Esos dos últimos son comprador inferido ("Capturó"). ' +
  'La misma persona se junta entre SAP y Maximo por su perfil de la plataforma: en Compras → Roles → "Usuarios de SAP y Maximo", ' +
  'liga cada usuario de Maximo al perfil de la persona (o nómbralo igual que en SAP).';

/** Tooltip: el comprador inferido ("Capturó"), también cuando es solo en parte de sus OC. */
function inferido(tipo: BuyerKind, capturo: number, total: number): string | null {
  if (tipo !== 'capturo') return null;
  return capturo >= total
    ? 'Comprador inferido: capturó la OC'
    : `Comprador inferido en ${capturo.toLocaleString('es-MX')} de ${oc(total)}: capturó la OC`;
}

function Titulo({ texto, year, hint }: { texto: string; year: number | null; hint: string }) {
  return (
    <p className="text-sm text-gray-600" title={hint}>
      {texto}
      {year ? ` ${year}` : ''}
      <span className="ml-1 text-gray-400 cursor-help" aria-label="Definición">
        ⓘ
      </span>
    </p>
  );
}

const Spinner = () => (
  <div className="mt-2 w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
);

// ── N1: monto adjudicado y ahorro por comprador ────────────────────────────

const mxn = <A extends { currency: string | null }>(list: A[]) => list.find((m) => m.currency === 'MXN');

/** Monto adjudicado de una moneda: "No disponible" si ninguna OC trae subtotal. */
const adjudicadoText = (a: AdjudicadoAmount) =>
  a.count > 0 && a.sin_subtotal >= a.count ? `${currencyLabel(a.currency)} ${NO_DISPONIBLE}` : formatCurrencyAmount(a.total, a.currency);

type AdjBar = {
  nombre: string;
  adjudicado: number;
  ahorro: number;
  c: CompradorAdjudicado;
};

/**
 * Un renglón por moneda que no es MXN, sin convertir:
 * "USD: Jorge $54 adjudicado / $60 ahorro · Ana $10 adjudicado".
 */
function otrasMonedas(compradores: CompradorAdjudicado[]): string[] {
  const monedas = new Set<string | null>();
  for (const c of compradores) {
    for (const m of [...c.adjudicado, ...c.ahorro.por_moneda]) if (m.currency !== 'MXN') monedas.add(m.currency);
  }
  return [...monedas].map((moneda) => {
    const partes = compradores.flatMap((c) => {
      const adj = c.adjudicado.find((m) => m.currency === moneda);
      const ah = c.ahorro.por_moneda.find((m) => m.currency === moneda);
      if (!adj && !ah) return [];
      const textos = [
        adj
          ? `${adj.count > 0 && adj.sin_subtotal >= adj.count ? NO_DISPONIBLE : formatCurrencyNumber(adj.total, moneda)} adjudicado`
          : null,
        ah ? `${formatCurrencyNumber(ah.total, moneda)} ahorro` : null,
      ].filter(Boolean);
      return [`${nombre(c.comprador)} ${textos.join(' / ')}`];
    });
    return `${currencyLabel(moneda)}: ${partes.join(' · ')}`;
  });
}

function TooltipAdjudicado({ x }: { x: AdjBar }) {
  const adj = mxn(x.c.adjudicado);
  const ah = mxn(x.c.ahorro.por_moneda);
  const nota = inferido(x.c.tipo, x.c.documentos_capturo, x.c.documentos);
  const otras = [
    ...x.c.adjudicado.filter((m) => m.currency !== 'MXN').map((m) => `${adjudicadoText(m)} adjudicado (${oc(m.count)})`),
    ...x.c.ahorro.por_moneda
      .filter((m) => m.currency !== 'MXN')
      .map((m) => `${formatCurrencyAmount(m.total, m.currency)} ahorro (${oc(m.count)})`),
  ];
  return (
    <>
      <p className="font-semibold text-gray-900">{x.nombre}</p>
      <p className="tabular-nums">
        Monto adjudicado: <strong>{adj ? adjudicadoText(adj) : NO_DISPONIBLE}</strong>
        {adj && <span className="text-gray-500"> · {oc(adj.count)}, sin IVA</span>}
      </p>
      {adj && adj.sin_subtotal > 0 && (
        <p className="text-xs text-amber-700">{oc(adj.sin_subtotal)} sin subtotal: no suman al monto</p>
      )}
      <p className="tabular-nums">
        Ahorro:{' '}
        {ah ? (
          <>
            <strong>{formatCurrencyAmount(ah.total, 'MXN')}</strong>
            <span className="text-gray-500"> · {oc(ah.count)} con ahorro</span>
          </>
        ) : (
          <span className="italic text-gray-500">sin ahorro capturado</span>
        )}
      </p>
      {ah && adj && adj.total > 0 && (
        <p className="tabular-nums text-[#424846]">
          {pct(ah.total, adj.total)} de ahorro sobre lo adjudicado
        </p>
      )}
      {otras.map((t) => (
        <p key={t} className="tabular-nums text-gray-600">
          {t} (sin convertir)
        </p>
      ))}
      {nota && <p className="text-xs text-gray-500 italic">{nota}</p>}
    </>
  );
}

function AdjudicadoAhorroCard({ kpis, year }: { kpis: OrdersKpis | undefined; year: number | null }) {
  const compradores = kpis?.compradores ?? [];
  const barras: AdjBar[] = compradores.flatMap((c) => {
    const adj = mxn(c.adjudicado);
    const ah = mxn(c.ahorro.por_moneda);
    if (!adj && !ah) return [];
    return [{ nombre: nombre(c.comprador), adjudicado: adj?.total ?? 0, ahorro: ah?.total ?? 0, c }];
  });
  const otras = otrasMonedas(compradores);
  const totalAdj = kpis?.adjudicado ? mxn(kpis.adjudicado.por_moneda) : undefined;
  const totalAhorro = kpis ? mxn(kpis.ahorro.por_moneda) : undefined;
  const desde = kpis?.ahorro.desde;
  const hint = [
    'Por persona: el monto adjudicado (OC no canceladas del periodo, sin IVA: la suma de sus líneas; las OC sin subtotal se cuentan aparte, nunca como 0) y, al lado, el ahorro capturado (SAP: U_Imp_ahorro; Maximo: AB_AHORRO), en su propio eje (el derecho) porque es mucho menor. Arriba del ahorro, el % sobre lo adjudicado.',
    'En MXN, de mayor a menor adjudicado; las otras monedas van aparte, sin convertir. Las OC migradas de Maximo a SAP cuentan una vez.',
    'La suma de las barras es el total de Órdenes sin IVA del tablero (adjudicado) y la tarjeta Ahorro acumulado (ahorro).',
    REGLA_COMPRADOR,
  ].join('\n');
  // con muchas personas, la gráfica se desplaza en lugar de apretar las barras
  const anchoMinimo = Math.max(0, barras.length * 96);
  const sinDatos = kpis && !kpis.adjudicado?.disponible && !kpis.ahorro.disponible;

  return (
    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#DFA922] min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Titulo texto="Monto adjudicado y ahorro por comprador" year={year} hint={hint} />
        {/* N3: desde cuándo hay ahorro capturado, de los datos */}
        {desde && (
          <p className="text-xs text-gray-500">
            Ahorro capturado desde: SAP {formatMonthYear(desde.sap, { utc: true }) ?? 'sin captura'} · Maximo{' '}
            {formatMonthYear(desde.maximo) ?? 'sin captura'}
          </p>
        )}
      </div>
      {!kpis ? (
        <Spinner />
      ) : sinDatos ? (
        <>
          <p className="text-2xl font-bold text-gray-500 italic">{NO_DISPONIBLE}</p>
          <p className="text-xs text-gray-600 mt-1">Sin órdenes de compra ni ahorro capturado en el periodo.</p>
        </>
      ) : (
        <>
          {barras.length > 0 && (
            <>
              <p className="text-xs text-gray-500 mt-0.5">
                MXN sin IVA, de mayor a menor monto adjudicado. El ahorro va en el eje derecho (dorado) y, arriba de su
                barra, el % sobre lo adjudicado.
              </p>
              <div className="overflow-x-auto">
                <div style={{ minWidth: anchoMinimo }}>
                  <BarChart
                    data={barras}
                    dataKey="adjudicado"
                    xAxisKey="nombre"
                    series={[
                      {
                        dataKey: 'adjudicado',
                        name: 'Monto adjudicado',
                        color: AZUL,
                        colors: barras.map((x) => (x.c.comprador === null ? GRIS : AZUL)),
                      },
                      {
                        dataKey: 'ahorro',
                        name: 'Ahorro',
                        color: DORADO,
                        colors: barras.map((x) => (x.c.comprador === null ? GRIS_CLARO : DORADO)),
                        label: (x) => (x.ahorro > 0 && x.adjudicado > 0 ? pct(x.ahorro, x.adjudicado) : ''),
                        // el ahorro es mucho menor que lo adjudicado: con un solo
                        // eje su barra no se ve; el % va arriba de la barra
                        axis: 'right',
                      },
                    ]}
                    formatValue={ejeMxn}
                    height={380}
                    maxLabelLength={26}
                    xLabelAngle={-30}
                    xAxisHeight={96}
                    tooltip={(x) => <TooltipAdjudicado x={x} />}
                  />
                </div>
              </div>
            </>
          )}
          {otras.length > 0 && (
            <div className="mt-2 space-y-0.5 text-xs text-gray-600">
              <p className="text-gray-500">
                {barras.length > 0 ? 'Otras monedas, sin convertir:' : 'Sin montos en MXN; otras monedas, sin convertir:'}
              </p>
              {otras.map((linea) => (
                <p key={linea} className="tabular-nums break-words">
                  {linea}
                </p>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500 tabular-nums">
            Suma de las barras: adjudicado {totalAdj ? adjudicadoText(totalAdj) : NO_DISPONIBLE}
            {totalAdj && ` en ${oc(totalAdj.count)}`} (Órdenes sin IVA de SAP y Maximo) · ahorro{' '}
            {totalAhorro ? formatCurrencyAmount(totalAhorro.total, 'MXN') : 'sin captura'}
            {totalAhorro && ` en ${oc(totalAhorro.count)}`} (Ahorro acumulado)
            {totalAdj && totalAdj.sin_subtotal > 0 && ` · ${oc(totalAdj.sin_subtotal)} sin subtotal no suman al adjudicado`}
          </p>
        </>
      )}
    </div>
  );
}

// ── N2: gestiones por comprador ────────────────────────────────────────────

type Sistema = 'ambos' | 'sap' | 'maximo';
const SISTEMAS: Array<{ id: Sistema; label: string }> = [
  { id: 'ambos', label: 'Ambos' },
  { id: 'sap', label: 'SAP' },
  { id: 'maximo', label: 'Maximo' },
];

type Fila = {
  comprador: string | null;
  tipo: BuyerKind;
  documentos_capturo: number;
  total: number;
  promedio_dias: number | null;
  mediana_dias: number | null;
  /** Ambos: de qué sistema son sus gestiones. */
  sap?: number;
  maximo?: number;
  /** Maximo: el dato secundario, desde la aprobación. */
  desde_aprobacion?: { promedio_dias: number | null; mediana_dias: number | null; total: number };
};

function filasDe(g: NonNullable<OrdersKpis['gestion_por_comprador']>, sistema: Sistema): {
  filas: Fila[];
  total: GestionStats | GestionAmbosStats;
} | null {
  if (sistema === 'ambos') return g.ambos ? { filas: g.ambos.compradores, total: g.ambos.total } : null;
  const datos = g[sistema];
  return { filas: datos.compradores, total: datos.total };
}

function GestionCard({ kpis, year }: { kpis: OrdersKpis | undefined; year: number | null }) {
  const g = kpis?.gestion_por_comprador;
  // N2: "Ambos" por defecto (si el api no lo trae, SAP)
  const [sistema, setSistema] = useState<Sistema>('ambos');
  const efectivo: Sistema = sistema === 'ambos' && g && !g.ambos ? 'sap' : sistema;
  const datos = g ? filasDe(g, efectivo) : null;
  const hint = g
    ? [
        `SAP: ${g.sap.definicion}.`,
        `Maximo: ${g.maximo.definicion}.`,
        g.ambos ? `${g.ambos.definicion}.` : null,
        `Maximo, dato secundario (en el renglón): ${g.maximo.definicion_secundaria}.`,
        `En gris, al final: menos de ${g.min_oc} OC en el periodo o sin comprador identificado. Con año, cuentan las OC creadas ese año.`,
        REGLA_COMPRADOR,
      ]
        .filter(Boolean)
        .join('\n')
    : 'Gestiones (solicitud → OC) por comprador, con la definición del tablero de Compras.';
  const n = datos?.total.total ?? 0;

  return (
    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#52AF32] min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Titulo texto="Gestiones por comprador (solicitud → OC)" year={year} hint={hint} />
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5" role="group" aria-label="Sistema">
          {SISTEMAS.filter((s) => s.id !== 'ambos' || !g || g.ambos).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSistema(s.id)}
              aria-pressed={efectivo === s.id}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                efectivo === s.id ? 'bg-[#52AF32] text-white' : 'text-[#424846] hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {!g || !datos ? (
        <Spinner />
      ) : n === 0 ? (
        <>
          <p className="text-2xl font-bold text-gray-500 italic">{NO_DISPONIBLE}</p>
          <p className="text-xs text-gray-600 mt-1">Sin OC con solicitud en el periodo.</p>
        </>
      ) : (
        <>
          {/* N2: el total del año, como lo pidió Ingrid */}
          <p className="mt-1 text-sm text-[#424846]">
            Gestiones{year ? ` ${year}` : ''}: <strong className="tabular-nums">{n.toLocaleString('es-MX')}</strong>{' '}
            solicitudes con OC · tiempo promedio{' '}
            <strong className="tabular-nums">{formatDays(datos.total.promedio_dias)}</strong> (mediana{' '}
            {formatDays(datos.total.mediana_dias)})
            {'sap' in datos.total && (
              <span className="text-gray-500">
                {' '}
                · SAP {datos.total.sap.toLocaleString('es-MX')} · Maximo {datos.total.maximo.toLocaleString('es-MX')}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            De la solicitud a su primera OC.
            {efectivo === 'ambos' &&
              ' Cada sistema mide desde su propia solicitud (SAP, la solicitud de pedido; Maximo, la PR); promedio y mediana salen de los días de cada OC.'}
            {efectivo === 'maximo' &&
              ` Desde la aprobación de la PR: ${formatDays(g.maximo.total_desde_aprobacion.promedio_dias)} (mediana ${formatDays(g.maximo.total_desde_aprobacion.mediana_dias)}, ${oc(g.maximo.total_desde_aprobacion.total)}).`}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-3 text-left font-medium">Comprador</th>
                  <th className="py-2 px-3 text-right font-medium">Gestiones</th>
                  <th className="py-2 px-3 text-left font-medium min-w-[9rem]">% del total</th>
                  <th className="py-2 px-3 text-right font-medium">Días promedio</th>
                  <th className="py-2 pl-3 text-right font-medium">Mediana</th>
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((f, i) => {
                  const atenuada = f.comprador === null || f.total < g.min_oc;
                  const nota = inferido(f.tipo, f.documentos_capturo, f.total);
                  const apr = f.desde_aprobacion;
                  const titulo = [
                    nota,
                    atenuada && f.comprador !== null ? `Menos de ${g.min_oc} OC en el periodo: sin destacar` : null,
                    apr && apr.total > 0
                      ? `Desde la aprobación: ${formatDays(apr.promedio_dias)} (mediana ${formatDays(apr.mediana_dias)}, ${oc(apr.total)})`
                      : null,
                  ]
                    .filter(Boolean)
                    .join('\n');
                  const share = f.total / n;
                  return (
                    <tr
                      // dos perfiles homónimos serían dos filas con el mismo nombre
                      key={`${f.comprador ?? '—'}-${i}`}
                      className={`border-b border-gray-100 ${atenuada ? 'text-gray-400' : 'text-gray-800'}`}
                      title={titulo || undefined}
                    >
                      <td className="py-1.5 pr-3">
                        <span className={atenuada ? '' : 'font-medium'}>{nombre(f.comprador)}</span>
                        {nota && <span className="ml-1 text-xs text-gray-400" aria-label={nota}>*</span>}
                      </td>
                      <td className="py-1.5 px-3 text-right tabular-nums">
                        {f.total.toLocaleString('es-MX')}
                        {efectivo === 'ambos' && f.sap !== undefined && (
                          <span className="block text-[11px] text-gray-400">
                            SAP {f.sap} · Maximo {f.maximo}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded bg-gray-100 min-w-[4rem]" aria-hidden="true">
                            <div
                              className="h-2 rounded"
                              style={{ width: `${Math.max(share * 100, 1)}%`, background: atenuada ? GRIS : '#52AF32' }}
                            />
                          </div>
                          <span className="w-12 text-right tabular-nums text-xs">{pct(f.total, n)}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{formatDays(f.promedio_dias)}</td>
                      <td className="py-1.5 pl-3 text-right tabular-nums">{formatDays(f.mediana_dias)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-[#424846]">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 px-3 text-right tabular-nums">{n.toLocaleString('es-MX')}</td>
                  <td className="py-2 px-3 text-xs tabular-nums">100%</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatDays(datos.total.promedio_dias)}</td>
                  <td className="py-2 pl-3 text-right tabular-nums">{formatDays(datos.total.mediana_dias)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            En gris, al final: menos de {g.min_oc} OC en el periodo o sin comprador identificado. * Comprador inferido
            (capturó o creó la OC). {efectivo !== 'ambos' && 'El total es el de los días de gestión del tablero. '}
            Para que cada quien salga en una sola fila, liga su usuario de Maximo a su perfil en Compras → Roles →
            &quot;Usuarios de SAP y Maximo&quot;.
          </p>
        </>
      )}
    </div>
  );
}

export default function OrdersBuyerCharts({ year }: { year: number | null }) {
  const q = useOrdersKpis(year);
  if (q.isError) {
    return (
      <div className="bg-white p-4 rounded-lg shadow text-sm text-red-600">
        No se pudieron cargar las gráficas de compras y gestiones por comprador.
      </div>
    );
  }
  // Un API anterior al bloque N no trae los datos por persona: sin gráficas
  // (las tarjetas y la página siguen)
  if (q.data && (!q.data.compradores || !q.data.gestion_por_comprador)) return null;
  return (
    <div className="space-y-4">
      <AdjudicadoAhorroCard kpis={q.data} year={year} />
      <GestionCard kpis={q.data} year={year} />
    </div>
  );
}
