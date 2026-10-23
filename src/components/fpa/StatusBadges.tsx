'use client';

import {
  BUDGET_STATUS_LABELS,
  VERSION_STATUS_LABELS,
  type BudgetStatus,
  type VersionStatus,
} from '@/types/fpa';

/** FP&A (A3) — insignias del estado de un presupuesto y de una versión. */

const BUDGET_STATUS_CLASSES: Record<BudgetStatus, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-800',
  aprobado_area: 'bg-indigo-100 text-indigo-800',
  aprobado_planeacion: 'bg-purple-100 text-purple-800',
  aprobado_cfo: 'bg-green-100 text-green-800',
  devuelto: 'bg-red-100 text-red-800',
};

const VERSION_STATUS_CLASSES: Record<VersionStatus, string> = {
  preparacion: 'bg-amber-100 text-amber-800',
  captura: 'bg-[#52AF32]/15 text-[#3d8425]',
  cerrada: 'bg-gray-200 text-gray-700',
};

export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
        BUDGET_STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {BUDGET_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function VersionStatusBadge({ status }: { status: VersionStatus }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
        VERSION_STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {VERSION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
