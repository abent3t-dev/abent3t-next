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
  download: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  upload: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12" />
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

  // Estado para modal de importación
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: Array<{ row: number; department: string; period: string; error: string }>;
    total: number;
  } | null>(null);

  const canManage = user?.role === 'super_admin' || user?.role === 'admin_rh';

  useEffect(() => {
    if (user?.role === 'colaborador' || user?.role === 'collaborator') {
      router.replace('/capacitacion/mis-cursos');
      return;
    }

    loadData();
  }, [user, router]);

  // Auto-close import modal on successful import (without errors)
  useEffect(() => {
    if (importResult && importResult.success > 0 && importResult.errors.length === 0) {
      // Auto-close after successful import
      setTimeout(() => {
        closeImportModal();
      }, 1500); // Wait 1.5s to let user see the success message
    }
  }, [importResult]);

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
    } catch (error: any) {
      // Mostrar mensaje específico del backend
      const errorMessage = error?.message || (editingBudget ? 'Error al actualizar presupuesto' : 'Error al crear presupuesto');
      notify.error(errorMessage);
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

  const handleDownloadTemplate = async () => {
    try {
      // Obtener token PRIMERO
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify.error('No estás autenticado');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets/export-template?include_data=false`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Error al descargar plantilla');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_presupuestos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify.success('Plantilla descargada');
    } catch (error) {
      console.error('Download error:', error);
      notify.error('Error al descargar plantilla');
    }
  };

  const openImportModal = () => {
    setShowImportModal(true);
    setSelectedFile(null);
    setImportResult(null);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setSelectedFile(null);
    setImportResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar extensión
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      notify.error('Formato de archivo inválido. Solo se permiten archivos .xlsx o .xls');
      return;
    }

    // Validar tamaño (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      notify.error('El archivo es demasiado grande. Tamaño máximo: 5MB');
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      notify.error('Selecciona un archivo');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al importar');
      }

      const result = await response.json();
      setImportResult(result);

      if (result.success > 0) {
        notify.success(`${result.success} presupuestos importados exitosamente`);
        // Recargar lista de presupuestos
        const data = await api.get<Budget[]>('/budgets');
        setBudgets(data);
      }

      if (result.errors.length > 0) {
        notify.error(`${result.errors.length} filas con errores`);
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Error al importar archivo');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52AF32]"></div>
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
            <h1 className="text-2xl font-bold text-[#424846]">Presupuestos de Capacitación</h1>
            <p className="text-gray-500">Control de presupuesto por área y periodo</p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={openImportModal}
                className="flex items-center gap-2 px-4 py-2 bg-[#222D59] text-white rounded-lg hover:bg-[#2d3a6e] transition-colors"
                title="Importar desde Excel"
              >
                <Icons.upload className="w-5 h-5" />
                Importar Presupuestos
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors"
              >
                <Icons.plus className="w-5 h-5" />
                Nuevo Presupuesto
              </button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Asignado - Azul Marino */}
          <div className="bg-white p-5 rounded-xl border-l-4 border-[#222D59] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Presupuesto Total</p>
              <div className="w-10 h-10 bg-[#222D59]/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#222D59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-[#222D59] mt-2">{formatCurrency(totalAssigned)}</p>
          </div>
          {/* Consumido - Verde A3T */}
          <div className="bg-white p-5 rounded-xl border-l-4 border-[#52AF32] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Consumido</p>
              <div className="w-10 h-10 bg-[#52AF32]/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#52AF32]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-[#52AF32] mt-2">{formatCurrency(totalSpent)}</p>
          </div>
          {/* Disponible - Dinámico según nivel */}
          {(() => {
            const availablePercent = totalAssigned > 0 ? (totalRemaining / totalAssigned) * 100 : 0;
            const borderColor = totalRemaining < 0 ? 'border-red-500' : availablePercent > 50 ? 'border-[#67B52E]' : availablePercent > 20 ? 'border-[#DFA922]' : 'border-red-500';
            const bgColor = totalRemaining < 0 ? 'bg-red-500/10' : availablePercent > 50 ? 'bg-[#67B52E]/10' : availablePercent > 20 ? 'bg-[#DFA922]/10' : 'bg-red-500/10';
            const iconColor = totalRemaining < 0 ? 'text-red-500' : availablePercent > 50 ? 'text-[#67B52E]' : availablePercent > 20 ? 'text-[#DFA922]' : 'text-red-500';
            const textColor = totalRemaining < 0 ? 'text-red-500' : availablePercent > 50 ? 'text-[#67B52E]' : availablePercent > 20 ? 'text-[#DFA922]' : 'text-red-500';

            return (
              <div className={`bg-white p-5 rounded-xl border-l-4 ${borderColor} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Disponible</p>
                  <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
                    <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className={`text-2xl font-bold mt-2 ${textColor}`}>
                  {formatCurrency(totalRemaining)}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Budgets Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#424846]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wide">
                  Área
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wide">
                  Periodo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wide">
                  Asignado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wide">
                  Consumido
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wide">
                  Disponible
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wide">
                  % Uso
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wide">
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
                      {(() => {
                        const availPercent = budget.assigned_amount > 0 ? (budget.available_amount / budget.assigned_amount) * 100 : 0;
                        const textColor = budget.available_amount < 0 ? 'text-red-600' : availPercent > 50 ? 'text-[#52AF32]' : availPercent > 20 ? 'text-[#DFA922]' : 'text-red-600';
                        return (
                          <span className={`${textColor} font-medium`}>
                            {formatCurrency(budget.available_amount)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${Math.min(usagePercent, 100)}%`,
                              backgroundColor: usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#DFA922' : '#52AF32'
                            }}
                          />
                        </div>
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#DFA922' : '#424846'
                          }}
                        >
                          {usagePercent}%
                        </span>
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(budget)}
                            className="p-2 text-[#52AF32] hover:bg-blue-50 rounded-lg transition-colors"
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
                          className="mt-3 text-[#52AF32] hover:text-[#67B52E] text-sm font-medium"
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
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#424846] rounded-t-xl">
                <h2 className="text-lg font-semibold text-white">
                  {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                </h2>
                <button onClick={closeModal} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <Icons.x className="w-5 h-5 text-white" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#424846] mb-1">
                    Departamento *
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 outline-none"
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
                  <label className="block text-sm font-medium text-[#424846] mb-1">
                    Periodo *
                  </label>
                  <select
                    value={formData.period_id}
                    onChange={(e) => setFormData({ ...formData, period_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 outline-none"
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
                  <label className="block text-sm font-medium text-[#424846] mb-1">
                    Monto Asignado *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.assigned_amount}
                    onChange={(e) => setFormData({ ...formData, assigned_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 outline-none"
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
                    className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] disabled:opacity-50 transition-colors"
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
                  <div className="w-16 h-16 bg-[#DFA922]/10 rounded-full flex items-center justify-center">
                    <Icons.warning className="w-8 h-8 text-[#DFA922]" />
                  </div>
                </div>

                {/* Título y mensaje */}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-[#424846] mb-2">
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

        {/* Modal Importar Excel */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-[#424846] rounded-t-xl">
                <h2 className="text-lg font-semibold text-white">Importar Presupuestos desde Excel</h2>
                <button onClick={closeImportModal} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <Icons.x className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Descargar Plantilla - Sección destacada */}
                <div className="bg-[#52AF32]/5 border-2 border-[#52AF32]/30 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#52AF32] rounded-xl flex items-center justify-center shadow-lg">
                      <Icons.download className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#424846] mb-1">
                        Paso 1: Descarga la Plantilla
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        La plantilla incluye dropdowns preconfigurados para departamentos y períodos.
                        Esto evita errores de escritura y facilita la importación.
                      </p>
                      <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        <Icons.download className="w-5 h-5" />
                        Descargar Plantilla Excel
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instrucciones */}
                <div className="bg-[#222D59]/5 border border-[#222D59]/20 rounded-lg p-4">
                  <h3 className="font-semibold text-[#222D59] mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Paso 2: Completa la Plantilla
                  </h3>
                  <ol className="text-sm text-[#424846] space-y-1.5 ml-7">
                    <li>1. Abre el archivo descargado en Excel</li>
                    <li>2. Completa los siguientes datos:</li>
                  </ol>

                  <div className="mt-3 ml-7 space-y-2">
                    <div className="text-sm">
                      <p className="font-medium text-[#424846] mb-1">Columnas requeridas:</p>
                      <ul className="text-gray-600 space-y-0.5 ml-4">
                        <li>- <strong>Departamento:</strong> Nombre exacto del departamento (ej: &quot;Compras&quot;, &quot;Comercial y Medicion&quot;)</li>
                        <li>- <strong>Periodo:</strong> Label del periodo (ej: &quot;2026-S1&quot;, &quot;2026-S2&quot;)</li>
                        <li>- <strong>Monto Asignado:</strong> Cantidad numerica sin simbolos (ej: 45000, 150000.50)</li>
                      </ul>
                    </div>

                    <div className="text-sm bg-[#DFA922]/10 border border-[#DFA922]/30 rounded p-2 mt-2">
                      <p className="font-medium text-[#424846] mb-1">Validaciones importantes:</p>
                      <ul className="text-gray-600 space-y-0.5 ml-4">
                        <li>- El departamento debe existir en el sistema</li>
                        <li>- El periodo debe existir en el sistema</li>
                        <li>- El monto debe ser un numero positivo</li>
                        <li>- No puede haber presupuestos duplicados (mismo departamento + periodo)</li>
                        <li>- Los nombres deben coincidir exactamente con los del sistema</li>
                      </ul>
                    </div>

                    <div className="text-sm text-[#222D59] bg-[#222D59]/5 rounded p-2 mt-2">
                      <strong>Tip:</strong> Descarga la plantilla con datos existentes para ver ejemplos
                    </div>
                  </div>
                </div>

                {/* Zona de upload */}
                <div className="border-2 border-dashed border-[#424846]/30 rounded-lg p-6 text-center hover:border-[#52AF32]/50 transition-colors">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-[#222D59]/10 rounded-full flex items-center justify-center">
                      <Icons.upload className="w-8 h-8 text-[#222D59]" />
                    </div>
                    <div>
                      <label className="cursor-pointer">
                        <span className="text-[#52AF32] hover:text-[#67B52E] font-medium">Seleccionar archivo</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-1">o arrastra y suelta aqui</p>
                    </div>
                    <p className="text-xs text-gray-400">Solo archivos .xlsx o .xls (max. 5MB)</p>
                    {selectedFile && (
                      <div className="mt-2 flex items-center gap-2 bg-[#52AF32]/10 px-4 py-2 rounded-lg">
                        <svg className="w-5 h-5 text-[#52AF32]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-[#424846] font-medium">{selectedFile.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resultado de importación */}
                {importResult && (
                  <div className="space-y-3">
                    {importResult.success > 0 && (
                      <div className="bg-[#52AF32]/10 border border-[#52AF32]/30 rounded-lg p-4">
                        <p className="text-[#424846] font-medium">
                          {importResult.success} presupuestos creados exitosamente
                        </p>
                      </div>
                    )}

                    {importResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800 font-medium mb-2">
                          {importResult.errors.length} filas con errores:
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-1.5">
                          {importResult.errors.map((error, idx) => (
                            <div key={idx} className="text-sm text-red-700 bg-red-100/50 px-3 py-2 rounded">
                              <strong>Fila {error.row}</strong> - {error.department} / {error.period}: {error.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={closeImportModal}
                    disabled={importing}
                    className="px-4 py-2 text-[#424846] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || importing}
                    className="px-4 py-2 bg-[#222D59] text-white rounded-lg hover:bg-[#2d3a6e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {importing ? 'Importando...' : 'Importar'}
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
