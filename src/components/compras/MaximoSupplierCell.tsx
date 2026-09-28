'use client';

import { SUPPLIER_SOURCE_LABELS } from '@/types/purchases';
import type { SupplierFields } from '@/types/purchases';

/** G1: proveedor efectivo con su código y, si aplica, cómo lo nombra Maximo. */
export default function MaximoSupplierCell({
  po,
}: {
  po: SupplierFields & { vendor_name: string | null };
}) {
  const name = po.supplier_name ?? po.vendor_name;
  if (!name) return <span className="text-gray-400">—</span>;
  const title = po.supplier_source ? SUPPLIER_SOURCE_LABELS[po.supplier_source] : undefined;
  return (
    // <span> y no <div>: también va dentro del <p> de los campos del detalle
    <span className="block leading-tight max-w-56" title={title}>
      <span className="block truncate text-gray-900">{name}</span>
      {po.supplier_code && <span className="block text-xs text-gray-500">{po.supplier_code}</span>}
      {po.supplier_note && (
        <span className="block text-xs italic text-amber-700 break-words" title={po.supplier_note}>
          {po.supplier_note}
        </span>
      )}
    </span>
  );
}
