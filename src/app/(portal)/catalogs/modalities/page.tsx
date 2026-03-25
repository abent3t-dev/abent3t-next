'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCatalogCRUD } from '@/hooks/useCatalogCRUD';
import { CAN_MANAGE_DATA } from '@/config/permissions';
import { Modality } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

interface ModalityForm {
  name: string;
  key: string;
  description: string;
}

const initialForm: ModalityForm = { name: '', key: '', description: '' };

function toKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export default function ModalitiesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...CAN_MANAGE_DATA);

  const crud = useCatalogCRUD<Modality, ModalityForm>({
    endpoint: '/modalities',
    initialForm,
    transformForEdit: (item) => ({
      name: item.name,
      key: item.key,
      description: item.description || '',
    }),
    transformForCreate: (form) => ({ ...form, description: form.description || null }),
    transformForUpdate: (form) => ({ name: form.name, description: form.description || null }),
  });

  return (
    <>
      <CatalogTable
        title="Modalidades"
        data={crud.data}
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'key', label: 'Clave' },
          { key: 'description', label: 'Descripción', render: (val) => (val as string) || '—' },
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
        title={crud.editing ? 'Editar Modalidad' : 'Nueva Modalidad'}
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
            onChange={(e) => {
              const name = e.target.value;
              crud.updateField('name', name);
              if (!crud.editing) crud.updateField('key', toKey(name));
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        {!crud.editing && (
          <label className="block text-sm font-medium text-gray-700">
            Clave (identificador único)
            <input
              type="text"
              required
              value={crud.form.key}
              onChange={(e) => crud.updateField('key', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ej: presencial"
            />
          </label>
        )}
        <label className="block text-sm font-medium text-gray-700">
          Descripción
          <textarea
            value={crud.form.description}
            onChange={(e) => crud.updateField('description', e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </CatalogModal>}
    </>
  );
}
