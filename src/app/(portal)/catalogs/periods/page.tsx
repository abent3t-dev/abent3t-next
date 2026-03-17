'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Period } from '@/types/catalogs';
import CatalogTable from '@/components/catalogs/CatalogTable';
import CatalogModal from '@/components/catalogs/CatalogModal';

export default function PeriodsPage() {
  const [data, setData] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    semester: 1,
    label: '',
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const items = await api.get<Period[]>('/periods');
    setData(items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      year: new Date().getFullYear(),
      semester: 1,
      label: '',
      start_date: '',
      end_date: '',
    });
    setModalOpen(true);
  };

  const openEdit = (item: Period) => {
    setEditing(item);
    setForm({
      year: item.year,
      semester: item.semester || 1,
      label: item.label,
      start_date: item.start_date,
      end_date: item.end_date,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await api.put(`/periods/${editing.id}`, {
        label: form.label,
        start_date: form.start_date,
        end_date: form.end_date,
      });
    } else {
      await api.post('/periods', form);
    }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este periodo?')) return;
    await api.delete(`/periods/${id}`);
    load();
  };

  return (
    <>
      <CatalogTable
        title="Periodos"
        data={data}
        columns={[
          { key: 'label', label: 'Etiqueta' },
          { key: 'year', label: 'Año' },
          {
            key: 'semester',
            label: 'Semestre',
            render: (val) => (val ? `S${val}` : 'Anual'),
          },
          { key: 'start_date', label: 'Inicio' },
          { key: 'end_date', label: 'Fin' },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        loading={loading}
      />
      <CatalogModal
        title={editing ? 'Editar Periodo' : 'Nuevo Periodo'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={saving}
      >
        {!editing && (
          <>
            <label className="block text-sm font-medium text-gray-700">
              Año
              <input
                type="number"
                required
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Semestre
              <select
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Semestre 1</option>
                <option value={2}>Semestre 2</option>
              </select>
            </label>
          </>
        )}
        <label className="block text-sm font-medium text-gray-700">
          Etiqueta
          <input
            type="text"
            required
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ej: 2026-S1"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fecha inicio
          <input
            type="date"
            required
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fecha fin
          <input
            type="date"
            required
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </CatalogModal>
    </>
  );
}
