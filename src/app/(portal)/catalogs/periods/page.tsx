'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCatalogCRUD } from '@/hooks/useCatalogCRUD';
import { CAN_MANAGE_DATA } from '@/config/permissions';
import { Period } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

interface PeriodForm {
  year: number;
  semester: number;
  label: string;
  start_date: string;
  end_date: string;
}

const initialForm: PeriodForm = {
  year: new Date().getFullYear(),
  semester: 1,
  label: '',
  start_date: '',
  end_date: '',
};

export default function PeriodsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...CAN_MANAGE_DATA);

  const crud = useCatalogCRUD<Period, PeriodForm>({
    endpoint: '/periods',
    initialForm,
    transformForEdit: (item) => ({
      year: item.year,
      semester: item.semester || 1,
      label: item.label,
      start_date: item.start_date,
      end_date: item.end_date,
    }),
    transformForUpdate: (form) => ({
      label: form.label,
      start_date: form.start_date,
      end_date: form.end_date,
    }),
  });

  return (
    <>
      <CatalogTable
        title="Periodos"
        data={crud.data}
        columns={[
          { key: 'label', label: 'Etiqueta' },
          { key: 'year', label: 'Año' },
          { key: 'semester', label: 'Semestre', render: (val) => (val ? `S${val}` : 'Anual') },
          { key: 'start_date', label: 'Inicio' },
          { key: 'end_date', label: 'Fin' },
        ]}
        onAdd={canEdit ? crud.openCreate : undefined}
        onEdit={canEdit ? crud.openEdit : undefined}
        onDelete={canEdit ? crud.handleDelete : undefined}
        loading={crud.loading}
        meta={crud.meta}
        onPageChange={crud.goToPage}
        onLimitChange={crud.changeLimit}
        searchValue={crud.search}
        onSearch={crud.setSearch}
      />
      {canEdit && <CatalogModal
        title={crud.editing ? 'Editar Periodo' : 'Nuevo Periodo'}
        open={crud.modalOpen}
        onClose={crud.closeModal}
        onSubmit={crud.handleSubmit}
        loading={crud.saving}
      >
        {!crud.editing && (
          <>
            <label className="block text-sm font-medium text-gray-700">
              Año
              <input
                type="number"
                required
                value={crud.form.year}
                onChange={(e) => crud.updateField('year', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Semestre
              <select
                value={crud.form.semester}
                onChange={(e) => crud.updateField('semester', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              >
                <option value={1}>Semestre 1</option>
                <option value={2}>Semestre 2</option>
              </select>
            </label>
          </>
        )}
        <label className="block text-sm font-medium text-gray-700">
          Etiqueta
          <input
            type="text"
            required
            value={crud.form.label}
            onChange={(e) => crud.updateField('label', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            placeholder="ej: 2026-S1"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fecha inicio
          <input
            type="date"
            required
            value={crud.form.start_date}
            onChange={(e) => crud.updateField('start_date', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fecha fin
          <input
            type="date"
            required
            value={crud.form.end_date}
            onChange={(e) => crud.updateField('end_date', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          />
        </label>
      </CatalogModal>}
    </>
  );
}
