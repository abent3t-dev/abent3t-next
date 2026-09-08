'use client';

import {
  CONTRACT_STATUS_CLASSES,
  CONTRACT_STATUS_LABELS,
  ContractStatus,
} from '@/types/purchases';

/** Fase §15 — Badge de estatus de contrato (vigente/vencido/renovado/cancelado). */
export default function ContractStatusBadge({
  status,
}: {
  status: ContractStatus;
}) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${CONTRACT_STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {CONTRACT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
