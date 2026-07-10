'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';

interface TickerMessage {
  id: string;
  text: string;
  position: number;
  is_active: boolean;
}

interface TickerMessageEditorProps {
  centerId: string;
  playlistId?: string | null;
  isEditor: boolean;
  disabled?: boolean;
  emptyText?: string;
}

export default function TickerMessageEditor({
  centerId,
  playlistId,
  isEditor,
  disabled = false,
  emptyText = 'No hi ha missatges configurats',
}: TickerMessageEditorProps) {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canEdit = isEditor && !disabled;

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ centerId });
      if (playlistId) {
        params.set('playlistId', playlistId);
      }

      const res = await fetch(`/api/display/ticker?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error carregant els missatges');
      }

      setMessages(data.messages || []);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error carregant els missatges');
    } finally {
      setLoading(false);
    }
  }, [centerId, playlistId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const updateMessageText = (id: string, text: string) => {
    setMessages(current =>
      current.map(message => message.id === id ? { ...message, text } : message)
    );
    setHasChanges(true);
    setSuccess(null);
  };

  const addMessage = async () => {
    if (!canEdit) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/display/ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId,
          playlistId: playlistId || undefined,
          text: 'Nou missatge',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error afegint missatge');
      }

      setMessages(current => [...current, data.message]);
      setSuccess('Missatge afegit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error afegint missatge');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!canEdit) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/display/ticker/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error eliminant missatge');
      }

      setMessages(current => current.filter(message => message.id !== id));
      setHasChanges(false);
      setSuccess('Missatge eliminat');
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminant missatge');
    }
  };

  const saveMessages = async () => {
    if (!canEdit || !hasChanges) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      for (const message of messages) {
        const res = await fetch(`/api/display/ticker/${message.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message.text }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Error guardant missatge');
        }
      }

      setHasChanges(false);
      setSuccess('Missatges guardats');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardant missatges');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Carregant missatges...</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          {success}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-4">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message, index) => {
            const canDelete = canEdit && (Boolean(playlistId) || messages.length > 1);

            return (
              <div key={message.id} className="flex items-center gap-2">
                <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
                <input
                  type="text"
                  value={message.text}
                  onChange={(event) => updateMessageText(message.id, event.target.value)}
                  disabled={!canEdit}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Escriu el missatge..."
                />
                {canDelete ? (
                  <button
                    onClick={() => deleteMessage(message.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar missatge"
                    type="button"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="w-9" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={addMessage}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Afegir missatge
          </button>

          <button
            onClick={saveMessages}
            type="button"
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-900 rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardant...' : 'Guardar missatges'}
          </button>
        </div>
      )}
    </div>
  );
}

export type { TickerMessageEditorProps };
