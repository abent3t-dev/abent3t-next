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
  spent_amount: number;
  departments: { name: string } | null;
  periods: { year: number; name: string } | null;
}

export default function PresupuestosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'colaborador') {
      router.replace('/capacitacion/mis-cursos');
      return;
    }

    async function loadBudgets() {
      try {
        const data = await api.get<Budget[]>('/budgets');
        setBudgets(data);
      } catch (error) {
        notify.error('Error al cargar presupuestos');
      } finally {
        setLoading(false);
      }
    }
    loadBudgets();
  }, [user, router]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Cargando presupuestos...</div>
      </div>
    );
  }

  const totalAssigned = budgets.reduce((acc, b) => acc + b.assigned_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);
  const totalRemaining = totalAssigned - totalSpent;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos de Capacitación</h1>
          <p className="text-gray-500">Control de presupuesto por área y periodo</p>
        </div>
        {user?.role === 'super_admin' && (
          <button
            onClick={() => router.push('/catalogs/budgets')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Administrar
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {budgets.map((budget) => {
              const remaining = budget.assigned_amount - budget.spent_amount;
              const usagePercent = budget.assigned_amount > 0
                ? Math.round((budget.spent_amount / budget.assigned_amount) * 100)
                : 0;

              return (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {budget.departments?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {budget.periods ? `${budget.periods.year} - ${budget.periods.name}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {formatCurrency(budget.assigned_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {formatCurrency(budget.spent_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(remaining)}
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
                </tr>
              );
            })}
            {budgets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay presupuestos configurados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
