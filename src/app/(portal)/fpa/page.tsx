'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFpaBudgets, useFpaContext, useFpaVersions } from '@/hooks/useFpa';
import VersionPicker from '@/components/fpa/VersionPicker';
import { BudgetStatusBadge } from '@/components/fpa/StatusBadges';
import FpaAmount from '@/components/fpa/FpaAmount';
import { defaultVersionId, sumMoney } from '@/lib/fpa-format';
import { DUTY_LABELS, type FpaContext } from '@/types/fpa';

/**
 * FP&A (A3, lunes 26-oct) — Presupuestos: chips de versión y un renglón por
 * área con quién captura, quién aprueba, estado y total en pesos. "Capturar"
 * si la persona puede editar ese presupuesto ahora (rol, área, estado y
 * versión: lo decide el API en can_edit); si no, "Ver".
 *
 * La versión elegida viaja en la URL (?version=) para que el regreso desde la
 * captura vuelva a la misma.
 */

function Spinner() {
  return (
    <div className="p-8 text-center">
      <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Qué ve la persona: todas las áreas, o las suyas con lo que hace en cada una. */
function ContextLine({ context }: { context: FpaContext }) {
  if (context.sees_all) {
    return <p className="mt-1 text-sm text-gray-600">Ves los presupuestos de todas las áreas.</p>;
  }
  if (context.areas.length === 0) {
    return (
      <p className="mt-1 text-sm text-amber-700">
        Todavía no eres responsable de ninguna área en FP&amp;A. Pide a Planeación que te asigne la tuya.
      </p>
    );
  }
  return (
    <p className="mt-1 text-sm text-gray-600">
      Tus áreas:{' '}
      {context.areas.map((area, idx) => (
        <span key={area.area_id}>
          {idx > 0 && ' · '}
          <strong className="font-semibold text-[#424846]">{area.area_name}</strong>
          {area.duties.length > 0 && ` (${area.duties.map((d) => DUTY_LABELS[d] ?? d).join(', ')})`}
        </span>
      ))}
    </p>
  );
}

function PresupuestosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const versionsQ = useFpaVersions();
  const contextQ = useFpaContext();

  const versions = versionsQ.data ?? [];
  const requested = searchParams.get('version');
  const versionId =
    requested && versions.some((v) => v.id === requested) ? requested : defaultVersionId(versions);

  const budgetsQ = useFpaBudgets(versionId);
  const budgets = budgetsQ.data ?? [];
  // Suma de los totales que ya calculó el API (en centavos); un área
  // "No disponible" deja el total en "No disponible"
  const total = sumMoney(budgets.map((b) => b.total_mxn));
  const lineCount = budgets.reduce((sum, b) => sum + b.line_count, 0);
  const totalLabel = contextQ.data && !contextQ.data.sees_all ? 'Total de tus áreas' : 'Total de la versión';

  const selectVersion = (id: string) => {
    router.replace(`/fpa?version=${encodeURIComponent(id)}`, { scroll: false });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Presupuestos</h1>
        <p className="text-gray-500">Presupuesto de cada área por versión: quién captura, quién aprueba y el total en pesos</p>
        {contextQ.data && <ContextLine context={contextQ.data} />}
      </div>

      {/* Versiones */}
      <div className="bg-white p-4 rounded-lg shadow">
        {versionsQ.isLoading ? (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
            Cargando versiones…
          </div>
        ) : versionsQ.isError ? (
          <p className="text-sm text-red-600">
            No se pudieron cargar las versiones: {errorText(versionsQ.error, 'intenta de nuevo')}
          </p>
        ) : versions.length === 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#424846]">Todavía no hay versiones de presupuesto disponibles</p>
            <p className="text-sm text-gray-500">Una versión aparece aquí cuando FP&amp;A la abre a captura.</p>
          </div>
        ) : (
          <VersionPicker versions={versions} value={versionId} onChange={selectVersion} />
        )}
      </div>

      {/* Presupuestos de la versión */}
      {versionId && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {budgetsQ.isLoading ? (
            <Spinner />
          ) : budgetsQ.isError ? (
            <p className="p-8 text-center text-red-600">
              No se pudieron cargar los presupuestos: {errorText(budgetsQ.error, 'intenta de nuevo')}
            </p>
          ) : budgets.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500">Todavía no hay presupuestos en esta versión</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Área</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Captura</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Aprueba</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Líneas</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Total en pesos</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {budgets.map((budget, idx) => (
                    <tr key={budget.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-[#424846]">{budget.area.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {budget.capturer?.full_name ?? <span className="italic text-gray-400">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {budget.approver?.full_name ?? <span className="italic text-gray-400">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BudgetStatusBadge status={budget.status} />
                        {budget.current_round > 0 && (
                          <span className="block mt-0.5 text-xs text-gray-500">Ronda {budget.current_round}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 tabular-nums">
                        {budget.line_count.toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        <FpaAmount value={budget.total_mxn} cents />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {budget.can_edit ? (
                          <Link
                            href={`/fpa/presupuestos/${budget.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#52AF32] text-white hover:bg-[#52AF32]/90 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Capturar
                          </Link>
                        ) : (
                          <Link
                            href={`/fpa/presupuestos/${budget.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[#222D59]/40 text-[#222D59] hover:bg-[#222D59]/5 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-[#424846]">
                      {totalLabel}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700 tabular-nums">
                      {lineCount.toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#222D59]">
                      <FpaAmount value={total} cents />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** La versión vive en la URL: useSearchParams pide Suspense. */
export default function FpaPresupuestosPage() {
  return (
    <Suspense fallback={null}>
      <PresupuestosContent />
    </Suspense>
  );
}
