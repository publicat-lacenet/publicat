'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Pencil, Power, Trash2 } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/button';

interface Zone {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function ZonesTab() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState({ name: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/admin/zones');
      const data = await res.json();
      if (res.ok) {
        setZones(data.zones);
      } else {
        console.error('Error fetching zones:', data.error);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({ name: zone.name, is_active: zone.is_active });
    } else {
      setEditingZone(null);
      setFormData({ name: '', is_active: true });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingZone(null);
    setFormData({ name: '', is_active: true });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingZone
        ? `/api/admin/zones/${editingZone.id}`
        : '/api/admin/zones';
      
      const method = editingZone ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchZones();
        handleCloseModal();
      } else {
        setError(data.error || 'Error al desar la zona');
      }
    } catch (error) {
      setError('Error de connexió');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (zone: Zone) => {
    try {
      const res = await fetch(`/api/admin/zones/${zone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !zone.is_active }),
      });

      if (res.ok) {
        await fetchZones();
      }
    } catch (error) {
      console.error('Error toggling zone:', error);
    }
  };

  const handleDelete = async (zone: Zone) => {
    if (!confirm(`Segur que vols eliminar la zona "${zone.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/zones/${zone.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        await fetchZones();
      } else {
        alert(data.error || 'Error al eliminar la zona');
      }
    } catch (error) {
      alert('Error de connexió');
    }
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-gray)]">Carregant zones...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar + Add button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca zones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-[var(--color-border)] rounded-lg 
                         focus:outline-none focus:border-[var(--color-secondary)]
                         font-[family-name:var(--font-inter)] text-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-gray)]">
              <Search className="w-4 h-4" />
            </div>
          </div>
        </div>

        <Button onClick={() => handleOpenModal()}>
          + Afegir Zona
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-light-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold font-[family-name:var(--font-montserrat)] text-[var(--color-dark)]">
                Nom Zona
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold font-[family-name:var(--font-montserrat)] text-[var(--color-dark)]">
                Estat
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold font-[family-name:var(--font-montserrat)] text-[var(--color-dark)]">
                Accions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredZones.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-[var(--color-gray)]">
                  No s'han trobat zones
                </td>
              </tr>
            ) : (
              filteredZones.map((zone) => (
                <tr
                  key={zone.id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-light-bg)] transition-colors"
                >
                  <td className="px-6 py-4 font-[family-name:var(--font-inter)] text-sm text-[var(--color-dark)]">
                    {zone.name}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`
                        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                        ${zone.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }
                      `}
                    >
                      {zone.is_active ? <><CheckCircle className="w-3.5 h-3.5" /> Activa</> : <><XCircle className="w-3.5 h-3.5" /> Inactiva</>}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(zone)}
                        className="p-2 hover:bg-[var(--color-light-bg)] rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(zone)}
                        className={`p-2 hover:bg-[var(--color-light-bg)] rounded-lg transition-colors ${zone.is_active ? 'text-green-600' : 'text-[var(--color-gray)]'}`}
                        title={zone.is_active ? 'Desactivar' : 'Activar'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(zone)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingZone ? 'Editar zona' : 'Afegir nova zona'}
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseModal}>
              Cancel·lar
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingZone ? 'Actualitzar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-dark)] mb-2">
                Nom de la zona <span className="text-[var(--color-accent)]">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Exemple: Bages"
                required
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                           focus:outline-none focus:border-[var(--color-secondary)]
                           font-[family-name:var(--font-inter)] text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-[var(--color-secondary)] border-[var(--color-border)] rounded 
                           focus:ring-[var(--color-secondary)]"
              />
              <label htmlFor="is_active" className="text-sm text-[var(--color-dark)] cursor-pointer">
                Zona activa
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
