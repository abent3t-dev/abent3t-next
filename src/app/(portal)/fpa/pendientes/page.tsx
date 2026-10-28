'use client';

import Link from 'next/link';
import { useFpaPendientes } from '@/hooks/useFpa';
import FpaAmount from '@/components/fpa/FpaAmount';
import { formatDateTime } from '@/lib/fpa-format';
import { FLOW_STEP_OF, type FpaPendingItem } from '@/types/fpa';

/**
 * FP&A (B3) — Mis pendientes: los presupuestos que esperan mi firma (el paso
 * que me toca en esta ronda) y los que me regresaron para corregir y
 * reenviar. Mientras el correo de prod siga en simulación es el aviso
 * principal, con el contador del menú. Qué entra lo decide el API.
 */

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function What({ item }: { item: FpaPendingItem }) {
  if (item.kind === 'bloqueado') {
    return (
      <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
        Sin quien firme: paso {item.step ? FLOW_STEP_OF[item.step] : ''}
      </span>
    );
  }
  if (item.kind === 'devuelto') {
    return (
      <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 whitespace-nowrap">
        Corregir y reenviar
      </span>
    );
  }
  return (
    <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
      Firmar el paso {item.step ? FLOW_STEP_OF[item.step] : ''}
    </span>
  );
}

function Waiting({ item }: { item: FpaPendingItem }) {
  const days = item.business_days;
  return (
    <div>
      <p className="text-sm text-gray-900">{formatDateTime(item.since)}</p>
      <p className={`text-xs ${days > 2 ? 'font-medium text-amber-700' : 'text-gray-500'}`}>
        {days === 0 ? 'hoy' : days === 1 ? '1 día hábil' : `${days} días hábiles`}
      </p>
    </div>
  );
}

export default function FpaPendientesPage() {
  const pendingQ = useFpaPendientes();
  const items = pendingQ.data ?? [];
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Mis pendientes</h1>
        <p className="text-gray-500">
          Presupuestos que esperan tu firma y los que te regresaron para corregir. Planeación ve también los que nadie
          de los responsables puede firmar.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {pendingQ.isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : pendingQ.isError ? (
          <p className="p-8 text-center text-red-600">
            No se pudieron cargar tus pendientes: {errorText(pendingQ.error, 'intenta de nuevo')}
          </p>
        ) : items.length === 0 ? (
          <div className="p-10 text-center space-y-1">
            <p className="text-gray-500">No tienes pendientes</p>
            <p className="text-sm text-gray-400">Cuando un presupuesto espere tu firma o te lo regresen, aparece aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#424846]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Área</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Qué toca</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Desde</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Total enviado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Detalle</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, idx) => (
                  <tr key={item.budget_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#424846]">{item.area.name}</p>
                      <p className="text-xs text-gray-500">
                        <span className="font-mono">{item.version.code}</span> · ronda {item.current_round}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <What item={item} />
                    </td>
                    <td className="px-4 py-3">
                      <Waiting item={item} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      <FpaAmount value={item.total_mxn} cents />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                      {item.kind === 'bloqueado' ? (
                        <p className="text-amber-800">
                          Nadie de los responsables puede firmar este paso en esta ronda (nadie firma lo que envió ni dos
                          pasos de la misma ronda). Soporte lo puede firmar, o se registra otro firmante en Áreas.
                        </p>
                      ) : item.kind === 'devuelto' && item.last ? (
                        <>
                          <p>
                            Lo regresó <strong>{item.last.actor.full_name}</strong>
                            {item.last.step && ` en el paso ${FLOW_STEP_OF[item.last.step]}`}
                            {item.last.action === 'reabierto' && ' (reabierto)'}
                          </p>
                          {item.last.comment && <p className="text-xs text-gray-600 line-clamp-2">“{item.last.comment}”</p>}
                        </>
                      ) : item.sender ? (
                        <p>
                          Lo envió <strong>{item.sender.full_name}</strong>
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/fpa/presupuestos/${item.budget_id}`}
                        aria-label={`Abrir el presupuesto de ${item.area.name} (${item.version.code})`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#52AF32] text-white hover:bg-[#52AF32]/90 transition-colors"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
