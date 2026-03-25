'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalogCRUD } from '@/hooks/useCatalogCRUD';
import { CAN_MANAGE_DATA } from '@/config/permissions';
import { Budget, Department, Period } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

interface BudgetForm {
  department_id: string;
  period_id: string;
  assigned_amount: number;
  consumed_amount: number;
}

const formatCurrency = (value: number) =>
  `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const getAvailableColor = (assigned: number, available: number) => {
  if (assigned === 0) return 'bg-gray-100 text-gray-800';
  const percentage = (available / assigned) * 100;
  if (percentage > 50) return 'bg-green-100 text-green-800';
  if (percentage > 20) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const initialForm: BudgetForm = {
  department_id: '',
  period_id: '',
  assigned_amount: 0,
  consumed_amount: 0,
};

export default function BudgetsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...CAN_MANAGE_DATA);

  const crud = useCatalogCRUD<Budget, BudgetForm>({
    endpoint: '/budgets',
    initialForm,
    transformForEdit: (item) => ({
      department_id: item.department_id,
      period_id: item.period_id,
      assigned_amount: item.assigned_amount,
      consumed_amount: item.consumed_amount,
    }),
    transformForCreate: (form) => ({
      department_id: form.department_id,
      period_id: form.period_id,
      assigned_amount: form.assigned_amount,
    }),
    transformForUpdate: (form) => ({
      assigned_amount: form.assigned_amount,
      consumed_amount: form.consumed_amount,
    }),
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<Department[]>('/departments'),
      api.get<Period[]>('/periods'),
    ])
      .then(([depts, pers]) => {
        setDepartments(depts.filter((d) => d.is_active));
        setPeriods(pers.filter((p) => p.is_active));
      })
      .catch(() => notify.error('Error al cargar departamentos/periodos'));
  }, []);

  if (crud.error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Presupuestos por Área</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <p className="font-medium">Error al cargar los datos:</p>
          <p className="text-sm mt-1">{crud.error}</p>
          <button
            onClick={crud.reload}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <CatalogTable
        title="Presupuestos por Área"
        data={crud.data}
        columns={[
          {
            key: 'departments',
            label: 'Área',
            render: (val) => {
              const dept = val as Budget['departments'];
              return dept?.name || '—';
            },
          },
          {
            key: 'periods',
            label: 'Periodo',
            render: (val) => {
              const period = val as Budget['periods'];
              return period?.label || '—';
            },
          },
          {
            key: 'assigned_amount',
            label: 'Asignado',
            render: (val) => formatCurrency(val as number),
          },
          {
            key: 'consumed_amount',
            label: 'Consumido',
            render: (val) => formatCurrency(val as number),
          },
          {
            key: 'available_amount',
            label: 'Disponible',
            render: (val, row) => {
              const budget = row as Budget;
              return (
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getAvailableColor(budget.assigned_amount, budget.available_amount)}`}
                >
                  {formatCurrency(val as number)}
                </span>
              );
            },
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
        title={crud.editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
        open={crud.modalOpen}
        onClose={crud.closeModal}
        onSubmit={crud.handleSubmit}
        loading={crud.saving}
      >
        <div className="space-y-4">
          {!crud.editing && (
            <>
              <label className="block text-sm font-medium text-gray-700">
                Área
                <select
                  required
                  value={crud.form.department_id}
                  onChange={(e) => crud.updateField('department_id', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccionar área —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Periodo
                <select
                  required
                  value={crud.form.period_id}
                  onChange={(e) => crud.updateField('period_id', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccionar periodo —</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {crud.editing && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p><strong>Área:</strong> {crud.editing.departments?.name}</p>
              <p><strong>Periodo:</strong> {crud.editing.periods?.label}</p>
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700">
            Monto Asignado
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={crud.form.assigned_amount}
              onChange={(e) => crud.updateField('assigned_amount', parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {crud.editing && (
            <label className="block text-sm font-medium text-gray-700">
              Monto Consumido
              <input
                type="number"
                min="0"
                step="0.01"
                value={crud.form.consumed_amount}
                onChange={(e) => crud.updateField('consumed_amount', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          )}

          {(crud.form.assigned_amount > 0 || crud.editing) && (
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <p>
                <strong>Disponible:</strong>{' '}
                {formatCurrency(crud.form.assigned_amount - crud.form.consumed_amount)}
              </p>
            </div>
          )}
        </div>
      </CatalogModal>}
    </>
  );
}
