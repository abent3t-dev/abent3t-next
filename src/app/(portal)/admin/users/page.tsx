'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ROLE_LABELS, type UserRole, type UserProfile } from '@/types/auth';

interface Department {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    role: '' as UserRole,
    department_id: '',
  });

  useEffect(() => {
    if (!authLoading && currentUser?.role !== 'super_admin') {
      router.replace('/home');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    async function loadData() {
      try {
        const [usersData, deptsData] = await Promise.all([
          api.get<UserProfile[]>('/auth/users'),
          api.get<Department[]>('/departments'),
        ]);
        setUsers(usersData);
        setDepartments(deptsData);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    }
    if (currentUser?.role === 'super_admin') {
      loadData();
    }
  }, [currentUser]);

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      role: user.role,
      department_id: user.department_id || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      // Update role
      if (formData.role !== editingUser.role) {
        await api.put(`/auth/users/${editingUser.id}/role`, { role: formData.role });
      }
      // Update department
      if (formData.department_id !== (editingUser.department_id || '')) {
        await api.put(`/auth/users/${editingUser.id}/department`, {
          department_id: formData.department_id || null,
        });
      }

      // Reload users
      const usersData = await api.get<UserProfile[]>('/auth/users');
      setUsers(usersData);
      setShowModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('¿Estás seguro de desactivar este usuario?')) return;

    try {
      await api.put(`/auth/users/${userId}/deactivate`, {});
      const usersData = await api.get<UserProfile[]>('/auth/users');
      setUsers(usersData);
    } catch (error) {
      console.error('Error deactivating user:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (currentUser?.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500">Administra usuarios, roles y departamentos</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Departamento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{user.full_name}</div>
                  {user.position && (
                    <div className="text-sm text-gray-500">{user.position}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'super_admin'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'admin_rh'
                        ? 'bg-green-100 text-green-800'
                        : ['jefe_area', 'director'].includes(user.role)
                        ? 'bg-blue-100 text-blue-800'
                        : user.role === 'executive'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.departments?.name || '-'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Editar
                  </button>
                  {user.is_active && user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeactivate(user.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Editar Usuario
            </h2>
            <p className="text-sm text-gray-500 mb-4">{editingUser.full_name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as UserRole })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="super_admin">Super Administrador</option>
                  <option value="admin_rh">Administrador RRHH</option>
                  <option value="jefe_area">Jefe de Área</option>
                  <option value="director">Director</option>
                  <option value="executive">Ejecutivo</option>
                  <option value="colaborador">Colaborador</option>
                  <option value="collaborator">Collaborator (legacy)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) =>
                    setFormData({ ...formData, department_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sin departamento</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
