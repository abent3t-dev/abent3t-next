'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Institution } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

const typeLabels: Record<string, string> = {
  external: 'Externa',
  platform: 'Plataforma',
  internal: 'Interna',
};

export default function InstitutionsPage() {
  const [data, setData] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'external' as string,
    is_platform: false,
    annual_cost: 0,
    platform_url: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const items = await api.get<Institution[]>('/institutions');
    setData(items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', type: 'external', is_platform: false, annual_cost: 0, platform_url: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Institution) => {
    setEditing(item);
    setForm({
      name: item.name,
      type: item.type,
      is_platform: item.is_platform,
      annual_cost: item.annual_cost,
      platform_url: item.platform_url || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      platform_url: form.platform_url || null,
    };
    if (editing) {
      await api.put(`/institutions/${editing.id}`, payload);
    } else {
      await api.post('/institutions', payload);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar esta institución?')) return;
    await api.delete(`/institutions/${id}`);
    load();
  };

  return (
    <>
      <CatalogTable
        title="Instituciones"
        data={data}
        columns={[
          { key: 'name', label: 'Nombre' },
          {
            key: 'type',
            label: 'Tipo',
            render: (val) => typeLabels[val as string] || val,
          },
          {
            key: 'is_platform',
            label: 'Plataforma',
            render: (val) => (val ? 'Sí' : 'No'),
          },
          {
            key: 'annual_cost',
            label: 'Costo Anual',
            render: (val) =>
              `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        loading={loading}
      />
      <CatalogModal
        title={editing ? 'Editar Institución' : 'Nueva Institución'}
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
        <label className="block text-sm font-medium text-gray-700">
          Tipo
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="external">Externa</option>
            <option value="platform">Plataforma</option>
            <option value="internal">Interna</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_platform}
            onChange={(e) => setForm({ ...form, is_platform: e.target.checked })}
            className="rounded"
          />
          Es plataforma con suscripción
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Costo anual (MXN)
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.annual_cost}
            onChange={(e) => setForm({ ...form, annual_cost: parseFloat(e.target.value) || 0 })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          URL de la plataforma
          <input
            type="url"
            value={form.platform_url}
            onChange={(e) => setForm({ ...form, platform_url: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </label>
      </CatalogModal>
    </>
  );
}
