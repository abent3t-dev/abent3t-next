'use client';

import { useState } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { KpiCard } from '@/components/dashboard/KpiCard';
import ExportExcelButton from '@/components/compras/ExportExcelButton';
import AlmacenDevoluciones from '@/components/almacen/AlmacenDevoluciones';
import AlmacenExistencias, { SELECT } from '@/components/almacen/AlmacenExistencias';
import AlmacenNotas from '@/components/almacen/AlmacenNotas';
import AlmacenSinCosto from '@/components/almacen/AlmacenSinCosto';
import { useAlmacenCorte, useAlmacenCortes, useAlmacenDevoluciones, useAlmacenExistencias } from '@/hooks/useAlmacen';
import { cantidad, fechaCorta, fechaCorteLarga, pesos, pesosCorto } from '@/lib/almacen-format';
import { GRUPOS_ALMACEN, SIN_COSTO, type AlmacenArticuloMayor, type AlmacenGrupo, type AlmacenUbicacion } from '@/types/almacen';

/**
 * Almacén (0026 y 0027) — Inventario al corte: el reporte que pidió Contabilidad,
 * cargado del Excel que se entregó (npm run almacen:cargar en el api). Solo
 * consulta. Versión 2 (Mariana, 25-nov): todos los almacenes con un filtro por
 * almacén o grupo, los dos tipos de cambio en sus columnas, lo que va sin costo
 * en su propia pestaña y las devoluciones sin orden de trabajo. El Excel se
 * descarga tal cual se entregó.
 */

type Pestana = 'inventario' | 'sin-costo' | 'devoluciones';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function Spinner() {
  return (
    <div className="p-8 text-center">
      <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

function Tarjeta({ titulo, ayuda, ancha, children }: { titulo: string; ayuda?: string; ancha?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow ${ancha ? 'xl:col-span-2' : ''}`}>
      <h2 className="text-lg font-semibold text-[#424846]">{titulo}</h2>
      {ayuda && <p className="text-sm text-gray-500">{ayuda}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function tooltipGrupo(g: AlmacenGrupo) {
  return (
    <>
      <p className="font-semibold text-gray-900">{g.clave}</p>
      <p className="font-bold text-[#424846]">{pesos(g.importe)}</p>
      <p className="text-xs text-gray-600">Con el TC de la OC: {pesos(g.importeOc)}</p>
      <p className="text-xs text-gray-600">
        {g.articulos.toLocaleString('es-MX')} {g.articulos === 1 ? 'artículo' : 'artículos'} · {cantidad(g.unidades)} unidades
        {g.unidadesSinCosto > 0 ? ` (${cantidad(g.unidadesSinCosto)} sin costo)` : ''}
      </p>
    </>
  );
}

function Mayores({ articulos }: { articulos: AlmacenArticuloMayor[] }) {
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
            <th scope="col" className="py-2 pr-3 font-medium text-right">
              TC del día
            </th>
            <th scope="col" className="py-2 font-medium text-right">
              TC de la OC
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
              <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap font-semibold text-gray-900">{pesos(a.importe)}</td>
              <td className="py-2 text-right tabular-nums whitespace-nowrap text-gray-700">{pesos(a.importeOc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** El filtro de almacén: todos, un grupo completo o un almacén. */
/** "23 almacenes y la zona de recepción": la zona de recepción no es un almacén. */
const ZONA = 'Zona de recepción';
function cuantosAlmacenes(claves: string[], ubicaciones: AlmacenUbicacion[]) {
  const zona = claves.filter((c) => ubicaciones.find((u) => u.clave === c)?.grupo === ZONA).length;
  const n = claves.length - zona;
  return `${n.toLocaleString('es-MX')} ${n === 1 ? 'almacén' : 'almacenes'}${zona ? ' y la zona de recepción' : ''}`;
}

function FiltroAlmacen({ ubicaciones, valor, onChange }: { ubicaciones: AlmacenUbicacion[]; valor: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
      Almacén:
      <select value={valor} onChange={(e) => onChange(e.target.value)} className={`${SELECT} max-w-full`}>
        <option value="">Todos ({cuantosAlmacenes(ubicaciones.map((u) => u.clave), ubicaciones)})</option>
        {GRUPOS_ALMACEN.map((g) => {
          const l = ubicaciones.filter((u) => u.grupo === g);
          if (!l.length) return null;
          return (
            <optgroup key={g} label={g}>
              {l.length > 1 && <option value={g}>{`Todo el grupo (${l.length})`}</option>}
              {l.map((u) => (
                <option key={u.clave} value={u.clave}>
                  {u.descripcion ? `${u.clave} · ${u.descripcion}` : u.clave}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}

export default function AlmacenPage() {
  const cortesQ = useAlmacenCortes();
  const cortes = cortesQ.data ?? [];
  const [elegido, setElegido] = useState<string | null>(null);
  const [ubicacion, setUbicacion] = useState('');
  const [pestana, setPestana] = useState<Pestana>('inventario');
  const id = elegido && cortes.some((c) => c.id === elegido) ? elegido : (cortes[0]?.id ?? null);
  const corteLista = cortes.find((c) => c.id === id) ?? null;
  const ubicaciones = corteLista?.ubicaciones ?? [];
  const filtro = ubicaciones.some((u) => u.clave === ubicacion || u.grupo === ubicacion) ? ubicacion : '';
  const corteQ = useAlmacenCorte(id, filtro);
  const existenciasQ = useAlmacenExistencias(id, filtro);
  const devolucionesQ = useAlmacenDevoluciones(id);

  const corte = corteQ.data;
  const filas = existenciasQ.data;
  const conCosto = filas?.filter((f) => f.origen !== SIN_COSTO) ?? [];
  const sinCosto = filas?.filter((f) => f.origen === SIN_COSTO) ?? [];
  const devoluciones = devolucionesQ.data;
  const almacenesFiltro = corte?.filtro ? corte.almacenes : null;
  const lineasDevolucion = devoluciones ? (almacenesFiltro ? devoluciones.lineas.filter((l) => almacenesFiltro.includes(l.almacen)).length : devoluciones.lineas.length) : null;

  /** Los grupos con importe, sin lo que no tiene costo. */
  const conImporte = (grupos: AlmacenGrupo[], ordenar: boolean) => {
    const r = grupos.filter((g) => g.clave !== SIN_COSTO && g.importe > 0);
    return ordenar ? [...r].sort((a, b) => b.importe - a.importe) : r;
  };
  // El alcance sale del filtro con el que se armaron los datos que se ven (mientras llega el nuevo, se ve el anterior, atenuado).
  const filtroDatos = corte?.filtro ?? '';
  const alcance = corte ? (corte.almacen === 'TODOS' ? (filtroDatos ? (ubicaciones.find((u) => u.clave === filtroDatos) ? `Almacén ${filtroDatos}` : filtroDatos) : 'Todos los almacenes') : `Almacén ${corte.almacen}`) : '';
  const cambiando = corteQ.isPlaceholderData || existenciasQ.isPlaceholderData;

  const pestanas: { id: Pestana; texto: string }[] = [
    { id: 'inventario', texto: 'Inventario' },
    { id: 'sin-costo', texto: `Sin costo${filas ? ` (${sinCosto.length.toLocaleString('es-MX')})` : ''}` },
    { id: 'devoluciones', texto: `Devoluciones sin OT${lineasDevolucion !== null ? ` (${lineasDevolucion.toLocaleString('es-MX')})` : ''}` },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[#424846]">Inventario al corte</h1>
            {corte && (
              <>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-[#424846]">Versión {corte.versionReporte}</span>
                {corte.revision === 'aceptado' ? (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#52AF32]/15 text-[#2f6b1c]">Aceptado por Contabilidad</span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#DFA922]/20 text-[#7a5b0c]">En revisión con Contabilidad</span>
                )}
              </>
            )}
          </div>
          <p className="text-gray-500">
            {corte
              ? `${alcance} al ${fechaCorteLarga(corte.fechaCorte)}, con el costo de cada entrada en pesos`
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
          {/* Corte y almacén */}
          <div className="bg-white p-4 rounded-lg shadow space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {cortes.length > 1 && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  Corte:
                  <select
                    value={id ?? ''}
                    onChange={(e) => {
                      setElegido(e.target.value);
                      setUbicacion('');
                    }}
                    className={SELECT}
                  >
                    {cortes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {fechaCorta(c.fechaCorte)} {c.fechaCorte.slice(11, 16)} · versión {c.versionReporte}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {ubicaciones.length > 1 && <FiltroAlmacen ubicaciones={ubicaciones} valor={filtro} onChange={setUbicacion} />}
              {(corteQ.isFetching || existenciasQ.isFetching) && corte && (
                <div className="w-4 h-4 border-2 border-[#52AF32] border-t-transparent rounded-full animate-spin" aria-label="Cargando" />
              )}
            </div>
            {corte && <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">Fuente: {corte.fuente}</p>}
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
            <div className={`space-y-6 transition-opacity ${cambiando ? 'opacity-60 pointer-events-none' : ''}`} aria-busy={cambiando}>
              {/* Totales del filtro. Cuatro columnas solo en pantallas anchas: a 1280 los importes no caben */}
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                <KpiCard title="Valor con el tipo de cambio del día" value={pesos(corte.totales.pesos)} subtitle="El del día de cada entrada; solo lo que tiene costo" color="green" />
                <KpiCard title="Valor con el tipo de cambio de la OC" value={pesos(corte.totales.pesosOc)} subtitle="El de la orden de compra de cada entrada" color="navy" />
                <KpiCard
                  title="Artículos con saldo"
                  value={corte.totales.articulos.toLocaleString('es-MX')}
                  subtitle={`${cantidad(corte.totales.unidades)} unidades${corte.almacenes.length > 1 ? ` en ${cuantosAlmacenes(corte.almacenes, ubicaciones)}` : ''}`}
                  color="dark"
                />
                <KpiCard
                  title="Sin costo"
                  value={`${corte.totales.sinValuarArticulos.toLocaleString('es-MX')} ${corte.totales.sinValuarArticulos === 1 ? 'artículo' : 'artículos'}`}
                  subtitle={`${cantidad(corte.totales.sinValuarUnidades)} unidades sin una entrada con costo en Maximo`}
                  color="gold"
                />
              </div>

              {/* Pestañas */}
              <div className="flex flex-wrap gap-2 border-b border-gray-200" role="tablist">
                {pestanas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={pestana === p.id}
                    onClick={() => setPestana(p.id)}
                    className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                      pestana === p.id ? 'border-[#52AF32] text-[#424846]' : 'border-transparent text-gray-500 hover:text-[#424846]'
                    }`}
                  >
                    {p.texto}
                  </button>
                ))}
              </div>

              {pestana === 'inventario' && (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {corte.resumen.ubicacion.length > 1 && (
                      <Tarjeta titulo="Por almacén" ayuda="Importe en pesos con el tipo de cambio del día de la entrada">
                        {(() => {
                          const datos = conImporte(corte.resumen.ubicacion, true);
                          return (
                            <BarChart
                              data={datos}
                              dataKey="importe"
                              xAxisKey="clave"
                              horizontal
                              color="#74B82B"
                              height={Math.max(220, datos.length * 36)}
                              yAxisWidth={120}
                              formatValue={pesosCorto}
                              barLabel={(g) => pesosCorto(g.importe)}
                              tooltip={tooltipGrupo}
                            />
                          );
                        })()}
                      </Tarjeta>
                    )}
                    <Tarjeta titulo="Por clasificación" ayuda="Importe en pesos por el primer nivel de la clasificación">
                      {(() => {
                        const datos = conImporte(corte.resumen.clasificacion, true);
                        return datos.length ? (
                          <BarChart
                            data={datos}
                            dataKey="importe"
                            xAxisKey="clave"
                            horizontal
                            color="#52AF32"
                            height={Math.max(220, datos.length * 44)}
                            yAxisWidth={150}
                            formatValue={pesosCorto}
                            barLabel={(g) => pesosCorto(g.importe)}
                            tooltip={tooltipGrupo}
                          />
                        ) : (
                          <p className="text-sm text-gray-500">En este filtro nada tiene costo.</p>
                        );
                      })()}
                    </Tarjeta>
                    <Tarjeta titulo="Por moneda de la entrada" ayuda="Importe en pesos de lo que se compró en cada moneda">
                      <PieChart data={conImporte(corte.resumen.moneda, true)} dataKey="importe" nameKey="clave" formatValue={pesos} height={240} centerCaption="en pesos" />
                    </Tarjeta>
                    <Tarjeta titulo="Por antigüedad de la entrada" ayuda="Importe en pesos según cuánto tiempo lleva la entrada en el almacén al corte">
                      {(() => {
                        const datos = conImporte(corte.resumen.antiguedad, false);
                        return (
                          <BarChart
                            data={datos}
                            dataKey="importe"
                            xAxisKey="clave"
                            horizontal
                            color="#222D59"
                            height={Math.max(220, datos.length * 52)}
                            yAxisWidth={150}
                            formatValue={pesosCorto}
                            barLabel={(g) => pesosCorto(g.importe)}
                            tooltip={tooltipGrupo}
                          />
                        );
                      })()}
                    </Tarjeta>
                    <Tarjeta titulo="Artículos de mayor valor" ayuda="Los 10 con mayor importe en pesos al corte, con los dos tipos de cambio" ancha>
                      <Mayores articulos={corte.resumen.mayores} />
                    </Tarjeta>
                  </div>

                  {existenciasQ.isLoading ? (
                    <div className="bg-white rounded-lg shadow">
                      <Spinner />
                    </div>
                  ) : existenciasQ.isError || !filas ? (
                    <p className="bg-white rounded-lg shadow p-8 text-center text-red-600">
                      No se pudieron cargar las existencias: {errorText(existenciasQ.error, 'intenta de nuevo')}
                    </p>
                  ) : (
                    <AlmacenExistencias key={`${corte.id}|${filtroDatos}`} filas={conCosto} />
                  )}

                  <AlmacenNotas notas={corte.notas} />
                </>
              )}

              {pestana === 'sin-costo' &&
                (existenciasQ.isLoading ? (
                  <div className="bg-white rounded-lg shadow">
                    <Spinner />
                  </div>
                ) : existenciasQ.isError || !filas ? (
                  <p className="bg-white rounded-lg shadow p-8 text-center text-red-600">
                    No se pudo cargar lo que va sin costo: {errorText(existenciasQ.error, 'intenta de nuevo')}
                  </p>
                ) : (
                  <AlmacenSinCosto key={`${corte.id}|${filtroDatos}`} filas={sinCosto} />
                ))}

              {pestana === 'devoluciones' &&
                (devolucionesQ.isLoading ? (
                  <div className="bg-white rounded-lg shadow">
                    <Spinner />
                  </div>
                ) : devolucionesQ.isError || !devoluciones ? (
                  <p className="bg-white rounded-lg shadow p-8 text-center text-red-600">
                    No se pudieron cargar las devoluciones: {errorText(devolucionesQ.error, 'intenta de nuevo')}
                  </p>
                ) : (
                  <AlmacenDevoluciones key={`${corte.id}|${filtroDatos}`} datos={devoluciones} almacenes={almacenesFiltro} />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
