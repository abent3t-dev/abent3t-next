'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCatalogCRUD } from '@/hooks/useCatalogCRUD';
import { CAN_MANAGE_DATA } from '@/config/permissions';
import { Department } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

interface DepartmentForm {
  name: string;
}

const initialForm: DepartmentForm = { name: '' };

export default function DepartmentsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...CAN_MANAGE_DATA);

  const crud = useCatalogCRUD<Department, DepartmentForm>({
    endpoint: '/departments',
    initialForm,
    transformForEdit: (item) => ({ name: item.name }),
  });

  return (
    <>
      <CatalogTable
        title="Departamentos"
        data={crud.data}
        columns={[{ key: 'name', label: 'Nombre' }]}
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
      {canEdit && (
        <CatalogModal
          title={crud.editing ? 'Editar Departamento' : 'Nuevo Departamento'}
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            />
          </label>
        </CatalogModal>
      )}
    </>
  );
}
