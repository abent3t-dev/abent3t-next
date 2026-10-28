'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFpaBudget, useFpaCatalog } from '@/hooks/useFpa';
import BudgetLinesTable, { groupLines, type AmountMode } from '@/components/fpa/BudgetLinesTable';
import LineModal from '@/components/fpa/LineModal';
import { BudgetFlowCard, BudgetFlowHistory } from '@/components/fpa/BudgetFlow';
import FpaAmount from '@/components/fpa/FpaAmount';
import { BudgetStatusBadge, VersionStatusBadge } from '@/components/fpa/StatusBadges';
import { VersionFacts } from '@/components/fpa/VersionPicker';
import type { FpaLine } from '@/types/fpa';

/**
 * FP&A (A3, lunes 26-oct) — Captura del presupuesto de un área.
 *
 * Encabezado de solo lectura (ejercicio, versión, área, estado, tipos de
 * cambio, inflación y total en pesos), selector pesos / moneda original y las
 * líneas agrupadas por categoría. Con can_edit: "Agregar línea" y clic en una
 * fila para editarla; sin él, la fila abre la línea en solo lectura.
 * B3: arriba, el flujo de aprobación (turno y pasos de quien mira); abajo,
 * su historial por ronda.
 */

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function BackLink({ versionId }: { versionId?: string }) {
  return (
    <Link
      href={versionId ? `/fpa?version=${encodeURIComponent(versionId)}` : '/fpa'}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#222D59] hover:text-[#52AF32]"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Presupuestos
    </Link>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

const MODES: { id: AmountMode; label: string; title: string }[] = [
  { id: 'pesos', label: 'Pesos', title: 'Todos los montos en pesos, con el tipo de cambio y la inflación de la versión' },
  { id: 'original', label: 'Moneda original', title: 'Cada línea en su moneda (sin subtotales: mezclarían monedas)' },
];

export default function FpaPresupuestoPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const budgetQ = useFpaBudget(id);
  const detail = budgetQ.data;
  // El catálogo solo hace falta para capturar
  const catalogQ = useFpaCatalog(!!detail?.can_edit);
  const [mode, setMode] = useState<AmountMode>('pesos');
  const [modal, setModal] = useState<{ open: boolean; line: FpaLine | null }>({ open: false, line: null });

  if (budgetQ.isLoading || !id) {
    return (
      <div className="p-6 flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (budgetQ.isError || !detail) {
    return (
      <div className="p-6 space-y-4 bg-gray-50 min-h-screen">
        <BackLink />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-800">
          No se pudo cargar el presupuesto: {errorText(budgetQ.error, 'intenta de nuevo')}
        </div>
      </div>
    );
  }

  const groups = groupLines(detail);
  const version = detail.version;
  const canEdit = detail.can_edit;
  const catalogError = catalogQ.isError ? errorText(catalogQ.error, 'intenta de nuevo') : null;

  return (
    <div className="p-6 space-y-5 bg-gray-50 min-h-screen">
      <BackLink versionId={detail.version_id} />

      {/* Encabezado (solo lectura) */}
      <div className="bg-white rounded-lg shadow p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500">Presupuesto del área</p>
            <h1 className="text-2xl font-bold text-[#424846]">{detail.area.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <BudgetStatusBadge status={detail.status} />
              {!canEdit && (
                <span
                  className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-[#222D59]/10 text-[#222D59]"
                  title="Se captura mientras el presupuesto está en borrador o devuelto y la versión en captura, y solo quien es responsable de captura del área o Planeación"
                >
                  Solo consulta
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total en pesos</p>
            <p className="text-2xl font-bold text-[#222D59]">
              <FpaAmount value={detail.totals.total_mxn} cents />
            </p>
            <p className="text-xs text-gray-500">
              {detail.line_count.toLocaleString('es-MX')} {detail.line_count === 1 ? 'línea' : 'líneas'}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-gray-100 pt-4">
          <Fact label="Ejercicio">{version.fiscal_year}</Fact>
          <Fact label="Versión">
            <span className="font-mono font-semibold text-[#222D59]">{version.code}</span>{' '}
            <span className="text-gray-600">{version.name}</span>{' '}
            <VersionStatusBadge status={version.status} />
          </Fact>
          <Fact label="Área">{detail.area.name}</Fact>
          <Fact label="Captura">
            {detail.capturer?.full_name ?? <span className="italic text-gray-400">Sin asignar</span>}
          </Fact>
          <Fact label="Aprueba">
            {detail.approver?.full_name ?? <span className="italic text-gray-400">Sin asignar</span>}
          </Fact>
        </dl>
        <VersionFacts version={version} />
      </div>

      {/* Flujo de aprobación (B3) */}
      <BudgetFlowCard budgetId={detail.id} />

      {/* Herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm" role="group" aria-label="Moneda de los montos">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              title={m.title}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === m.id ? 'bg-[#52AF32] text-white' : 'text-[#424846] hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            {catalogError && <p className="text-sm text-red-600">No se pudo cargar el catálogo: {catalogError}</p>}
            <button
              type="button"
              onClick={() => setModal({ open: true, line: null })}
              disabled={!catalogQ.data}
              title={catalogQ.data ? undefined : 'Cargando el catálogo…'}
              className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar línea
            </button>
          </div>
        )}
      </div>

      {/* Líneas */}
      <div className="bg-white rounded-lg shadow">
        {groups.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">Todavía no hay líneas en este presupuesto</p>
            {canEdit && (
              <p className="text-sm text-gray-400">Usa &quot;Agregar línea&quot; para capturar la primera</p>
            )}
          </div>
        ) : (
          <>
            <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
              {mode === 'pesos'
                ? 'Montos en pesos, sin centavos (pasa el cursor sobre un monto para verlos). Clic en una línea para '
                : 'Montos en la moneda de cada línea; los subtotales no aplican porque mezclarían monedas. Clic en una línea para '}
              {canEdit ? 'editarla.' : 'ver su detalle.'}
            </p>
            <BudgetLinesTable
              detail={detail}
              groups={groups}
              mode={mode}
              onOpenLine={(line) => setModal({ open: true, line })}
            />
          </>
        )}
      </div>

      <BudgetFlowHistory budgetId={detail.id} />

      <LineModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, line: null })}
        budget={detail}
        line={modal.line}
        canEdit={canEdit}
        catalog={catalogQ.data}
        catalogError={catalogError}
      />
    </div>
  );
}
