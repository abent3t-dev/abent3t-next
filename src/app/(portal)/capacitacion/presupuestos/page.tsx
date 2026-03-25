'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';

interface Budget {
  id: string;
  department_id: string;
  period_id: string;
  assigned_amount: number;
  consumed_amount: number;
  available_amount: number;
  departments: { name: string } | null;
  periods: { year: number; label: string; semester: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Period {
  id: string;
  year: number;
  label: string;
  semester: string;
  is_active: boolean;
}

const Icons = {
  plus: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  edit: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  trash: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  x: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function PresupuestosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    department_id: '',
    period_id: '',
    assigned_amount: 0,
  });
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'super_admin' || user?.role === 'admin_rh';

  useEffect(() => {
    if (user?.role === 'colaborador' || user?.role === 'collaborator') {
      router.replace('/capacitacion/mis-cursos');
      return;
    }

    async function loadData() {
      try {
        const [budgetsData, departmentsData, periodsData] = await Promise.all([
          api.get<Budget[]>('/budgets'),
          api.get<Department[]>('/departments'),
          api.get<Period[]>('/periods'),
        ]);
        setBudgets(budgetsData);
        setDepartments(departmentsData);
        setPeriods(periodsData);
      } catch (error) {
        notify.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, router]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  const openCreateModal = () => {
    setEditingBudget(null);
    setFormData({
      department_id: '',
      period_id: '',
      assigned_amount: 0,
    });
    setShowModal(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      department_id: budget.department_id,
      period_id: budget.period_id,
      assigned_amount: budget.assigned_amount,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBudget(null);
    setFormData({
      department_id: '',
      period_id: '',
      assigned_amount: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department_id || !formData.period_id) {
      notify.error('Selecciona departamento y periodo');
      return;
    }

    setSaving(true);
    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, formData);
        notify.success('Presupuesto actualizado');
      } else {
        await api.post('/budgets', formData);
        notify.success('Presupuesto creado');
      }

      // Recargar lista
      const data = await api.get<Budget[]>('/budgets');
      setBudgets(data);
      closeModal();
    } catch (error) {
      notify.error(editingBudget ? 'Error al actualizar' : 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budget: Budget) => {
    const deptName = budget.departments?.name || 'este departamento';
    if (!confirm(`¿Eliminar presupuesto de ${deptName}?`)) return;

    try {
      await api.delete(`/budgets/${budget.id}`);
      notify.success('Presupuesto eliminado');
      setBudgets(budgets.filter(b => b.id !== budget.id));
    } catch (error) {
      notify.error('Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Cargando presupuestos...</div>
      </div>
    );
  }

  const totalAssigned = budgets.reduce((acc, b) => acc + b.assigned_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.consumed_amount, 0);
  const totalRemaining = totalAssigned - totalSpent;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos de Capacitación</h1>
          <p className="text-gray-500">Control de presupuesto por área y periodo</p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Icons.plus className="w-5 h-5" />
            Nuevo Presupuesto
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Presupuesto Total</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAssigned)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Gastado</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Disponible</p>
          <p className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      {/* Budgets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Área
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Periodo
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Asignado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Gastado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Disponible
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                % Uso
              </th>
              {canManage && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {budgets.map((budget) => {
              const usagePercent = budget.assigned_amount > 0
                ? Math.round((budget.consumed_amount / budget.assigned_amount) * 100)
                : 0;

              return (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {budget.departments?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {budget.periods ? budget.periods.label : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {formatCurrency(budget.assigned_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {formatCurrency(budget.consumed_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={budget.available_amount < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(budget.available_amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            usagePercent > 90
                              ? 'bg-red-500'
                              : usagePercent > 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{usagePercent}%</span>
                    </div>
                  </td>
                  {canManage && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(budget)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Icons.edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(budget)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Icons.trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {budgets.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                  No hay presupuestos configurados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <Icons.x className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento *
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                >
                  <option value="">Seleccionar departamento</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periodo *
                </label>
                <select
                  value={formData.period_id}
                  onChange={(e) => setFormData({ ...formData, period_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                >
                  <option value="">Seleccionar periodo</option>
                  {periods
                    .filter((p) => p.is_active)
                    .map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Asignado *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.assigned_amount}
                  onChange={(e) => setFormData({ ...formData, assigned_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingBudget ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
