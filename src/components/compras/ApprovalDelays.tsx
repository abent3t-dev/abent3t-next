'use client';

import { formatDays } from '@/lib/compras-format';
import type { ApprovalStats, ApprovalTimesReport } from '@/types/purchases';

/**
 * Quién tiene detenidas las aprobaciones y desde cuándo (dashboard y
 * reportes). SAP sí dice quién tiene cada solicitud; Maximo solo registra al
 * aprobador cuando aprueba, así que de sus OC en espera solo hay conteo y días.
 */

const LEVEL_LABELS: Record<number, string> = {
  1: 'Nivel 1',
  2: 'Nivel 2',
  3: 'Nivel 3',
  4: 'Director General',
};

const dayCount = (days: number) => `${days} ${days === 1 ? 'día' : 'días'}`;

export function SapPendingApprovers({ tiempos }: { tiempos: ApprovalTimesReport }) {
  const historico = new Map(tiempos.sap.por_aprobador.map((r) => [r.aprobador, r.promedio_dias]));
  const rows = tiempos.sap.pendientes_por_aprobador;
  const maximo = tiempos.maximo_pendientes;

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">Sin solicitudes pendientes de autorizar en SAP.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-600 uppercase">
                <th className="px-3 py-2">Aprobador</th>
                <th className="px-3 py-2 text-right">Pendientes</th>
                <th className="px-3 py-2 text-right">La más antigua</th>
                <th className="px-3 py-2 text-right">Su promedio</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const promedio = historico.get(row.aprobador) ?? null;
                const esperando = row.dias_esperando_max;
                const retrasado = esperando !== null && promedio !== null && esperando > promedio;
                return (
                  <tr key={row.aprobador}>
                    <td className="px-3 py-2 text-gray-900 font-medium">{row.aprobador}</td>
                    <td className="px-3 py-2 text-right text-gray-900 tabular-nums">{row.pendientes}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${retrasado ? 'text-red-700' : 'text-gray-900'}`}>
                      {esperando === null ? 'Sin fecha' : dayCount(esperando)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                      {promedio === null ? 'Sin histórico' : formatDays(promedio)}
                    </td>
                    <td className="px-3 py-2">
                      {promedio === null || esperando === null ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          Sin referencia
                        </span>
                      ) : retrasado ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Retrasado
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          En tiempo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-600">
        Días naturales desde que se creó la solicitud de autorización. &quot;Retrasado&quot; = la más antigua
        lleva más días que lo que ese aprobador suele tardar en autorizar.
      </p>
      <p className="text-sm text-gray-700">
        <strong>Maximo:</strong>{' '}
        {maximo.total === 0
          ? 'sin órdenes en espera de aprobación.'
          : `${maximo.total} ${maximo.total === 1 ? 'orden' : 'órdenes'} en espera de aprobación` +
            (maximo.dias_esperando_max === null ? '.' : `, la más antigua desde hace ${dayCount(maximo.dias_esperando_max)}.`) +
            ' Maximo registra al aprobador hasta que aprueba, por eso aquí no hay nombre.'}
      </p>
    </div>
  );
}

export function AbentLevels({
  niveles,
  stats,
}: {
  niveles: ApprovalTimesReport['abent_niveles'];
  stats?: ApprovalStats;
}) {
  const sinAsignar = niveles.filter((n) => n.aprobadores.length === 0).length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {niveles.map((nivel) => {
          const s = stats?.[nivel.level];
          const total = s?.total ?? 0;
          return (
            <div key={nivel.level} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm font-medium text-[#424846]">{LEVEL_LABELS[nivel.level] ?? `Nivel ${nivel.level}`}</p>
              <p className="text-2xl font-bold text-[#424846] tabular-nums">{total}</p>
              <p className="text-xs text-gray-600">
                {total === 1 ? 'aprobación' : 'aprobaciones'} ·{' '}
                {total > 0 && s ? `promedio ${formatDays(s.average_time_days)}` : 'promedio sin datos'}
              </p>
              <p className={`mt-2 text-xs ${nivel.aprobadores.length ? 'text-gray-800' : 'text-amber-700 font-medium'}`}>
                {nivel.aprobadores.length ? nivel.aprobadores.join(', ') : 'Sin aprobador asignado en el sistema'}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-600">
        Estos niveles son del flujo propio de ABENT, que se llena cuando las requisiciones se capturan aquí; las de
        SAP y Maximo se aprueban en su ERP (tabla de arriba).
        {sinAsignar > 0 &&
          ` ${sinAsignar === 1 ? 'Un nivel no tiene' : `${sinAsignar} niveles no tienen`} aprobador: se asigna en Compras → Roles.`}
      </p>
    </div>
  );
}
