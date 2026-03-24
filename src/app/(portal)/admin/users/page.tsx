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

// Iconos SVG
const Icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  ban: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  user: (
    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    position: '',
    role: 'colaborador' as UserRole,
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

  const openCreateModal = () => {
    setModalMode('create');
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      position: '',
      role: 'colaborador',
      department_id: '',
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: UserProfile) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      position: user.position || '',
      role: user.role,
      department_id: user.department_id || '',
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      setError('Email, contraseña y nombre son requeridos');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Crear usuario via backend API
      await api.post('/auth/users', {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        position: formData.position || undefined,
        role: formData.role,
        department_id: formData.department_id || undefined,
      });

      // Recargar usuarios
      const updatedUsers = await api.get<UserProfile[]>('/auth/users');
      setUsers(updatedUsers);
      closeModal();
    } catch (err) {
      console.error('Error creating user:', err);
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    setSaving(true);
    setError('');

    try {
      // Update role if changed
      if (formData.role !== editingUser.role) {
        await api.put(`/auth/users/${editingUser.id}/role`, { role: formData.role });
      }
      // Update department if changed
      if (formData.department_id !== (editingUser.department_id || '')) {
        await api.put(`/auth/users/${editingUser.id}/department`, {
          department_id: formData.department_id || null,
        });
      }

      // Reload users
      const usersData = await api.get<UserProfile[]>('/auth/users');
      setUsers(usersData);
      closeModal();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
    } finally {
      setSaving(false);
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

  const handleReactivate = async (userId: string) => {
    if (!confirm('¿Reactivar este usuario?')) return;

    try {
      await api.put(`/auth/users/${userId}/reactivate`, {});
      const usersData = await api.get<UserProfile[]>('/auth/users');
      setUsers(usersData);
    } catch (error) {
      console.error('Error reactivating user:', error);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500">Administra usuarios, roles y departamentos</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {Icons.plus}
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Usuarios</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Administradores</p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter((u) => ['super_admin', 'admin_rh'].includes(u.role)).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Inactivos</p>
          <p className="text-2xl font-bold text-red-600">
            {users.filter((u) => !u.is_active).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Departamento
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {Icons.user}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.full_name || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.position && (
                        <div className="text-xs text-gray-400">{user.position}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
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
                  {user.departments?.name || (
                    <span className="text-gray-400">Sin asignar</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.is_active ? Icons.check : Icons.x}
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar usuario"
                    >
                      {Icons.edit}
                    </button>
                    {user.is_active && user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Desactivar usuario"
                      >
                        {Icons.ban}
                      </button>
                    )}
                    {!user.is_active && (
                      <button
                        onClick={() => handleReactivate(user.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Reactivar usuario"
                      >
                        {Icons.check}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                {Icons.x}
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {modalMode === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="usuario@empresa.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="Nombre y apellidos"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Puesto
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ej: Analista, Gerente, etc."
                    />
                  </div>
                </>
              )}

              {modalMode === 'edit' && editingUser && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    {Icons.user}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{editingUser.full_name}</p>
                    <p className="text-sm text-gray-500">{editingUser.email}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="super_admin" className="text-gray-900">Super Administrador</option>
                  <option value="admin_rh" className="text-gray-900">Administrador RRHH</option>
                  <option value="jefe_area" className="text-gray-900">Jefe de Área</option>
                  <option value="director" className="text-gray-900">Director</option>
                  <option value="executive" className="text-gray-900">Ejecutivo</option>
                  <option value="colaborador" className="text-gray-900">Colaborador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="" className="text-gray-900">Sin departamento</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id} className="text-gray-900">
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={modalMode === 'create' ? handleCreate : handleUpdate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
