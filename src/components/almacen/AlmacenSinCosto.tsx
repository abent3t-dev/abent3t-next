'use client';

import { useMemo, useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import { normaliza, SELECT } from '@/components/almacen/AlmacenExistencias';
import { cantidad } from '@/lib/almacen-format';
import type { AlmacenExistencia } from '@/types/almacen';

/**
 * Almacén — lo que no tiene una entrada con costo en Maximo, por artículo y
 * almacén, sin costo (como pidió Mariana el 25-nov), con el motivo y cómo
 * llegó el saldo a ese almacén. Es la hoja "Sin costo" del Excel.
 */

const MOTIVO_AYUDA: Record<string, string> = {
  'Sin compras en Maximo': 'El artículo no tiene ninguna recepción en Maximo',
  'Solo compras de salida directa': 'Sus recepciones se entregaron a una orden de trabajo sin pasar por un almacén',
  'Sus compras no alcanzan': 'Sus recepciones ya cubren su saldo en este u otros almacenes',
  'Devolución en 0': 'Regresó al almacén con costo 0 y el artículo no tiene recepciones',
};
/** La ayuda de un motivo, también del compuesto ("Devolución en 0 y Sin compras en Maximo"). */
const ayudaMotivo = (m: string | null) =>
  (m ?? '')
    .split(' y ')
    .map((x) => MOTIVO_AYUDA[x])
    .filter(Boolean)
    .join('; ') || undefined;

const TH = 'sticky top-0 z-10 bg-[#424846] px-3 py-2.5 text-xs font-medium uppercase text-white whitespace-nowrap';
const TD = 'px-3 py-2 border-b border-gray-200 align-top text-sm';
const FOOT = 'sticky bottom-0 bg-[#222D59] px-3 py-2.5 text-sm font-bold text-white whitespace-nowrap';

export default function AlmacenSinCosto({ filas }: { filas: AlmacenExistencia[] }) {
  const [buscar, setBuscar] = useState('');
  const [motivo, setMotivo] = useState('');
  const [herramientas, setHerramientas] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const motivos = useMemo(() => [...new Set(filas.flatMap((f) => (f.motivo ?? '').split(' y ')).filter(Boolean))].sort(), [filas]);
  const resumen = useMemo(
    () =>
      motivos.map((m) => {
        const l = filas.filter((f) => (f.motivo ?? '').split(' y ').includes(m));
        return { motivo: m, filas: l.length, unidades: l.reduce((s, f) => s + f.cantidad, 0) };
      }),
    [filas, motivos],
  );
  const visibles = useMemo(() => {
    const q = normaliza(buscar.trim());
    return filas.filter(
      (f) =>
        (!q || [f.parte, f.descripcion, f.almacen, f.clasificacion, f.almacenFisico].some((x) => x !== null && normaliza(x).includes(q))) &&
        (!motivo || (f.motivo ?? '').split(' y ').includes(motivo)) &&
        (!herramientas || f.herramienta),
    );
  }, [filas, buscar, motivo, herramientas]);

  const total = visibles.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagina = Math.min(page, totalPages);
  const unidades = visibles.reduce((s, f) => s + f.cantidad, 0);
  const articulos = new Set(visibles.map((f) => f.parte)).size;
  const hayFiltros = !!(buscar || motivo || herramientas);
  const filtra =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[#424846]">Sin costo</h2>
          <p className="text-sm text-gray-500">
            Lo que no tiene una entrada con costo en Maximo, por artículo y almacén. Va sin costo, como pidió Contabilidad.
          </p>
        </div>
        {resumen.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {resumen.map((r) => (
              <button
                key={r.motivo}
                type="button"
                onClick={() => filtra(setMotivo)(motivo === r.motivo ? '' : r.motivo)}
                aria-pressed={motivo === r.motivo}
                title={MOTIVO_AYUDA[r.motivo]}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  motivo === r.motivo ? 'bg-[#222D59] text-white border-[#222D59]' : 'bg-white text-[#424846] border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{r.motivo}</span>
                <span className={motivo === r.motivo ? 'text-white/80' : 'text-gray-500'}>
                  {' '}
                  · {r.filas.toLocaleString('es-MX')} · {cantidad(Math.round(r.unidades * 100) / 100)} u.
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={buscar}
            onChange={(e) => filtra(setBuscar)(e.target.value)}
            placeholder="Buscar parte, descripción o almacén"
            aria-label="Buscar en lo que va sin costo"
            className={`${SELECT} w-full sm:w-80`}
          />
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
            <button
              type="button"
              onClick={() => {
                setBuscar('');
                setMotivo('');
                setHerramientas(false);
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
        <p className="p-10 text-center text-gray-500">{filas.length ? 'Ninguna fila coincide con la búsqueda y los filtros' : 'En este filtro todo tiene costo'}</p>
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
                  <th scope="col" className={`${TH} text-right`}>
                    Cantidad
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    Motivo
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    Cómo llegó al almacén
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.slice((pagina - 1) * limit, pagina * limit).map((f) => (
                  <tr key={f.orden} className="hover:bg-[#f2f8ef]">
                    <td className={`${TD} min-w-[17rem] max-w-md`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#424846] tabular-nums">{f.parte}</span>
                        {f.herramienta && <span className="px-2 py-0.5 text-xs rounded-full bg-[#DFA922]/15 text-[#8a6a10]">Herramienta</span>}
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
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums text-gray-900`}>
                      {cantidad(f.cantidad)} <span className="text-xs text-gray-500">{f.unidad}</span>
                    </td>
                    <td className={`${TD} text-gray-700 min-w-[10rem]`} title={ayudaMotivo(f.motivo)}>
                      {f.motivo ?? '—'}
                    </td>
                    <td className={`${TD} text-xs text-gray-600 min-w-[14rem]`}>{f.comoLlego ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2} className={`${FOOT} text-left`}>
                    {hayFiltros ? 'Total de lo filtrado' : 'Total'} · {total.toLocaleString('es-MX')} {total === 1 ? 'fila' : 'filas'},{' '}
                    {articulos.toLocaleString('es-MX')} {articulos === 1 ? 'artículo' : 'artículos'}
                  </th>
                  <td className={`${FOOT} text-right tabular-nums`}>{cantidad(Math.round(unidades * 10000) / 10000)}</td>
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
  );
}
