'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Budget, Department, Period } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

const formatCurrency = (value: number) =>
  `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const getAvailableColor = (assigned: number, available: number) => {
  if (assigned === 0) return 'bg-gray-100 text-gray-800';
  const percentage = (available / assigned) * 100;
  if (percentage > 50) return 'bg-green-100 text-green-800';
  if (percentage > 20) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

export default function BudgetsPage() {
  const [data, setData] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  const [form, setForm] = useState({
    department_id: '',
    period_id: '',
    assigned_amount: 0,
    consumed_amount: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching budgets...');
      const items = await api.get<Budget[]>('/budgets');
      console.log('Budgets loaded:', items);
      setData(items);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error loading budgets:', errorMsg);
      setError(errorMsg);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    Promise.all([
      api.get<Department[]>('/departments'),
      api.get<Period[]>('/periods'),
    ])
      .then(([depts, pers]) => {
        setDepartments(depts.filter((d) => d.is_active));
        setPeriods(pers.filter((p) => p.is_active));
      })
      .catch((err) => {
        console.error('Error loading departments/periods:', err);
      });
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      department_id: '',
      period_id: '',
      assigned_amount: 0,
      consumed_amount: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (item: Budget) => {
    setEditing(item);
    setForm({
      department_id: item.department_id,
      period_id: item.period_id,
      assigned_amount: item.assigned_amount,
      consumed_amount: item.consumed_amount,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/budgets/${editing.id}`, {
          assigned_amount: form.assigned_amount,
          consumed_amount: form.consumed_amount,
        });
      } else {
        await api.post('/budgets', {
          department_id: form.department_id,
          period_id: form.period_id,
          assigned_amount: form.assigned_amount,
        });
      }
      setModalOpen(false);
      load();
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Error al guardar el presupuesto');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este presupuesto?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      load();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Presupuestos por Área</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <p className="font-medium">Error al cargar los datos:</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={load}
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
        data={data}
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
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <CatalogModal
        title={editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="space-y-4">
          {!editing && (
            <>
              <label className="block text-sm font-medium text-gray-700">
                Área
                <select
                  required
                  value={form.department_id}
                  onChange={(e) =>
                    setForm({ ...form, department_id: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccionar área —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Periodo
                <select
                  required
                  value={form.period_id}
                  onChange={(e) =>
                    setForm({ ...form, period_id: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccionar periodo —</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {editing && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p>
                <strong>Área:</strong> {editing.departments?.name}
              </p>
              <p>
                <strong>Periodo:</strong> {editing.periods?.label}
              </p>
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700">
            Monto Asignado
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.assigned_amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  assigned_amount: parseFloat(e.target.value) || 0,
                })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {editing && (
            <label className="block text-sm font-medium text-gray-700">
              Monto Consumido
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.consumed_amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    consumed_amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          )}

          {(form.assigned_amount > 0 || editing) && (
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <p>
                <strong>Disponible:</strong>{' '}
                {formatCurrency(form.assigned_amount - form.consumed_amount)}
              </p>
            </div>
          )}
        </div>
      </CatalogModal>
    </>
  );
}
