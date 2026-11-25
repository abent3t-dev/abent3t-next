'use client';

import { useMemo, useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import { cantidad, clasificacionNivel1, costoMoneda, fechaCorta, fechaHora, pesos, tipoCambio } from '@/lib/almacen-format';
import type { AlmacenExistencia } from '@/types/almacen';

/**
 * Almacén — lo que queda de cada entrada al corte que tiene costo, como la hoja
 * "Existencias al corte" del Excel, con los dos tipos de cambio en sus columnas
 * (Mariana, 25-nov). Llegan todas las filas del filtro de almacén: la búsqueda,
 * los filtros y el orden se hacen aquí.
 */

type Orden = 'excel' | 'importe' | 'antiguas' | 'recientes';

const ORDEN_LABELS: Record<Orden, string> = {
  excel: 'Como en el Excel',
  importe: 'Importe, de mayor a menor',
  antiguas: 'Entrada más antigua primero',
  recientes: 'Entrada más reciente primero',
};

/** Sin acentos ni mayúsculas, para buscar "valvula" y encontrar "VÁLVULA". */
export const normaliza = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const TH = 'sticky top-0 z-10 bg-[#424846] px-3 py-2.5 text-xs font-medium uppercase text-white whitespace-nowrap';
const TD = 'px-3 py-2 border-b border-gray-200 align-top text-sm';
const FOOT = 'sticky bottom-0 bg-[#222D59] px-3 py-2.5 text-sm font-bold text-white whitespace-nowrap';
export const SELECT =
  'px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#424846] bg-white focus:outline-none focus:ring-2 focus:ring-[#52AF32]/30 focus:border-[#52AF32]';

export default function AlmacenExistencias({ filas }: { filas: AlmacenExistencia[] }) {
  const [buscar, setBuscar] = useState('');
  const [clasificacion, setClasificacion] = useState('');
  const [moneda, setMoneda] = useState('');
  const [origen, setOrigen] = useState('');
  const [herramientas, setHerramientas] = useState(false);
  const [orden, setOrden] = useState<Orden>('excel');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const opciones = useMemo(() => {
    const unicos = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'es'));
    return {
      clasificacion: unicos(filas.map((f) => clasificacionNivel1(f.clasificacion))),
      moneda: unicos(filas.map((f) => f.moneda ?? '')).filter(Boolean),
      origen: unicos(filas.map((f) => f.origen)),
    };
  }, [filas]);

  const visibles = useMemo(() => {
    const q = normaliza(buscar.trim());
    const r = filas.filter(
      (f) =>
        (!q ||
          [f.parte, f.descripcion, f.oc, f.almacen, f.almacenFisico, f.clasificacion].some(
            (x) => x !== null && normaliza(x).includes(q),
          )) &&
        (!clasificacion || clasificacionNivel1(f.clasificacion) === clasificacion) &&
        (!moneda || f.moneda === moneda) &&
        (!origen || f.origen === origen) &&
        (!herramientas || f.herramienta),
    );
    // Las filas sin fecha van al final en los dos órdenes por fecha.
    const fecha = (f: AlmacenExistencia, vacia: string) => f.fechaEntrada ?? vacia;
    if (orden === 'importe') r.sort((a, b) => (b.importePesos ?? -1) - (a.importePesos ?? -1) || a.orden - b.orden);
    if (orden === 'antiguas') r.sort((a, b) => fecha(a, '9').localeCompare(fecha(b, '9')) || a.orden - b.orden);
    if (orden === 'recientes') r.sort((a, b) => fecha(b, '0').localeCompare(fecha(a, '0')) || a.orden - b.orden);
    return r;
  }, [filas, buscar, clasificacion, moneda, origen, herramientas, orden]);

  const total = visibles.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagina = Math.min(page, totalPages);
  const filasPagina = visibles.slice((pagina - 1) * limit, pagina * limit);
  const suma = visibles.reduce((s, f) => s + (f.importePesos ?? 0), 0);
  const sumaOc = visibles.reduce((s, f) => s + (f.importePesosOc ?? 0), 0);
  const unidades = visibles.reduce((s, f) => s + f.cantidad, 0);
  const articulos = new Set(visibles.map((f) => f.parte)).size;
  const hayFiltros = !!(buscar || clasificacion || moneda || origen || herramientas);

  /** Cambiar un filtro regresa a la primera página. */
  const filtra =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  const limpiar = () => {
    setBuscar('');
    setClasificacion('');
    setMoneda('');
    setOrigen('');
    setHerramientas(false);
    setPage(1);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#424846]">Existencias al corte</h2>
            <p className="text-sm text-gray-500">
              Lo que queda de cada entrada con costo, con el tipo de cambio del día de la entrada y con el de la orden de compra
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Ordenar:
            <select value={orden} onChange={(e) => filtra(setOrden)(e.target.value as Orden)} className={SELECT}>
              {(Object.keys(ORDEN_LABELS) as Orden[]).map((o) => (
                <option key={o} value={o}>
                  {ORDEN_LABELS[o]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={buscar}
            onChange={(e) => filtra(setBuscar)(e.target.value)}
            placeholder="Buscar parte, descripción u OC"
            aria-label="Buscar en las existencias"
            className={`${SELECT} w-full sm:w-80`}
          />
          <select
            value={clasificacion}
            onChange={(e) => filtra(setClasificacion)(e.target.value)}
            aria-label="Clasificación"
            className={SELECT}
          >
            <option value="">Todas las clasificaciones</option>
            {opciones.clasificacion.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={moneda} onChange={(e) => filtra(setMoneda)(e.target.value)} aria-label="Moneda" className={SELECT}>
            <option value="">Todas las monedas</option>
            {opciones.moneda.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select value={origen} onChange={(e) => filtra(setOrigen)(e.target.value)} aria-label="Origen del costo" className={SELECT}>
            <option value="">Todos los orígenes</option>
            {opciones.origen.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={herramientas}
              onChange={(e) => filtra(setHerramientas)(e.target.checked)}
              className="w-4 h-4 accent-[#52AF32]"
            />
            Solo herramientas
          </label>
          {hayFiltros && (
            <button type="button" onClick={limpiar} className="text-sm text-[#52AF32] hover:underline">
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      {total === 0 ? (
        <p className="p-10 text-center text-gray-500">Ninguna fila coincide con la búsqueda y los filtros</p>
      ) : (
        <>
          <div className="overflow-auto max-h-[70vh]">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th scope="col" className={`${TH} text-left`}>
                    Artículo
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    Almacén
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    Entrada
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Cantidad
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Costo unitario
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    TC del día
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Importe (TC del día)
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    TC de la OC
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Importe (TC de la OC)
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    Origen del costo
                  </th>
                </tr>
              </thead>
              <tbody>
                {filasPagina.map((f) => (
                  <tr key={f.orden} className="hover:bg-[#f2f8ef]">
                    <td className={`${TD} min-w-[17rem] max-w-md`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#424846] tabular-nums">{f.parte}</span>
                        {f.herramienta && (
                          <span
                            className="px-2 py-0.5 text-xs rounded-full bg-[#DFA922]/15 text-[#8a6a10]"
                            title={f.enSuInventario === false ? 'No viene en su reporte INVENTARIO AL CORTE; sí en su FIFO' : undefined}
                          >
                            Herramienta
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2" title={f.descripcion}>
                        {f.descripcion}
                      </p>
                      {f.clasificacion && <p className="text-xs text-gray-500">{f.clasificacion}</p>}
                      {f.nota && <p className="mt-1 text-xs text-amber-700">{f.nota}</p>}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className="text-gray-900">{f.almacen}</span>
                      {f.almacenFisico && <p className="text-xs text-gray-500">{f.almacenFisico}</p>}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className="text-gray-900" title={f.fechaEntrada ? fechaHora(f.fechaEntrada) : undefined}>
                        {fechaCorta(f.fechaEntrada)}
                      </span>
                      {f.oc && <p className="text-xs text-gray-500">OC {f.oc}</p>}
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums text-gray-900`}>
                      {cantidad(f.cantidad)} <span className="text-xs text-gray-500">{f.unidad}</span>
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums text-gray-900`}>{costoMoneda(f.costo, f.moneda)}</td>
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums text-gray-700`} title={f.fuenteTc ?? undefined}>
                      {tipoCambio(f.tipoCambio)}
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums font-semibold text-gray-900`}>{pesos(f.importePesos)}</td>
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums text-gray-700`} title={f.fuenteTcOc ?? undefined}>
                      {tipoCambio(f.tipoCambioOc)}
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums font-semibold text-gray-900`}>{pesos(f.importePesosOc)}</td>
                    <td className={`${TD} text-xs text-gray-600 min-w-[9rem]`}>{f.origen}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3} className={`${FOOT} text-left`}>
                    {hayFiltros ? 'Total de lo filtrado' : 'Total'} · {total.toLocaleString('es-MX')} {total === 1 ? 'fila' : 'filas'},{' '}
                    {articulos.toLocaleString('es-MX')} {articulos === 1 ? 'artículo' : 'artículos'}
                  </th>
                  <td className={`${FOOT} text-right tabular-nums`}>{cantidad(Math.round(unidades * 10000) / 10000)}</td>
                  <td className={FOOT} colSpan={2} />
                  <td className={`${FOOT} text-right tabular-nums`}>{pesos(Math.round(suma * 100) / 100)}</td>
                  <td className={FOOT} />
                  <td className={`${FOOT} text-right tabular-nums`}>{pesos(Math.round(sumaOc * 100) / 100)}</td>
                  <td className={FOOT} />
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
  );
}
