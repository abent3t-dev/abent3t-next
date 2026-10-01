'use client';

import { Fragment, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/pagination';
import { Contract, ContractGroup, CONTRACT_DOC_KIND_LABELS } from '@/types/purchases';
import ContractStatusBadge from './ContractStatusBadge';
import ExportExcelButton from './ExportExcelButton';
import ResultChips from './ResultChips';
import { FilterTh } from '@/components/ui/ColumnFilter';
import { toQuery } from '@/lib/compras-format';
import { ContractVigencia, formatContractMoney } from './ContractVigencia';

/**
 * I6 (go-live 2026-09-30, base real de Diana) — Contratos agrupados por
 * carpeta: una fila por carpeta (A3T-0003) con su contrato principal y, al
 * desplegar, la carta de intención, las enmiendas y los convenios, como los
 * contratos de Maximo (E2). Los filtros aplican a los documentos; la página
 * cuenta carpetas. El encabezado (FilterTh) lo pone la página, que es dueña
 * del ColumnFilterProvider.
 */

const PAGE_SIZE = 15;

const docLabel = (c: Contract) => c.document_label ?? CONTRACT_DOC_KIND_LABELS[c.doc_kind];

export default function ContractGroupsView({
  params,
  page,
  setPage,
  onOpen,
}: {
  /** Filtros de la página (búsqueda, estatus, vigencia y por columna). */
  params: Record<string, string | number | string[] | undefined | null>;
  page: number;
  setPage: (page: number) => void;
  onOpen: (contract: Contract) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...params, group: 'carpeta' });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['contracts', 'groups', listQs],
    queryFn: () => api.get<PaginatedResponse<ContractGroup>>(`/compras/contratos?${listQs}`),
    placeholderData: keepPreviousData,
  });
  const groups = data?.data ?? [];
  const meta = data?.meta;
  const exportQs = toQuery({ ...params, group: 'carpeta' });

  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="p-8 text-center text-red-600">
        No se pudieron cargar los contratos. Si aplicaste un filtro, límpialo e intenta de nuevo.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-wrap">
          <ResultChips filteredTotal={meta?.total} loading={isLoading} />
          <span className="text-xs text-gray-500">carpetas · cada una con su contrato, carta de intención, enmiendas y convenios</span>
        </div>
        <ExportExcelButton
          path={`/compras/contratos/export?${exportQs}`}
          filename={`contratos_${new Date().toISOString().slice(0, 10)}.xlsx`}
          disabled={groups.length === 0}
          title="Descarga en Excel los documentos de las carpetas filtradas, ordenados por carpeta"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#424846]">
            <tr>
              <FilterTh column="carpeta">Carpeta</FilterTh>
              <FilterTh column="tipo" title="Tipo del documento principal; al desplegar se ven todos">Documentos</FilterTh>
              <FilterTh column="servicio">Servicio</FilterTh>
              <FilterTh column="proveedor">Proveedor</FilterTh>
              <FilterTh column="area" title="El área usuaria es la responsable del contrato">Área usuaria</FilterTh>
              <FilterTh column="fin" align="center" title="Filtra y ordena por el fin de la vigencia">Vigencia</FilterTh>
              <FilterTh column="estatus" align="center">Estatus</FilterTh>
              <FilterTh column="monto" align="right">Monto</FilterTh>
              <FilterTh column="comprador">Comprador</FilterTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groups.map((group, idx) => {
              const head = group.head;
              const open = expanded.has(group.key);
              const others = group.documents.length - 1;
              return (
                <Fragment key={group.key}>
                  <tr
                    onClick={() => onOpen(head)}
                    className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-medium text-[#222D59]">
                        {group.carpeta ?? head.contract_number}
                      </span>
                      {head.tomo && <p className="text-xs text-gray-400">{head.tomo}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-700 whitespace-nowrap">{docLabel(head)}</span>
                      {others > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(group.key);
                          }}
                          aria-expanded={open}
                          title={open ? 'Ocultar los documentos de la carpeta' : 'Ver todos los documentos de la carpeta'}
                          className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium whitespace-nowrap rounded-full bg-[#222D59]/10 text-[#222D59] hover:bg-[#222D59]/20"
                        >
                          +{others} doc.
                          <span aria-hidden>{open ? '▴' : '▾'}</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-56 truncate" title={head.service_description}>
                      {head.service_description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-48 truncate" title={head.supplier?.legal_name ?? undefined}>
                      {head.supplier?.legal_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{head.user_area ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      <ContractVigencia contract={head} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ContractStatusBadge status={head.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                      {head.total_amount === null ? (
                        <span className="text-gray-500 italic text-xs">No disponible</span>
                      ) : (
                        formatContractMoney(head.total_amount, head.currency)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{head.buyer?.full_name ?? '—'}</td>
                  </tr>
                  {open && (
                    <tr className="bg-[#52AF32]/5">
                      <td colSpan={9} className="px-6 py-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs uppercase text-gray-500">
                              <th className="py-1 pr-4 text-left font-medium">Número</th>
                              <th className="py-1 pr-4 text-left font-medium">Documento</th>
                              <th className="py-1 pr-4 text-left font-medium">Servicio</th>
                              <th className="py-1 pr-4 text-left font-medium">Vigencia</th>
                              <th className="py-1 pr-4 text-left font-medium">Estatus</th>
                              <th className="py-1 text-right font-medium">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.documents.map((doc) => (
                              <tr key={doc.id} className="border-t border-gray-200/70">
                                <td className="py-1.5 pr-4">
                                  <button
                                    type="button"
                                    onClick={() => onOpen(doc)}
                                    className="font-mono font-medium text-[#222D59] hover:text-[#52AF32] hover:underline"
                                  >
                                    {doc.contract_number}
                                  </button>
                                </td>
                                <td className="py-1.5 pr-4 text-gray-700 whitespace-nowrap">{docLabel(doc)}</td>
                                <td className="py-1.5 pr-4 text-gray-700 max-w-64 truncate" title={doc.service_description}>
                                  {doc.service_description}
                                </td>
                                <td className="py-1.5 pr-4 text-gray-600">
                                  <ContractVigencia contract={doc} compact />
                                </td>
                                <td className="py-1.5 pr-4">
                                  <ContractStatusBadge status={doc.status} />
                                </td>
                                <td className="py-1.5 text-right text-gray-900 whitespace-nowrap">
                                  {doc.total_amount === null ? (
                                    <span className="text-gray-500 italic text-xs">No disponible</span>
                                  ) : (
                                    formatContractMoney(doc.total_amount, doc.currency)
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No hay contratos que coincidan con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Mostrando {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} carpetas
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(page - 1)} disabled={!meta.hasPrev} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
            <span className="text-sm text-gray-700">Página {meta.page} de {meta.totalPages}</span>
            <button onClick={() => setPage(page + 1)} disabled={!meta.hasNext} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
          </div>
        </div>
      )}
    </>
  );
}
