'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Department } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

export default function DepartmentsPage() {
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const items = await api.get<Department[]>('/departments');
    setData(items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Department) => {
    setEditing(item);
    setForm({ name: item.name });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await api.put(`/departments/${editing.id}`, form);
    } else {
      await api.post('/departments', form);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este departamento?')) return;
    await api.delete(`/departments/${id}`);
    load();
  };

  return (
    <>
      <CatalogTable
        title="Departamentos"
        data={data}
        columns={[{ key: 'name', label: 'Nombre' }]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        loading={loading}
      />
      <CatalogModal
        title={editing ? 'Editar Departamento' : 'Nuevo Departamento'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <label className="block text-sm font-medium text-gray-700">
          Nombre
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </CatalogModal>
    </>
  );
}
