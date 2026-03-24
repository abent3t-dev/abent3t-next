'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface CourseType {
  id: string;
  name: string;
  is_active: boolean;
}

export default function TiposCursoPage() {
  const [items, setItems] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CourseType | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await api.get<CourseType[]>('/course-types');
      setItems(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => { setEditingItem(null); setFormData({ name: '' }); setShowModal(true); };
  const handleEdit = (item: CourseType) => { setEditingItem(item); setFormData({ name: item.name }); setShowModal(true); };
  const handleSave = async () => {
    try {
      if (editingItem) await api.put(`/course-types/${editingItem.id}`, formData);
      else await api.post('/course-types', formData);
      loadData();
      setShowModal(false);
    } catch (error) { console.error('Error:', error); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    try { await api.delete(`/course-types/${id}`); loadData(); } catch (error) { console.error('Error:', error); }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Cargando...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Tipos de Curso</h1><p className="text-gray-500">Clasificación de cursos</p></div>
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Nuevo Tipo</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.is_active ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{editingItem ? 'Editar' : 'Nuevo'} Tipo de Curso</h2>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ name: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
