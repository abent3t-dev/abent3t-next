'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCatalogCRUD } from '@/hooks/useCatalogCRUD';
import { CAN_MANAGE_DATA } from '@/config/permissions';
import { Institution } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

interface InstitutionForm {
  name: string;
  type: string;
  is_platform: boolean;
  annual_cost: number;
  platform_url: string;
}

const typeLabels: Record<string, string> = {
  external: 'Externa',
  platform: 'Plataforma',
  internal: 'Interna',
};

const initialForm: InstitutionForm = {
  name: '',
  type: 'external',
  is_platform: false,
  annual_cost: 0,
  platform_url: '',
};

export default function InstitutionsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...CAN_MANAGE_DATA);

  const crud = useCatalogCRUD<Institution, InstitutionForm>({
    endpoint: '/institutions',
    initialForm,
    transformForEdit: (item) => ({
      name: item.name,
      type: item.type,
      is_platform: item.is_platform,
      annual_cost: item.annual_cost,
      platform_url: item.platform_url || '',
    }),
    transformForCreate: (form) => ({ ...form, platform_url: form.platform_url || null }),
    transformForUpdate: (form) => ({ ...form, platform_url: form.platform_url || null }),
  });

  return (
    <>
      <CatalogTable
        title="Instituciones"
        data={crud.data}
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'type', label: 'Tipo', render: (val) => typeLabels[val as string] || val },
          { key: 'is_platform', label: 'Plataforma', render: (val) => (val ? 'Sí' : 'No') },
          {
            key: 'annual_cost',
            label: 'Costo Anual',
            render: (val) => `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          },
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
        title={crud.editing ? 'Editar Institución' : 'Nueva Institución'}
        open={crud.modalOpen}
        onClose={crud.closeModal}
        onSubmit={crud.handleSubmit}
        loading={crud.saving}
      >
        <label className="block text-sm font-medium text-gray-700">
          Nombre
          <input
            type="text"
            required
            value={crud.form.name}
            onChange={(e) => crud.updateField('name', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Tipo
          <select
            value={crud.form.type}
            onChange={(e) => crud.updateField('type', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="external">Externa</option>
            <option value="platform">Plataforma</option>
            <option value="internal">Interna</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={crud.form.is_platform}
            onChange={(e) => crud.updateField('is_platform', e.target.checked)}
            className="rounded"
          />
          Es plataforma con suscripción
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Costo anual (MXN)
          <input
            type="number"
            step="0.01"
            min="0"
            value={crud.form.annual_cost}
            onChange={(e) => crud.updateField('annual_cost', parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          URL de la plataforma
          <input
            type="url"
            value={crud.form.platform_url}
            onChange={(e) => crud.updateField('platform_url', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </label>
      </CatalogModal>}
    </>
  );
}
