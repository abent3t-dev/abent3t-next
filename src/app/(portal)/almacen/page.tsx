'use client';

import { useState } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { KpiCard } from '@/components/dashboard/KpiCard';
import ExportExcelButton from '@/components/compras/ExportExcelButton';
import AlmacenExistencias from '@/components/almacen/AlmacenExistencias';
import AlmacenNotas from '@/components/almacen/AlmacenNotas';
import { useAlmacenCorte, useAlmacenCortes, useAlmacenExistencias } from '@/hooks/useAlmacen';
import { cantidad, fechaCorta, fechaCorteLarga, pesos, pesosCorto } from '@/lib/almacen-format';
import {
  TIPO_CAMBIO_LABELS,
  type AlmacenArticuloMayor,
  type AlmacenGrupo,
  type AlmacenTipoCambio,
} from '@/types/almacen';

/**
 * Almacén (0026) — Inventario al corte: el reporte que pidió Contabilidad,
 * cargado del Excel que aceptaron (npm run almacen:cargar en el api). Solo
 * consulta: totales, gráficas, las existencias y las notas; el Excel se
 * descarga tal cual se entregó.
 *
 * El selector de tipo de cambio se queda mientras Contabilidad decide cuál
 * usar (documentation/ALMACEN.md).
 */

const SIN_COSTO = 'Sin entrada con costo';
const TIPOS: AlmacenTipoCambio[] = ['dia', 'oc'];
const TIPO_CAMBIO_AYUDA: Record<AlmacenTipoCambio, string> = {
  dia: 'El de la tabla de tipos de cambio de Maximo del día en que entró cada pieza',
  oc: 'El que Maximo guarda en cada entrada: el de su orden de compra',
};

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type GrupoGrafica = AlmacenGrupo & { valor: number };

function Spinner() {
  return (
    <div className="p-8 text-center">
      <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

function Tarjeta({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-[#424846]">{titulo}</h2>
      {ayuda && <p className="text-sm text-gray-500">{ayuda}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function tooltipGrupo(g: GrupoGrafica) {
  return (
    <>
      <p className="font-semibold text-gray-900">{g.clave}</p>
      <p className="font-bold text-[#424846]">{pesos(g.valor)}</p>
      <p className="text-xs text-gray-600">
        {g.articulos.toLocaleString('es-MX')} {g.articulos === 1 ? 'artículo' : 'artículos'} ·{' '}
        {cantidad(g.unidades)} unidades
      </p>
    </>
  );
}

function Mayores({ articulos, tc }: { articulos: AlmacenArticuloMayor[]; tc: AlmacenTipoCambio }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
            <th scope="col" className="py-2 pr-3 font-medium">
              Parte
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Descripción
            </th>
            <th scope="col" className="py-2 pr-3 font-medium text-right">
              Cantidad
            </th>
            <th scope="col" className="py-2 font-medium text-right">
              Importe
            </th>
          </tr>
        </thead>
        <tbody>
          {articulos.map((a) => (
            <tr key={a.parte} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-3 font-medium text-[#424846] tabular-nums whitespace-nowrap">{a.parte}</td>
              <td className="py-2 pr-3 text-gray-700">
                <span className="line-clamp-1" title={a.descripcion}>
                  {a.descripcion}
                </span>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap text-gray-900">
                {cantidad(a.cantidad)} <span className="text-xs text-gray-500">{a.unidad}</span>
              </td>
              <td className="py-2 text-right tabular-nums whitespace-nowrap font-semibold text-gray-900">
                {pesos(tc === 'oc' ? a.importeOc : a.importe)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlmacenPage() {
  const cortesQ = useAlmacenCortes();
  const cortes = cortesQ.data ?? [];
  const [elegido, setElegido] = useState<string | null>(null);
  const id = elegido && cortes.some((c) => c.id === elegido) ? elegido : (cortes[0]?.id ?? null);
  const corteQ = useAlmacenCorte(id);
  const existenciasQ = useAlmacenExistencias(id);
  const [tc, setTc] = useState<AlmacenTipoCambio>('dia');

  const corte = corteQ.data;
  const filas = existenciasQ.data;

  /** Los grupos con el importe del tipo de cambio elegido, sin lo que no tiene costo. */
  const grafica = (grupos: AlmacenGrupo[], ordenar: boolean): GrupoGrafica[] => {
    const r = grupos
      .filter((g) => g.clave !== SIN_COSTO)
      .map((g) => ({ ...g, valor: tc === 'oc' ? g.importeOc : g.importe }));
    return ordenar ? r.sort((a, b) => b.valor - a.valor) : r;
  };
  const herramientas = filas ? new Set(filas.filter((f) => f.herramienta).map((f) => f.parte)).size : null;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Inventario al corte</h1>
          <p className="text-gray-500">
            {corte
              ? `Almacén ${corte.almacen} al ${fechaCorteLarga(corte.fechaCorte)}, con el costo de cada entrada en pesos`
              : 'Lo que hay en el almacén a una fecha, con el costo de cada entrada en pesos'}
          </p>
        </div>
        {corte && (
          <ExportExcelButton
            path={`/almacen/cortes/${corte.id}/excel`}
            filename={corte.archivo.nombre}
            label="Descargar Excel"
            title="Descarga el Excel del reporte tal como se entregó a Contabilidad"
          />
        )}
      </div>

      {cortesQ.isLoading ? (
        <div className="bg-white rounded-lg shadow">
          <Spinner />
        </div>
      ) : cortesQ.isError ? (
        <p className="bg-white rounded-lg shadow p-8 text-center text-red-600">
          No se pudo cargar el inventario: {errorText(cortesQ.error, 'intenta de nuevo')}
        </p>
      ) : cortes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center space-y-1">
          <p className="font-medium text-[#424846]">Todavía no hay un inventario al corte cargado</p>
          <p className="text-sm text-gray-500">Aparece aquí cuando Contabilidad dé el visto bueno al reporte.</p>
        </div>
      ) : (
        <>
          {/* Corte y tipo de cambio */}
          <div className="bg-white p-4 rounded-lg shadow space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {cortes.length > 1 && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  Corte:
                  <select
                    value={id ?? ''}
                    onChange={(e) => setElegido(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-[#424846] bg-white focus:outline-none focus:ring-2 focus:ring-[#52AF32]/30 focus:border-[#52AF32]"
                  >
                    {cortes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.almacen} · {fechaCorta(c.fechaCorte)} {c.fechaCorte.slice(11, 16)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tipo de cambio a pesos">
                <span className="text-sm text-gray-600 mr-1">Tipo de cambio a pesos:</span>
                {TIPOS.map((t) => {
                  const activo = t === tc;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTc(t)}
                      aria-pressed={activo}
                      title={TIPO_CAMBIO_AYUDA[t]}
                      className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                        activo
                          ? 'bg-[#222D59] text-white'
                          : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {TIPO_CAMBIO_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
            {corte && (
              <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                Fuente: {corte.fuente} · Versión {corte.version}
              </p>
            )}
          </div>

          {corteQ.isLoading ? (
            <div className="bg-white rounded-lg shadow">
              <Spinner />
            </div>
          ) : corteQ.isError || !corte ? (
            <p className="bg-white rounded-lg shadow p-8 text-center text-red-600">
              No se pudo cargar el corte: {errorText(corteQ.error, 'intenta de nuevo')}
            </p>
          ) : (
            <>
              {/* Totales */}
              {/* Cuatro columnas solo en pantallas anchas: a 1280 el valor no cabe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                <KpiCard
                  title="Valor del inventario"
                  value={pesos(tc === 'oc' ? corte.totales.pesosOc : corte.totales.pesos)}
                  subtitle={
                    tc === 'oc'
                      ? 'Con el tipo de cambio de la orden de compra'
                      : 'Con el tipo de cambio del día de cada entrada'
                  }
                  color="green"
                />
                <KpiCard
                  title="Artículos con saldo"
                  value={corte.totales.articulos.toLocaleString('es-MX')}
                  subtitle={herramientas ? `${herramientas.toLocaleString('es-MX')} de ellos son herramientas` : undefined}
                  color="navy"
                />
                <KpiCard
                  title="Unidades"
                  value={cantidad(corte.totales.unidades)}
                  subtitle="En la unidad de despacho del almacén"
                  color="dark"
                />
                <KpiCard
                  title="Sin valuar"
                  value={`${corte.totales.sinValuarArticulos.toLocaleString('es-MX')} ${
                    corte.totales.sinValuarArticulos === 1 ? 'artículo' : 'artículos'
                  }`}
                  subtitle={`${cantidad(corte.totales.sinValuarUnidades)} unidades sin una entrada con costo; la nota de cada fila dice por qué`}
                  color="gold"
                />
              </div>

              {/* Gráficas */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Tarjeta titulo="Por clasificación" ayuda="Importe en pesos por el primer nivel de la clasificación">
                  {(() => {
                    const datos = grafica(corte.resumen.clasificacion, true);
                    return (
                      <BarChart
                        data={datos}
                        dataKey="valor"
                        xAxisKey="clave"
                        horizontal
                        color="#52AF32"
                        height={Math.max(220, datos.length * 44)}
                        yAxisWidth={150}
                        formatValue={pesosCorto}
                        barLabel={(g) => pesosCorto(g.valor)}
                        tooltip={tooltipGrupo}
                      />
                    );
                  })()}
                </Tarjeta>
                <Tarjeta titulo="Por moneda de la entrada" ayuda="Importe en pesos de lo que se compró en cada moneda">
                  <PieChart
                    data={grafica(corte.resumen.moneda, true)}
                    dataKey="valor"
                    nameKey="clave"
                    formatValue={pesos}
                    height={240}
                    centerCaption="en pesos"
                  />
                </Tarjeta>
                <Tarjeta titulo="Por antigüedad de la entrada" ayuda="Importe en pesos según cuánto tiempo lleva la entrada en el almacén al corte">
                  {(() => {
                    const datos = grafica(corte.resumen.antiguedad, false);
                    return (
                      <BarChart
                        data={datos}
                        dataKey="valor"
                        xAxisKey="clave"
                        horizontal
                        color="#222D59"
                        height={Math.max(220, datos.length * 52)}
                        yAxisWidth={150}
                        formatValue={pesosCorto}
                        barLabel={(g) => pesosCorto(g.valor)}
                        tooltip={tooltipGrupo}
                      />
                    );
                  })()}
                </Tarjeta>
                <Tarjeta titulo="Artículos de mayor valor" ayuda="Los 10 con mayor importe en pesos al corte">
                  <Mayores articulos={tc === 'oc' ? corte.resumen.mayoresOc : corte.resumen.mayores} tc={tc} />
                </Tarjeta>
              </div>

              {/* Existencias */}
              {existenciasQ.isLoading ? (
                <div className="bg-white rounded-lg shadow">
                  <Spinner />
                </div>
              ) : existenciasQ.isError || !filas ? (
                <p className="bg-white rounded-lg shadow p-8 text-center text-red-600">
                  No se pudieron cargar las existencias: {errorText(existenciasQ.error, 'intenta de nuevo')}
                </p>
              ) : (
                <AlmacenExistencias key={corte.id} filas={filas} tc={tc} />
              )}

              <AlmacenNotas notas={corte.notas} />
            </>
          )}
        </>
      )}
    </div>
  );
}
