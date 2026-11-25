'use client';

import { useMemo, useState } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import Pagination from '@/components/ui/Pagination';
import { normaliza, SELECT } from '@/components/almacen/AlmacenExistencias';
import { cantidad, diaCorto, fechaCorta, fechaHora, mesCorto, pesos } from '@/lib/almacen-format';
import type { AlmacenDevoluciones as Datos } from '@/types/almacen';

/**
 * Almacén — las devoluciones al almacén sin orden de trabajo ni salida ligada,
 * del 1-oct-2026 al corte (Mariana, 25-nov): cuántas, cuándo, de qué artículos,
 * cuánto valen a costo de compra y qué llama la atención de cada artículo. Son
 * las hojas "Devoluciones sin OT" y "Devoluciones por artículo" del Excel.
 * Respeta el filtro de almacén de la página; la serie por mes es de todas.
 */

const TH = 'sticky top-0 z-10 bg-[#424846] px-3 py-2.5 text-xs font-medium uppercase text-white whitespace-nowrap';
const TD = 'px-3 py-2 border-b border-gray-200 align-top text-sm';
const FOOT = 'sticky bottom-0 bg-[#222D59] px-3 py-2.5 text-sm font-bold text-white whitespace-nowrap';

const MARCA_AYUDA: Record<string, string> = {
  'Nunca había salido del almacén': 'No hay salidas del almacén de ese artículo antes de la devolución, desde 2019',
  'Regresó más de lo que había salido': 'Regresó más de lo que había salido del almacén antes de la devolución',
  'Costo 0 en Maximo': 'Maximo la registró con costo 0',
  'También tiene saldo en otra ubicación': 'Al corte hay saldo del mismo artículo en otro almacén',
};

function Dato({ titulo, valor, ayuda }: { titulo: string; valor: string; ayuda?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-[#424846]/70">{titulo}</p>
      <p className="text-2xl font-bold text-[#222D59] tabular-nums">{valor}</p>
      {ayuda && <p className="text-xs text-gray-500 mt-1">{ayuda}</p>}
    </div>
  );
}

export default function AlmacenDevoluciones({ datos, almacenes }: { datos: Datos; almacenes: string[] | null }) {
  const [buscar, setBuscar] = useState('');
  const [almacen, setAlmacen] = useState('');
  const [marca, setMarca] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Las del filtro de almacén de la página.
  const delFiltro = useMemo(() => (almacenes ? datos.lineas.filter((l) => almacenes.includes(l.almacen)) : datos.lineas), [datos, almacenes]);
  const t = useMemo(() => {
    const unidades = delFiltro.reduce((s, l) => s + l.cantidad, 0);
    return {
      lineas: delFiltro.length,
      unidades: Math.round(unidades * 10000) / 10000,
      articulos: new Set(delFiltro.map((l) => l.parte)).size,
      documentos: new Set(delFiltro.map((l) => l.documento ?? '')).size,
      pesos: delFiltro.reduce((s, l) => s + (l.importePesos ?? 0), 0),
      pesosOc: delFiltro.reduce((s, l) => s + (l.importePesosOc ?? 0), 0),
      costoCero: delFiltro.filter((l) => !(l.costoMaximoUsd > 0)).length,
      pesosCostoCero: delFiltro.filter((l) => !(l.costoMaximoUsd > 0)).reduce((s, l) => s + (l.importePesos ?? 0), 0),
    };
  }, [delFiltro]);
  const porDia = useMemo(() => {
    const m = new Map<string, { dia: string; etiqueta: string; lineas: number; unidades: number }>();
    for (const l of delFiltro) {
      const d = l.fecha.slice(0, 10);
      const x = m.get(d) ?? { dia: d, etiqueta: diaCorto(d), lineas: 0, unidades: 0 };
      x.lineas += 1;
      x.unidades += l.cantidad;
      m.set(d, x);
    }
    return [...m.values()].sort((a, b) => a.dia.localeCompare(b.dia));
  }, [delFiltro]);
  const porMes = useMemo(() => datos.resumen.porMes.map((x) => ({ ...x, etiqueta: mesCorto(x.mes) })), [datos]);
  const marcas = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of delFiltro) for (const k of l.marcas) m.set(k, (m.get(k) ?? new Set<string>()).add(l.parte));
    return [...m].map(([k, s]) => ({ marca: k, articulos: s.size })).sort((a, b) => b.articulos - a.articulos);
  }, [delFiltro]);
  const almacenesLineas = useMemo(() => [...new Set(delFiltro.map((l) => l.almacen))].sort(), [delFiltro]);

  const visibles = useMemo(() => {
    const q = normaliza(buscar.trim());
    return delFiltro.filter(
      (l) =>
        (!q || [l.parte, l.descripcion, l.documento, l.documentoDescripcion, l.observacion, l.anaquel].some((x) => x && normaliza(x).includes(q))) &&
        (!almacen || l.almacen === almacen) &&
        (!marca || l.marcas.includes(marca)),
    );
  }, [delFiltro, buscar, almacen, marca]);
  const total = visibles.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagina = Math.min(page, totalPages);
  const hayFiltros = !!(buscar || almacen || marca);
  const filtra =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  if (!delFiltro.length)
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
        {datos.lineas.length ? 'En este almacén no hubo devoluciones sin orden de trabajo del 1-oct al corte' : 'Este corte no trae devoluciones'}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <Dato titulo="Líneas" valor={t.lineas.toLocaleString('es-MX')} ayuda={`en ${t.documentos.toLocaleString('es-MX')} documentos de uso de Maximo`} />
        <Dato titulo="Unidades" valor={cantidad(t.unidades)} />
        <Dato titulo="Artículos" valor={t.articulos.toLocaleString('es-MX')} />
        <Dato titulo="Valor a costo de compra (TC del día)" valor={pesos(Math.round(t.pesos * 100) / 100)} />
        <Dato titulo="Con el TC de la OC" valor={pesos(Math.round(t.pesosOc * 100) / 100)} />
        <Dato
          titulo="Con costo 0 en Maximo"
          valor={`${t.costoCero.toLocaleString('es-MX')} líneas`}
          ayuda={`${pesos(Math.round(t.pesosCostoCero * 100) / 100)} del valor a costo de compra es de estas líneas: lo da una recepción del artículo, no Maximo`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-[#424846]">Por día</h3>
          <p className="text-sm text-gray-500">Líneas de devolución, del 1-oct al corte</p>
          <BarChart
            data={porDia}
            dataKey="lineas"
            xAxisKey="etiqueta"
            color="#222D59"
            height={300}
            barLabel={(d) => String(d.lineas)}
            tooltip={(d) => (
              <>
                <p className="font-semibold text-gray-900">{fechaCorta(`${d.dia}T00:00:00`)}</p>
                <p className="text-xs text-gray-600">
                  {d.lineas} líneas · {cantidad(d.unidades)} unidades
                </p>
              </>
            )}
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-[#424846]">Por mes, desde 2019</h3>
          <p className="text-sm text-gray-500">Devoluciones sin orden de trabajo de todos los almacenes (solo los meses que tuvieron)</p>
          <BarChart
            data={porMes}
            dataKey="lineas"
            xAxisKey="etiqueta"
            color="#DFA922"
            height={300}
            barLabel={(d) => String(d.lineas)}
            tooltip={(d) => (
              <>
                <p className="font-semibold text-gray-900">{d.etiqueta}</p>
                <p className="text-xs text-gray-600">
                  {d.lineas} devoluciones · {cantidad(d.unidades)} unidades
                </p>
              </>
            )}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-[#424846]">Las devoluciones</h3>
            <p className="text-sm text-gray-500">Cada línea con su documento, lo que había salido antes del artículo y lo que llama la atención</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {marcas.map((m) => (
              <button
                key={m.marca}
                type="button"
                onClick={() => filtra(setMarca)(marca === m.marca ? '' : m.marca)}
                aria-pressed={marca === m.marca}
                title={MARCA_AYUDA[m.marca]}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  marca === m.marca ? 'bg-[#222D59] text-white border-[#222D59]' : 'bg-white text-[#424846] border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{m.marca}</span>
                <span className={marca === m.marca ? 'text-white/80' : 'text-gray-500'}> · {m.articulos} artículos</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={buscar}
              onChange={(e) => filtra(setBuscar)(e.target.value)}
              placeholder="Buscar parte, descripción, documento u observación"
              aria-label="Buscar en las devoluciones"
              className={`${SELECT} w-full sm:w-96`}
            />
            {almacenesLineas.length > 1 && (
              <select value={almacen} onChange={(e) => filtra(setAlmacen)(e.target.value)} aria-label="Almacén" className={SELECT}>
                <option value="">Todos los almacenes</option>
                {almacenesLineas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
            {hayFiltros && (
              <button
                type="button"
                onClick={() => {
                  setBuscar('');
                  setAlmacen('');
                  setMarca('');
                  setPage(1);
                }}
                className="text-sm text-[#52AF32] hover:underline"
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>
        {total === 0 ? (
          <p className="p-10 text-center text-gray-500">Ninguna línea coincide con la búsqueda y los filtros</p>
        ) : (
          <>
            <div className="overflow-auto max-h-[70vh]">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th scope="col" className={`${TH} text-left`}>
                      Fecha
                    </th>
                    <th scope="col" className={`${TH} text-left`}>
                      Documento
                    </th>
                    <th scope="col" className={`${TH} text-left`}>
                      Artículo
                    </th>
                    <th scope="col" className={`${TH} text-left`}>
                      Almacén
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Cantidad
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Importe (TC del día)
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Importe (TC de la OC)
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Había salido antes
                    </th>
                    <th scope="col" className={`${TH} text-left`}>
                      Marcas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.slice((pagina - 1) * limit, pagina * limit).map((l) => (
                    <tr key={l.orden} className="hover:bg-[#f2f8ef]">
                      <td className={`${TD} whitespace-nowrap`} title={fechaHora(l.fecha)}>
                        {fechaCorta(l.fecha)}
                      </td>
                      <td className={`${TD} whitespace-nowrap`} title={l.documentoDescripcion ?? undefined}>
                        <span className="text-gray-900">{l.documento ?? '—'}</span>
                        {l.documentoDescripcion && <p className="text-xs text-gray-500 max-w-[12rem] truncate">{l.documentoDescripcion}</p>}
                      </td>
                      <td className={`${TD} min-w-[16rem] max-w-md`}>
                        <span className="font-medium text-[#424846] tabular-nums">{l.parte}</span>
                        <p className="text-xs text-gray-700 line-clamp-2" title={l.descripcion}>
                          {l.descripcion}
                        </p>
                        {l.observacion && <p className="mt-1 text-xs text-amber-700">{l.observacion}</p>}
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <span className="text-gray-900">{l.almacen}</span>
                        {l.anaquel && <p className="text-xs text-gray-500">{l.anaquel}</p>}
                      </td>
                      <td className={`${TD} text-right whitespace-nowrap tabular-nums text-gray-900`}>
                        {cantidad(l.cantidad)} <span className="text-xs text-gray-500">{l.unidad}</span>
                      </td>
                      <td className={`${TD} text-right whitespace-nowrap tabular-nums font-semibold text-gray-900`} title={l.valuacion ?? undefined}>
                        {pesos(l.importePesos)}
                      </td>
                      <td className={`${TD} text-right whitespace-nowrap tabular-nums text-gray-900`}>{pesos(l.importePesosOc)}</td>
                      <td className={`${TD} text-right whitespace-nowrap tabular-nums text-gray-700`}>
                        {l.salioAntes === null ? '—' : cantidad(l.salioAntes)}
                        {l.ultimaSalida && (
                          <p className="text-xs text-gray-500">
                            última {fechaCorta(l.ultimaSalida)}
                            {l.otUltimaSalida ? ` · ${l.otUltimaSalida}` : ''}
                          </p>
                        )}
                      </td>
                      <td className={`${TD} text-xs text-gray-600 min-w-[12rem]`}>{l.marcas.join('; ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={4} className={`${FOOT} text-left`}>
                      {hayFiltros ? 'Total de lo filtrado' : 'Total'} · {total.toLocaleString('es-MX')} {total === 1 ? 'línea' : 'líneas'}
                    </th>
                    <td className={`${FOOT} text-right tabular-nums`}>{cantidad(Math.round(visibles.reduce((s, l) => s + l.cantidad, 0) * 10000) / 10000)}</td>
                    <td className={`${FOOT} text-right tabular-nums`}>{pesos(Math.round(visibles.reduce((s, l) => s + (l.importePesos ?? 0), 0) * 100) / 100)}</td>
                    <td className={`${FOOT} text-right tabular-nums`}>{pesos(Math.round(visibles.reduce((s, l) => s + (l.importePesosOc ?? 0), 0) * 100) / 100)}</td>
                    <td className={FOOT} colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination
              meta={{ total, page: pagina, limit, totalPages, hasNext: pagina < totalPages, hasPrev: pagina > 1 }}
              onPageChange={setPage}
              onLimitChange={(v) => {
                setLimit(v);
                setPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
