'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  CadenaMaximo,
  MaximoHabitualApprover,
  maximoStatusBadgeClass,
  maximoStatusTitle,
} from '@/types/purchases';
import LinkedFilterChips from './LinkedFilterChips';
import MaximoPoDetailModal from './MaximoPoDetailModal';

/**
 * G6 (reunión con Ingrid 2026-09-28) — Cadena de aprobación de Maximo, que
 * ya viene en el historial POSTATUS: comprador → nivel 1 → nivel 2 → … →
 * aprobación final (según el monto). Las OC en aprobación (WAPPR / APPRn /
 * APPRnREV) esperan al siguiente nivel desde su último cambio. L3
 * (2026-10-07): el nivel dice a quién le toca, su TITULAR según la tabla del
 * cliente ("Nivel 2 · Miguel Ángel Ortiz García", lo arma el API); los
 * aprobadores HABITUALES dicen quién lo aprueba de verdad en el historial.
 * Los niveles 1/2/3 y Director General de ABENT son del Comité (CCC), no de
 * esta cadena.
 */

const dayCount = (days: number | null) =>
  days === null ? 'sin fecha' : `${days} ${days === 1 ? 'día' : 'días'}`;

// L3: la etiqueta trae el nombre del titular; solo la primera letra va en minúscula
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount === null) return '—';
  try {
    return new Intl.NumberFormat('es-MX', currency ? { style: 'currency', currency } : { minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toLocaleString('es-MX')} ${currency ?? ''}`.trim();
  }
};

export function useCadenaMaximo() {
  return useQuery({
    queryKey: ['reportes', 'cadena-maximo'],
    queryFn: () => api.get<CadenaMaximo>('/compras/reportes/cadena-maximo'),
  });
}

function Habituales({ list }: { list: MaximoHabitualApprover[] }) {
  if (list.length === 0) return <span className="text-gray-400">Sin historial</span>;
  return (
    <>
      {list.map((h, i) => (
        <span key={h.usuario}>
          {i > 0 && ', '}
          <Link
            href={`/compras/aprobaciones?tab=maximo&aprobador=${encodeURIComponent(h.usuario)}`}
            className="text-[#222D59] hover:underline"
            title={`${h.usuario} · hizo ${h.veces.toLocaleString('es-MX')} veces la aprobación siguiente desde este estatus`}
          >
            {h.nombre}
          </Link>
        </span>
      ))}
    </>
  );
}

/** Resumen por nivel (dashboard, reportes y arriba de la pestaña). */
export function MaximoChainSummary({ cadena, linkToTab = true }: { cadena: CadenaMaximo; linkToTab?: boolean }) {
  if (cadena.total === 0) {
    return <p className="text-sm text-gray-600"><strong>Maximo:</strong> sin órdenes en aprobación.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        <strong>Maximo: {cadena.total.toLocaleString('es-MX')} en aprobación</strong>
        {' · '}
        {cadena.por_nivel.map((n) => `${n.pendientes} en ${lowerFirst(n.etiqueta)}`).join(', ')}
        {linkToTab && (
          <>
            {' · '}
            <Link href="/compras/aprobaciones?tab=maximo" className="text-[#52AF32] hover:underline whitespace-nowrap">
              ver las órdenes
            </Link>
          </>
        )}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {cadena.por_nivel.map((n) => (
          <div key={n.etiqueta} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm font-medium text-[#424846]">{n.etiqueta}</p>
            <p className="text-2xl font-bold text-[#424846] tabular-nums">
              {n.pendientes}
              <span className="ml-1 text-xs font-normal text-gray-600">{n.pendientes === 1 ? 'orden' : 'órdenes'}</span>
            </p>
            <p className="text-xs text-gray-600">
              la más antigua: {dayCount(n.dias_max)}
              {n.dias_promedio !== null && ` · promedio ${n.dias_promedio} días`}
            </p>
            <p className="mt-1 text-xs text-gray-700">
              Suelen aprobar: <Habituales list={n.aprobadores_habituales} />
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600">{cadena.nota}</p>
    </div>
  );
}

/** Pestaña de Aprobaciones: las OC en aprobación con su nivel y antigüedad. */
export default function MaximoChainTab({ initialApprover = null }: { initialApprover?: string | null }) {
  const cadenaQ = useCadenaMaximo();
  const [approver, setApprover] = useState(initialApprover);
  const [detailPonum, setDetailPonum] = useState<string | null>(null);
  const cadena = cadenaQ.data;
  // G5: clic en un aprobador → las OC del paso que suele aprobar
  const ordenes = (cadena?.ordenes ?? []).filter(
    (o) => !approver || o.aprobadores_habituales.some((h) => h.usuario === approver),
  );
  const approverName =
    approver &&
    (cadena?.ordenes.flatMap((o) => o.aprobadores_habituales).find((h) => h.usuario === approver)?.nombre ?? approver);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <p className="text-sm text-gray-600">
          Cadena de aprobación de <strong>Maximo</strong> (solo lectura: se aprueba en Maximo). Nivel que espera cada OC con
          su titular y quién suele aprobar ese paso.
        </p>
        {cadenaQ.isError ? (
          <p className="text-sm text-red-600">No se pudo cargar la cadena de aprobación de Maximo.</p>
        ) : !cadena ? (
          <div className="w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        ) : (
          <MaximoChainSummary cadena={cadena} linkToTab={false} />
        )}
        <LinkedFilterChips
          filters={
            approver
              ? [
                  {
                    key: 'aprobador',
                    label: 'Aprobador',
                    value: `${approverName} (${approver}) · órdenes del paso que suele aprobar`,
                    title: 'Se muestran las órdenes del paso que este usuario suele aprobar en el historial (puede no ser el titular del nivel)',
                    onClear: () => setApprover(null),
                  },
                ]
              : []
          }
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {cadena && ordenes.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            {approver ? 'Este usuario no suele aprobar ninguna de las órdenes que esperan hoy.' : 'Sin órdenes de Maximo en aprobación.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#424846]">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase">PONUM</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase">Descripción</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase">Proveedor</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-white uppercase">Monto</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase">Espera</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-white uppercase whitespace-nowrap">Días</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase">Suelen aprobar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordenes.map((o, idx) => (
                  <tr
                    key={o.ponum}
                    onClick={() => setDetailPonum(o.ponum)}
                    className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-3 py-3 font-mono font-medium text-[#222D59]">{o.ponum}</td>
                    <td className="px-3 py-3 text-sm text-gray-900 max-w-56 truncate" title={o.descripcion ?? undefined}>
                      {o.descripcion ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className="block text-gray-900 max-w-56 truncate">{o.proveedor ?? '—'}</span>
                      {o.proveedor_nota && <span className="block text-xs italic text-amber-700">{o.proveedor_nota}</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-gray-900 whitespace-nowrap">{formatMoney(o.monto, o.moneda)}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${maximoStatusBadgeClass(o.estatus)}`}
                        title={maximoStatusTitle(o.estatus)}
                      >
                        {o.estatus_etiqueta}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{o.nivel_etiqueta}</td>
                    <td
                      className={`px-3 py-3 text-sm text-right tabular-nums ${(o.dias ?? 0) >= 7 ? 'font-semibold text-red-700' : 'text-gray-900'}`}
                      title="Días desde el último cambio de estatus (cuando llegó a este paso)"
                    >
                      {o.dias ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <Habituales list={o.aprobadores_habituales} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cadena?.truncado && (
          <p className="px-4 py-2 text-xs text-amber-700">Se muestran las 500 más antiguas.</p>
        )}
      </div>

      <MaximoPoDetailModal isOpen={detailPonum !== null} onClose={() => setDetailPonum(null)} ponum={detailPonum} />
    </div>
  );
}
