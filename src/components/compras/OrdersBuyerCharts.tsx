'use client';

import { BarChart } from '@/components/charts';
import { useOrdersKpis } from '@/components/compras/OrdersKpiCards';
import {
  currencyLabel,
  formatCurrencyAmount,
  formatCurrencyNumber,
  formatDays,
  NO_DISPONIBLE,
} from '@/lib/compras-format';
import type {
  AhorroPorComprador,
  BuyerKind,
  GestionPorComprador,
  GestionPorCompradorSistema,
  GestionStats,
  OrdersKpis,
} from '@/types/purchases';

/**
 * M1 y M2 (2026-10-14, Ingrid: "para que los compradores compitan") — debajo
 * de "Ahorro acumulado" y "CAPEX / OPEX" en Órdenes, con el mismo año:
 *  - M1 "Ahorro por comprador": barras en MXN de mayor a menor; las otras
 *    monedas en renglones aparte, sin convertir. La suma de las barras = la
 *    tarjeta (la API arma las dos con los mismos renglones). Sin captura, el
 *    mismo "No disponible" de la tarjeta (nunca una gráfica en 0).
 *  - M2 "Tiempo de gestión por comprador": los días de G2 del tablero, por
 *    sistema. La barra es el PROMEDIO (el número grande del tablero) con la N
 *    al final; mediana, N y, en Maximo, el dato desde la aprobación van en el
 *    tooltip. Con menos de `min_oc` OC, en gris al final, sin destacar.
 * Comprador = regla E4/F1 con los alias de Compras → Roles; el comprador
 * inferido ("Capturó") se dice en el tooltip. Usa la misma consulta que las
 * tarjetas (useOrdersKpis): una sola petición.
 */

const DORADO = '#DFA922';
const VERDE = '#52AF32';
/** Barras atenuadas: sin comprador identificado y, en M2, con menos de `min_oc` OC. */
const GRIS = '#B8BDC2';

const SIN_COMPRADOR = 'Sin comprador identificado';
const nombre = (comprador: string | null) => comprador ?? SIN_COMPRADOR;
const oc = (n: number) => `${n.toLocaleString('es-MX')} OC`;
/** Alto proporcional al número de barras. */
const alto = (barras: number) => Math.max(120, 48 + 34 * barras);
/** Ancho del eje de nombres: cabe "Sin comprador identificado". */
const EJE_NOMBRES = 160;
const LARGO_NOMBRE = 26;

const compacto = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const ejeMxn = (v: number) => `${v < 0 ? '-' : ''}$${compacto.format(Math.abs(v))}`;
const ejeDias = (v: number) => `${v} d`;

const REGLA_COMPRADOR =
  'Comprador: en Maximo (y en la OC de SAP que nació allá) el agente de compras (PURCHASEAGENT) o, si no lo trae, quien creó la OC; ' +
  'en SAP, quien capturó la OC (SAP no registra comprador). Esos dos últimos son comprador inferido ("Capturó"). ' +
  'Nombres según Compras → Roles → "Usuarios de SAP y Maximo".';
const AHORRO_HINT =
  'Ahorro capturado por comprador, en MXN y de mayor a menor; las otras monedas van aparte, sin convertir. ' +
  'La suma de las barras es el Ahorro acumulado de la tarjeta (las OC migradas de Maximo a SAP cuentan una vez). ' +
  REGLA_COMPRADOR;

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

// ── M1: ahorro por comprador ───────────────────────────────────────────────

type AhorroBar = { nombre: string; mxn: number; mxnOc: number; b: AhorroPorComprador };

/** Un renglón por moneda que no es MXN: "USD: Jorge $1,234 · Ana $500" (sin convertir). */
function otrasMonedas(kpis: OrdersKpis): string[] {
  return kpis.ahorro.por_moneda
    .filter((m) => m.currency !== 'MXN')
    .map((moneda) => {
      const montos = kpis.ahorro.por_comprador
        .flatMap((b) =>
          b.por_moneda.filter((m) => m.currency === moneda.currency).map((m) => ({ comprador: b.comprador, total: m.total })),
        )
        // de mayor a menor; "Sin comprador identificado" al final
        .sort((a, b) => Number(a.comprador === null) - Number(b.comprador === null) || b.total - a.total);
      return `${currencyLabel(moneda.currency)}: ${montos
        .map((m) => `${nombre(m.comprador)} ${formatCurrencyNumber(m.total, moneda.currency)}`)
        .join(' · ')}`;
    });
}

function AhorroCard({ kpis, year }: { kpis: OrdersKpis | undefined; year: number | null }) {
  const barras: AhorroBar[] = kpis
    ? kpis.ahorro.por_comprador.flatMap((b) => {
        const mxn = b.por_moneda.find((m) => m.currency === 'MXN');
        return mxn ? [{ nombre: nombre(b.comprador), mxn: mxn.total, mxnOc: mxn.count, b }] : [];
      })
    : [];
  const otras = kpis ? otrasMonedas(kpis) : [];
  const totalMxn = kpis?.ahorro.por_moneda.find((m) => m.currency === 'MXN');

  return (
    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#DFA922] min-w-0">
      <Titulo texto="Ahorro por comprador" year={year} hint={kpis ? `${AHORRO_HINT} ${kpis.ahorro.nota}` : AHORRO_HINT} />
      {!kpis ? (
        <Spinner />
      ) : !kpis.ahorro.disponible ? (
        <>
          <p className="text-2xl font-bold text-gray-500 italic">{NO_DISPONIBLE}</p>
          <p className="text-xs text-gray-600 mt-1">
            Sin ahorro capturado en SAP ni en Maximo todavía (SAP: U_Imp_ahorro por línea; Maximo: AB_AHORRO de la OC).
          </p>
        </>
      ) : (
        <>
          {barras.length > 0 && (
            <>
              <p className="text-xs text-gray-500 mt-0.5">MXN, de mayor a menor</p>
              <BarChart
                data={barras}
                dataKey="mxn"
                xAxisKey="nombre"
                horizontal
                colors={barras.map((x) => (x.b.comprador === null ? GRIS : DORADO))}
                formatValue={ejeMxn}
                height={alto(barras.length)}
                yAxisWidth={EJE_NOMBRES}
                maxLabelLength={LARGO_NOMBRE}
                tooltip={(x) => {
                  const otrasDelComprador = x.b.por_moneda.filter((m) => m.currency !== 'MXN');
                  const nota = inferido(x.b.tipo, x.b.documentos_capturo, x.b.documentos);
                  return (
                    <>
                      <p className="font-semibold text-gray-900">{x.nombre}</p>
                      <p className="font-bold text-[#424846] tabular-nums">
                        {formatCurrencyAmount(x.mxn, 'MXN')}
                        <span className="font-normal text-gray-500"> · {oc(x.mxnOc)}</span>
                      </p>
                      {otrasDelComprador.map((m) => (
                        <p key={m.currency ?? 'sin_moneda'} className="tabular-nums text-gray-600">
                          {formatCurrencyAmount(m.total, m.currency)} · {oc(m.count)} (sin convertir)
                        </p>
                      ))}
                      <p className="text-gray-600">{oc(x.b.documentos)} con ahorro</p>
                      {nota && <p className="text-xs text-gray-500 italic">{nota}</p>}
                    </>
                  );
                }}
              />
            </>
          )}
          {otras.length > 0 && (
            <div className="mt-2 space-y-0.5 text-xs text-gray-600">
              <p className="text-gray-500">
                {barras.length > 0 ? 'Otras monedas, sin convertir:' : 'Sin ahorro en MXN; otras monedas, sin convertir:'}
              </p>
              {otras.map((linea) => (
                <p key={linea} className="tabular-nums break-words">
                  {linea}
                </p>
              ))}
            </div>
          )}
          {totalMxn && (
            <p className="mt-2 text-xs text-gray-500 tabular-nums">
              Suma de las barras = Ahorro acumulado: {formatCurrencyAmount(totalMxn.total, 'MXN')} en {oc(totalMxn.count)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── M2: tiempo de gestión por comprador ────────────────────────────────────

type GestionBar = { nombre: string; dias: number; g: GestionPorComprador; destacado: boolean };

const statsLine = (s: Pick<GestionStats, 'promedio_dias' | 'mediana_dias' | 'total'>) =>
  s.total === 0 || s.promedio_dias === null
    ? NO_DISPONIBLE
    : `${formatDays(s.promedio_dias)} · mediana ${formatDays(s.mediana_dias)} · ${oc(s.total)}`;

function GestionBloque({
  sistema,
  datos,
  minOc,
  desdeAprobacion,
}: {
  sistema: 'SAP' | 'Maximo';
  datos: GestionPorCompradorSistema;
  minOc: number;
  /** Maximo: el total del dato secundario (desde la aprobación). */
  desdeAprobacion?: GestionStats;
}) {
  const barras: GestionBar[] = datos.compradores.map((g) => ({
    nombre: nombre(g.comprador),
    // N > 0: siempre hay promedio (la API omite a quien no tiene OC en el promedio)
    dias: g.promedio_dias ?? 0,
    g,
    destacado: g.comprador !== null && g.total >= minOc,
  }));
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-[#222D59]">{sistema}</p>
      {datos.total.total === 0 ? (
        <>
          <p className="text-lg font-bold text-gray-500 italic">{NO_DISPONIBLE}</p>
          <p className="text-xs text-gray-600">sin OC con solicitud</p>
        </>
      ) : (
        <>
          <BarChart
            data={barras}
            dataKey="dias"
            xAxisKey="nombre"
            horizontal
            colors={barras.map((x) => (x.destacado ? VERDE : GRIS))}
            formatValue={ejeDias}
            height={alto(barras.length)}
            yAxisWidth={EJE_NOMBRES}
            maxLabelLength={LARGO_NOMBRE}
            barLabel={(x) => oc(x.g.total)}
            tooltip={(x) => {
              const nota = inferido(x.g.tipo, x.g.documentos_capturo, x.g.total);
              const apr = x.g.desde_aprobacion;
              return (
                <>
                  <p className="font-semibold text-gray-900">{x.nombre}</p>
                  <p className="tabular-nums">
                    Promedio <strong>{formatDays(x.g.promedio_dias)}</strong> · mediana {formatDays(x.g.mediana_dias)}
                  </p>
                  <p className="text-gray-600">{oc(x.g.total)} con solicitud</p>
                  {apr && (
                    <p className="text-gray-600 tabular-nums">
                      Desde la aprobación:{' '}
                      {apr.total === 0 || apr.promedio_dias === null
                        ? `${NO_DISPONIBLE} (sin PR aprobada)`
                        : `${formatDays(apr.promedio_dias)} (mediana ${formatDays(apr.mediana_dias)}, ${oc(apr.total)})`}
                    </p>
                  )}
                  {x.g.comprador !== null && x.g.total < minOc && (
                    <p className="text-xs text-gray-500">Menos de {minOc} OC en el periodo: sin destacar</p>
                  )}
                  {nota && <p className="text-xs text-gray-500 italic">{nota}</p>}
                </>
              );
            }}
          />
          <p className="text-xs text-gray-600 tabular-nums">
            Total {sistema}: {statsLine(datos.total)} con solicitud
          </p>
          {desdeAprobacion && (
            <p className="text-xs text-gray-500 tabular-nums">Desde la aprobación: {statsLine(desdeAprobacion)}</p>
          )}
        </>
      )}
    </div>
  );
}

function GestionCard({ kpis, year }: { kpis: OrdersKpis | undefined; year: number | null }) {
  const g = kpis?.gestion_por_comprador;
  const hint = g
    ? [
        `SAP: ${g.sap.definicion}.`,
        `Maximo: ${g.maximo.definicion}.`,
        `Maximo (en el tooltip): ${g.maximo.definicion_secundaria}.`,
        `La barra es el promedio de días, como el número grande del tablero de Compras; la mediana va en el tooltip y la N al final de la barra. En gris, al final: menos de ${g.min_oc} OC en el periodo o sin comprador identificado. Con año, cuentan las OC creadas ese año.`,
        REGLA_COMPRADOR,
      ].join('\n')
    : 'Días de gestión (solicitud → OC) por comprador, con la definición del tablero de Compras.';
  const hayGris =
    !!g &&
    [...g.sap.compradores, ...g.maximo.compradores].some((c) => c.comprador === null || c.total < g.min_oc);
  return (
    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#52AF32] min-w-0">
      <Titulo texto="Tiempo de gestión por comprador (solicitud → OC)" year={year} hint={hint} />
      {!g ? (
        <Spinner />
      ) : (
        <div className="mt-1 space-y-4">
          <GestionBloque sistema="SAP" datos={g.sap} minOc={g.min_oc} />
          <GestionBloque
            sistema="Maximo"
            datos={g.maximo}
            minOc={g.min_oc}
            desdeAprobacion={g.maximo.total_desde_aprobacion}
          />
          {hayGris && (
            <p className="text-xs text-gray-500">
              En gris: menos de {g.min_oc} OC en el periodo o sin comprador identificado (van al final, sin destacar).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersBuyerCharts({ year }: { year: number | null }) {
  const q = useOrdersKpis(year);
  if (q.isError) {
    return (
      <div className="bg-white p-4 rounded-lg shadow text-sm text-red-600">
        No se pudieron cargar las gráficas de ahorro y tiempo de gestión por comprador.
      </div>
    );
  }
  // Un API anterior al bloque M no trae los datos por comprador: sin gráficas
  // (las tarjetas y la página siguen)
  if (q.data && (!q.data.ahorro.por_comprador || !q.data.gestion_por_comprador)) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AhorroCard kpis={q.data} year={year} />
      <GestionCard kpis={q.data} year={year} />
    </div>
  );
}
