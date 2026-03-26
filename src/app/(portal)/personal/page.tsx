'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { queryKeys } from '@/lib/queryKeys';

interface Department {
  id: string;
  name: string;
}

interface Personnel {
  id: string;
  email: string;
  full_name: string;
  position: string | null;
  role: string;
  department_id: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  departments: { id: string; name: string } | null;
}

interface PersonnelStats {
  total: number;
  active: number;
  inactive: number;
  by_department: Record<string, number>;
}

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
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  filter: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
};

export default function PersonalPage() {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    position: '',
    department_id: '',
  });

  // Build query params
  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (departmentFilter) queryParams.set('department_id', departmentFilter);
  if (statusFilter !== 'all') queryParams.set('is_active', statusFilter === 'active' ? 'true' : 'false');

  const personnelQuery = useQuery({
    queryKey: ['personnel', search, departmentFilter, statusFilter],
    queryFn: () => api.get<Personnel[]>(`/personnel?${queryParams.toString()}`),
  });

  const statsQuery = useQuery({
    queryKey: ['personnel', 'stats'],
    queryFn: () => api.get<PersonnelStats>('/personnel/stats'),
  });

  const deptsQuery = useQuery({
    queryKey: queryKeys.departments.all,
    queryFn: () => api.get<Department[]>('/departments'),
  });

  const personnel = personnelQuery.data ?? [];
  const stats = statsQuery.data;
  const departments = deptsQuery.data ?? [];
  const loading = personnelQuery.isLoading;

  const openCreateModal = () => {
    setModalMode('create');
    setEditingPerson(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      position: '',
      department_id: '',
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (person: Personnel) => {
    setModalMode('edit');
    setEditingPerson(person);
    setFormData({
      email: person.email,
      password: '',
      full_name: person.full_name,
      position: person.position || '',
      department_id: person.department_id || '',
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPerson(null);
    setError('');
  };

  const invalidatePersonnel = () => {
    qc.invalidateQueries({ queryKey: ['personnel'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post('/personnel', {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        position: data.position || undefined,
        department_id: data.department_id || undefined,
      }),
    onSuccess: () => {
      invalidatePersonnel();
      closeModal();
      notify.success('Colaborador creado correctamente');
    },
    onError: (err: Error) => {
      const message = err.message || 'Error al crear colaborador';
      setError(message);
      notify.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Partial<typeof formData> }) =>
      api.put(`/personnel/${data.id}`, data.payload),
    onSuccess: () => {
      invalidatePersonnel();
      closeModal();
      notify.success('Colaborador actualizado correctamente');
    },
    onError: (err: Error) => {
      const message = err.message || 'Error al actualizar colaborador';
      setError(message);
      notify.error(message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (params: { id: string; action: 'deactivate' | 'reactivate' }) =>
      api.put(`/personnel/${params.id}/${params.action}`, {}),
    onSuccess: (_, vars) => {
      invalidatePersonnel();
      notify.success(vars.action === 'deactivate' ? 'Colaborador dado de baja' : 'Colaborador reactivado');
    },
    onError: (_, vars) => {
      notify.error(vars.action === 'deactivate' ? 'Error al dar de baja' : 'Error al reactivar');
    },
  });

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      setError('Email, contraseña y nombre son requeridos');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setError('');
    createMutation.mutate(formData);
  };

  const handleUpdate = async () => {
    if (!editingPerson) return;
    setError('');
    updateMutation.mutate({
      id: editingPerson.id,
      payload: {
        full_name: formData.full_name,
        position: formData.position || undefined,
        department_id: formData.department_id || undefined,
      },
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending || statusMutation.isPending;

  const handleDeactivate = async (id: string) => {
    const confirmed = await notify.confirm('¿Estás seguro de dar de baja a este colaborador? Su historial de capacitación se conservará.');
    if (!confirmed) return;
    statusMutation.mutate({ id, action: 'deactivate' });
  };

  const handleReactivate = async (id: string) => {
    const confirmed = await notify.confirm('¿Reactivar este colaborador?');
    if (!confirmed) return;
    statusMutation.mutate({ id, action: 'reactivate' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
          <p className="text-gray-500">Administra los colaboradores de la organización</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {Icons.plus}
          <span>Nuevo Colaborador</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Bajas</p>
          <p className="text-2xl font-bold text-red-600">{stats?.inactive || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Áreas</p>
          <p className="text-2xl font-bold text-blue-600">{Object.keys(stats?.by_department || {}).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {Icons.search}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o puesto..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="">Todas las áreas</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Bajas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Colaborador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Puesto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Área
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
              {personnel.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        {Icons.user}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {person.full_name || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-gray-500">{person.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {person.position || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {person.departments?.name || <span className="text-gray-400">Sin asignar</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                        person.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {person.is_active ? Icons.check : Icons.x}
                      {person.is_active ? 'Activo' : 'Baja'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(person)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar colaborador"
                      >
                        {Icons.edit}
                      </button>
                      {person.is_active && (
                        <button
                          onClick={() => handleDeactivate(person.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Dar de baja"
                        >
                          {Icons.ban}
                        </button>
                      )}
                      {!person.is_active && (
                        <button
                          onClick={() => handleReactivate(person.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Reactivar"
                        >
                          {Icons.check}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {personnel.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay colaboradores que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === 'create' ? 'Nuevo Colaborador' : 'Editar Colaborador'}
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
                      Correo Corporativo *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="colaborador@empresa.com"
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
                </>
              )}

              {modalMode === 'edit' && editingPerson && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    {Icons.user}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{editingPerson.full_name}</p>
                    <p className="text-sm text-gray-500">{editingPerson.email}</p>
                  </div>
                </div>
              )}

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
                  placeholder="Ej: Analista, Coordinador, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Sin asignar</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
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
                {modalMode === 'create' ? 'Crear Colaborador' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
