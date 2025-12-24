'use client';

import { useState, useEffect } from 'react';
import Button from '@/app/components/ui/Button';
import Modal from '@/app/components/ui/Modal';

interface Center {
  id: string;
  name: string;
  zones?: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'admin_global' | 'editor_profe' | 'editor_alumne' | 'display';
  center_id: string | null;
  is_active: boolean;
  onboarding_status: 'invited' | 'active' | 'disabled';
  centers?: Center;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin_global: 'Admin Global',
  editor_profe: 'Editor Professor',
  editor_alumne: 'Editor Alumne',
  display: 'Display',
};

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [centerFilter, setCenterFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchEmail, setSearchEmail] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'editor_profe' as User['role'],
    center_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCenters();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, centerFilter, statusFilter, searchEmail]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (centerFilter) params.append('center_id', centerFilter);
      if (statusFilter) params.append('is_active', statusFilter);
      if (searchEmail) params.append('email', searchEmail);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      const res = await fetch('/api/admin/centers');
      const data = await res.json();
      if (res.ok) {
        setCenters(data.centers || []);
      }
    } catch (error) {
      console.error('Error fetching centers:', error);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      role: 'editor_profe',
      center_id: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role,
      center_id: user.center_id || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.email.trim()) {
      alert('L\'email és obligatori');
      return;
    }

    if (formData.role !== 'admin_global' && !formData.center_id) {
      alert('Cal seleccionar un centre per aquest rol');
      return;
    }

    setSaving(true);
    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      
      const method = editingUser ? 'PATCH' : 'POST';
      
      const body: any = {
        role: formData.role,
        center_id: formData.role === 'admin_global' ? null : formData.center_id,
        full_name: formData.full_name || null,
        phone: formData.phone || null,
      };

      if (!editingUser) {
        body.email = formData.email;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchUsers();
        setIsModalOpen(false);
        alert(
          editingUser
            ? 'Usuari actualitzat correctament'
            : 'Usuari creat i invitació enviada'
        );
      } else {
        alert(data.error || 'Error al guardar l\'usuari');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar l\'usuari');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al canviar l\'estat de l\'usuari');
      }
    } catch (error) {
      console.error('Error toggling user:', error);
      alert('Error al canviar l\'estat de l\'usuari');
    }
  };

  const handleResendInvite = async (user: User) => {
    if (!confirm(`Reenviar invitació a ${user.email}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}/resend-invite`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Invitació reenviada correctament');
      } else {
        alert(data.error || 'Error al reenviar la invitació');
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      alert('Error al reenviar la invitació');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregant usuaris...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtres i cerca */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Cerca per email */}
          <input
            type="text"
            placeholder="Cerca per email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg 
                     focus:outline-none focus:border-[var(--color-secondary)]"
          />

          {/* Filtre rol */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg 
                     focus:outline-none focus:border-[var(--color-secondary)]"
          >
            <option value="">Tots els rols</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Filtre centre */}
          <select
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg 
                     focus:outline-none focus:border-[var(--color-secondary)]"
          >
            <option value="">Tots els centres</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>

          {/* Filtre estat */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg 
                     focus:outline-none focus:border-[var(--color-secondary)]"
          >
            <option value="">Tots els estats</option>
            <option value="true">Actius</option>
            <option value="false">Inactius</option>
          </select>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" onClick={handleCreate}>
            + Crear Usuari
          </Button>
        </div>
      </div>

      {/* Taula d'usuaris */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-light-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Centre
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Estat
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-dark)]">
                Onboarding
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-[var(--color-dark)]">
                Accions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-[var(--color-gray)]">
                  No s'han trobat usuaris
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--color-light-bg)] transition-colors">
                  <td className="px-6 py-4 font-[family-name:var(--font-inter)]">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 font-[family-name:var(--font-inter)]">
                    {user.full_name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-gray)] font-[family-name:var(--font-inter)]">
                    {user.centers?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
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
                    {user.onboarding_status === 'active' ? (
                      <span className="text-green-600 text-sm">✓ Actiu</span>
                    ) : user.onboarding_status === 'disabled' ? (
                      <span className="text-red-600 text-sm">🔴 Desactivat</span>
                    ) : (
                      <span className="text-yellow-600 text-sm">⏳ Convidat</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {user.onboarding_status === 'invited' && (
                        <button
                          onClick={() => handleResendInvite(user)}
                          className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Reenviar invitació"
                        >
                          📧
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 hover:bg-[var(--color-light-bg)] rounded-lg transition-colors"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className="p-2 hover:bg-[var(--color-light-bg)] rounded-lg transition-colors"
                        title={user.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {user.is_active ? '🔴' : '⚪'}
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
        title={editingUser ? 'Editar Usuari' : 'Crear Usuari'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuari@exemple.com"
              disabled={!!editingUser}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                       focus:outline-none focus:border-[var(--color-secondary)]
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {editingUser && (
              <p className="text-xs text-[var(--color-gray)] mt-1">
                L'email no es pot modificar
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Nom complet
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nom i cognoms"
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                       focus:outline-none focus:border-[var(--color-secondary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Telèfon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+34 600 000 000"
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                       focus:outline-none focus:border-[var(--color-secondary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Rol *
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as User['role'],
                  center_id: e.target.value === 'admin_global' ? '' : formData.center_id,
                })
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                       focus:outline-none focus:border-[var(--color-secondary)]"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {formData.role !== 'admin_global' && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
                Centre *
              </label>
              <select
                value={formData.center_id}
                onChange={(e) => setFormData({ ...formData, center_id: e.target.value })}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg 
                         focus:outline-none focus:border-[var(--color-secondary)]"
              >
                <option value="">Selecciona un centre</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!editingUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ℹ️ S'enviarà un email d'invitació a l'usuari per completar el registre
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel·lar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editingUser ? 'Actualitzar' : 'Crear i Enviar Invitació'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
