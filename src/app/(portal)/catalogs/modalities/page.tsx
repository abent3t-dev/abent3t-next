'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Modality } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

export default function ModalitiesPage() {
  const [data, setData] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Modality | null>(null);
  const [form, setForm] = useState({ name: '', key: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const items = await api.get<Modality[]>('/modalities');
    setData(items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', key: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Modality) => {
    setEditing(item);
    setForm({ name: item.name, key: item.key, description: item.description || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, description: form.description || null };
    if (editing) {
      await api.put(`/modalities/${editing.id}`, { name: form.name, description: payload.description });
    } else {
      await api.post('/modalities', payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar esta modalidad?')) return;
    await api.delete(`/modalities/${id}`);
    load();
  };

  return (
    <>
      <CatalogTable
        title="Modalidades"
        data={data}
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'key', label: 'Clave' },
          { key: 'description', label: 'Descripción', render: (val) => (val as string) || '—' },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        loading={loading}
      />
      <CatalogModal
        title={editing ? 'Editar Modalidad' : 'Nueva Modalidad'}
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
        {!editing && (
          <label className="block text-sm font-medium text-gray-700">
            Clave (identificador único)
            <input
              type="text"
              required
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ej: in_person"
            />
          </label>
        )}
        <label className="block text-sm font-medium text-gray-700">
          Descripción
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </CatalogModal>
    </>
  );
}
