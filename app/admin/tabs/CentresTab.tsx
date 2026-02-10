'use client';

import { useState, useEffect } from 'react';
import { Pencil, Power } from 'lucide-react';
import Button from '@/app/components/ui/button';
import Modal from '@/app/components/ui/Modal';

interface Zone {
  id: string;
  name: string;
}

interface Center {
  id: string;
  name: string;
  zone_id: string;
  is_active: boolean;
  logo_url: string | null;
  zones: Zone;
  created_at: string;
}

export default function CentresTab() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [formData, setFormData] = useState({ name: '', zone_id: '' });
  const [saving, setSaving] = useState(false);

  // Carregar centres i zones
  useEffect(() => {
    fetchCenters();
    fetchZones();
  }, []);

  const fetchCenters = async () => {
    try {
      const res = await fetch('/api/admin/centers');
      const data = await res.json();
      if (res.ok) {
        setCenters(data.centers || []);
      }
    } catch (error) {
      console.error('Error fetching centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/admin/zones');
      const data = await res.json();
      if (res.ok) {
        // Només zones actives per al selector
        setZones((data.zones || []).filter((z: Zone & { is_active: boolean }) => z.is_active));
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleCreate = () => {
    setEditingCenter(null);
    setFormData({ name: '', zone_id: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (center: Center) => {
    setEditingCenter(center);
    setFormData({ name: center.name, zone_id: center.zone_id });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.zone_id) {
      alert('Cal omplir tots els camps obligatoris');
      return;
    }

    setSaving(true);
    try {
      const url = editingCenter
        ? `/api/admin/centers/${editingCenter.id}`
        : '/api/admin/centers';
      
      const method = editingCenter ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchCenters();
        setIsModalOpen(false);
        setFormData({ name: '', zone_id: '' });
      } else {
        alert(data.error || 'Error al guardar el centre');
      }
    } catch (error) {
      console.error('Error saving center:', error);
      alert('Error al guardar el centre');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (center: Center) => {
    try {
      const res = await fetch(`/api/admin/centers/${center.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !center.is_active }),
      });

      if (res.ok) {
        await fetchCenters();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al canviar l\'estat del centre');
      }
    } catch (error) {
      console.error('Error toggling center:', error);
      alert('Error al canviar l\'estat del centre');
    }
  };

  // Filtrar centres per cerca
  const filteredCenters = centers.filter(center =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Carregant centres...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Barra de cerca i botó crear */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cerca centres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                     focus:outline-none focus:border-[var(--color-secondary)] 
                     font-[family-name:var(--font-inter)]"
          />
        </div>
        <Button variant="primary" onClick={handleCreate}>
          + Afegir Centre
        </Button>
      </div>

      {/* Taula de centres */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-light-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Nom Centre
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Zona
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Estat
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-[var(--color-dark)]">
                Accions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filteredCenters.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[var(--color-gray)]">
                  {searchTerm ? 'No s\'han trobat centres' : 'No hi ha centres creats'}
                </td>
              </tr>
            ) : (
              filteredCenters.map((center) => (
                <tr key={center.id} className="hover:bg-[var(--color-light-bg)] transition-colors">
                  <td className="px-6 py-4 font-[family-name:var(--font-inter)]">
                    {center.name}
                  </td>
                  <td className="px-6 py-4 text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
                    {center.zones?.name || 'Sense zona'}
                  </td>
                  <td className="px-6 py-4">
                    {center.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm">
                        ✓ Actiu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm">
                        ○ Inactiu
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(center)}
                        className="p-2 hover:bg-[var(--color-light-bg)] rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(center)}
                        className={`p-2 hover:bg-[var(--color-light-bg)] rounded-lg transition-colors ${center.is_active ? 'text-green-600' : 'text-[var(--color-gray)]'}`}
                        title={center.is_active ? 'Desactivar' : 'Activar'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCenter ? 'Editar Centre' : 'Crear Centre'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Nom del Centre *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="IES Exemple"
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                       focus:outline-none focus:border-[var(--color-secondary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Zona *
            </label>
            <select
              value={formData.zone_id}
              onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                       focus:outline-none focus:border-[var(--color-secondary)]"
            >
              <option value="">Selecciona una zona</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel·lar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
            >
              {editingCenter ? 'Actualitzar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
