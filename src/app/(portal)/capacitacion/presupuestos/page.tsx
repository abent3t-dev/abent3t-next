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
  warning: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

  // Estado para modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = user?.role === 'super_admin' || user?.role === 'admin_rh';

  useEffect(() => {
    if (user?.role === 'colaborador' || user?.role === 'collaborator') {
      router.replace('/capacitacion/mis-cursos');
      return;
    }

    loadData();
  }, [user, router]);

  const loadData = async () => {
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
  };

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

  const openDeleteModal = (budget: Budget) => {
    setDeletingBudget(budget);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingBudget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBudget) return;

    setDeleting(true);
    try {
      await api.delete(`/budgets/${deletingBudget.id}`);
      notify.success('Presupuesto eliminado');
      setBudgets(budgets.filter(b => b.id !== deletingBudget.id));
      closeDeleteModal();
    } catch (error) {
      notify.error('Error al eliminar presupuesto');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const totalAssigned = budgets.reduce((acc, b) => acc + b.assigned_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.consumed_amount, 0);
  const totalRemaining = totalAssigned - totalSpent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presupuestos de Capacitación</h1>
            <p className="text-gray-500">Control de presupuesto por área y periodo</p>
          </div>
          {canManage && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Icons.plus className="w-5 h-5" />
              Nuevo Presupuesto
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Presupuesto Total</p>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(totalAssigned)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Gastado</p>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-2">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Disponible</p>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${totalRemaining < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <svg className={`w-5 h-5 ${totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className={`text-2xl font-bold mt-2 ${totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totalRemaining)}
            </p>
          </div>
        </div>

        {/* Budgets Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Área
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Periodo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Asignado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Gastado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Disponible
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                  % Uso
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
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
                  <tr key={budget.id} className="hover:bg-gray-50 transition-colors">
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
                      <span className={budget.available_amount < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {formatCurrency(budget.available_amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              usagePercent > 90
                                ? 'bg-red-500'
                                : usagePercent > 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          usagePercent > 90 ? 'text-red-600' : usagePercent > 70 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {usagePercent}%
                        </span>
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(budget)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Icons.edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(budget)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                  <td colSpan={canManage ? 7 : 6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500">No hay presupuestos configurados</p>
                      {canManage && (
                        <button
                          onClick={openCreateModal}
                          className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Crear primer presupuesto
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Crear/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                </h2>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
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
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Guardando...' : editingBudget ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Confirmar Eliminación */}
        {showDeleteModal && deletingBudget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                {/* Icono de advertencia */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Icons.warning className="w-8 h-8 text-red-600" />
                  </div>
                </div>

                {/* Título y mensaje */}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Eliminar Presupuesto
                  </h3>
                  <p className="text-gray-600">
                    ¿Estás seguro de eliminar el presupuesto de{' '}
                    <span className="font-semibold text-gray-900">
                      {deletingBudget.departments?.name || 'este departamento'}
                    </span>
                    {deletingBudget.periods?.label && (
                      <>
                        {' '}para el periodo{' '}
                        <span className="font-semibold text-gray-900">
                          {deletingBudget.periods.label}
                        </span>
                      </>
                    )}
                    ?
                  </p>
                  {deletingBudget.consumed_amount > 0 && (
                    <p className="mt-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                      Este presupuesto tiene {formatCurrency(deletingBudget.consumed_amount)} gastados
                    </p>
                  )}
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  <button
                    onClick={closeDeleteModal}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
