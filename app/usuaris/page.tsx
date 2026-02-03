'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/app/components/layout/AdminLayout'
import Breadcrumb from '@/app/components/ui/Breadcrumb'
import PageHeader from '@/app/components/ui/PageHeader'
import Button from '@/app/components/ui/button'
import Modal from '@/app/components/ui/Modal'
import { useAuth } from '@/utils/supabase/AuthContext'

interface User {
  id: string
  email: string
  full_name?: string
  role: 'editor_profe' | 'editor_alumne' | 'display'
  center_id: string | null
  is_active: boolean
  onboarding_status: 'invited' | 'active' | 'disabled'
  created_at: string
  last_invitation_sent_at?: string
}

const ROLE_LABELS: Record<string, string> = {
  editor_profe: 'Editor Professor',
  editor_alumne: 'Editor Alumne',
  display: 'Display',
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  editor_profe: 'bg-blue-100 text-blue-700',
  editor_alumne: 'bg-purple-100 text-purple-700',
  display: 'bg-gray-100 text-gray-600',
}

export default function UsuarisPage() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'editor_profe' as User['role'],
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.append('role', roleFilter)
      if (statusFilter) params.append('is_active', statusFilter)
      if (search) params.append('search', search)

      const res = await fetch(`/api/center/users?${params}`)
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [roleFilter, statusFilter, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      full_name: '',
      role: 'editor_profe',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      role: user.role,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    setFormError(null)

    if (!editingUser && !formData.email.trim()) {
      setFormError("L'email és obligatori")
      return
    }

    setSaving(true)
    try {
      const url = editingUser
        ? `/api/center/users/${editingUser.id}`
        : '/api/center/users'

      const method = editingUser ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        role: formData.role,
        full_name: formData.full_name || null,
      }

      if (!editingUser) {
        body.email = formData.email
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok) {
        await fetchUsers()
        setIsModalOpen(false)
      } else {
        setFormError(data.error || "Error al guardar l'usuari")
      }
    } catch (error) {
      console.error('Error saving user:', error)
      setFormError("Error al guardar l'usuari")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/center/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })

      if (res.ok) {
        await fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || "Error al canviar l'estat de l'usuari")
      }
    } catch (error) {
      console.error('Error toggling user:', error)
      alert("Error al canviar l'estat de l'usuari")
    }
  }

  const handleResendInvite = async (user: User) => {
    if (!confirm(`Reenviar invitació a ${user.email}?`)) {
      return
    }

    try {
      const res = await fetch(`/api/center/users/${user.id}/resend-invite`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message || 'Invitació reenviada correctament')
      } else {
        alert(data.error || 'Error al reenviar la invitació')
      }
    } catch (error) {
      console.error('Error resending invite:', error)
      alert('Error al reenviar la invitació')
    }
  }

  const isCurrentUser = (userId: string) => authUser?.id === userId

  return (
    <AdminLayout>
      <Breadcrumb items={['Usuaris']} />

      <PageHeader
        title="Gestió d'Usuaris"
        description="Administració d'usuaris del centre: professors, alumnes i pantalles"
      />

      {/* Filters and search */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Cerca per email o nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg
                     focus:outline-none focus:border-[var(--color-secondary)]"
          />

          {/* Role filter */}
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

          {/* Status filter */}
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

      {/* Users table */}
      {loading ? (
        <div className="text-center py-8">Carregant usuaris...</div>
      ) : (
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
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-[var(--color-gray)]"
                  >
                    No s&apos;han trobat usuaris
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-[var(--color-light-bg)] transition-colors"
                  >
                    <td className="px-6 py-4 font-[family-name:var(--font-inter)]">
                      {u.email}
                      {isCurrentUser(u.id) && (
                        <span className="ml-2 text-xs text-[var(--color-gray)]">
                          (tu)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-[family-name:var(--font-inter)]">
                      {u.full_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-sm ${ROLE_BADGE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm">
                          Actiu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm">
                          Inactiu
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.onboarding_status === 'active' ? (
                        <span className="text-green-600 text-sm">Completat</span>
                      ) : u.onboarding_status === 'disabled' ? (
                        <span className="text-red-600 text-sm">Desactivat</span>
                      ) : (
                        <span className="text-yellow-600 text-sm">Convidat</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {u.onboarding_status === 'invited' && (
                          <button
                            onClick={() => handleResendInvite(u)}
                            className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg transition-colors"
                            title="Reenviar invitació"
                          >
                            Reenviar
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(u)}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isCurrentUser(u.id)}
                          className="px-2 py-1 text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: u.is_active
                              ? 'rgb(254 226 226)'
                              : 'rgb(220 252 231)',
                            color: u.is_active
                              ? 'rgb(185 28 28)'
                              : 'rgb(21 128 61)',
                          }}
                          title={
                            isCurrentUser(u.id)
                              ? 'No pots desactivar el teu propi usuari'
                              : u.is_active
                                ? 'Desactivar'
                                : 'Activar'
                          }
                        >
                          {u.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuari' : 'Crear Usuari'}
      >
        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="usuari@exemple.com"
              disabled={!!editingUser}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg
                       focus:outline-none focus:border-[var(--color-secondary)]
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {editingUser && (
              <p className="text-xs text-[var(--color-gray)] mt-1">
                L&apos;email no es pot modificar
              </p>
            )}
          </div>

          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Nom complet
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder="Nom i cognoms"
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg
                       focus:outline-none focus:border-[var(--color-secondary)]"
            />
          </div>

          {/* Role */}
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
                })
              }
              disabled={editingUser ? isCurrentUser(editingUser.id) : false}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg
                       focus:outline-none focus:border-[var(--color-secondary)]
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {editingUser && isCurrentUser(editingUser.id) && (
              <p className="text-xs text-[var(--color-gray)] mt-1">
                No pots canviar el teu propi rol
              </p>
            )}
          </div>

          {/* Info box for new users */}
          {!editingUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                S&apos;enviarà un email d&apos;invitació a l&apos;usuari per
                completar el registre. L&apos;usuari s&apos;assignarà
                automàticament al teu centre.
              </p>
            </div>
          )}

          {/* Error message */}
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{formError}</p>
            </div>
          )}

          {/* Actions */}
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
    </AdminLayout>
  )
}
