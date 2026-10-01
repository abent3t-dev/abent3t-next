'use client';

import {
  CONTRACT_STATUS_CLASSES,
  CONTRACT_STATUS_LABELS,
  ContractStatus,
} from '@/types/purchases';

/**
 * Fase §15 — Badge de estatus de contrato (vigente/vencido/renovado/cancelado).
 * J2 (2026-10-01): el vencido histórico (sin avisos) sale en gris.
 */
export default function ContractStatusBadge({
  status,
  historico = false,
}: {
  status: ContractStatus;
  historico?: boolean;
}) {
  if (status === 'vencido' && historico) {
    return (
      <span
        className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 whitespace-nowrap"
        title="Ya estaba vencido al cargar la base: no genera avisos. Desmárcalo en el contrato si está en renovación."
      >
        Vencido (histórico)
      </span>
    );
  }
  return (
    <span
      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${CONTRACT_STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {CONTRACT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
