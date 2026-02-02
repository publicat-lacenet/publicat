'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/utils/supabase/useAuth';
import AdminLayout from '@/app/components/layout/AdminLayout';
import PageHeader from '@/app/components/ui/PageHeader';

interface DisplaySettings {
    center_id: string;
    show_header: boolean;
    show_clock: boolean;
    show_ticker: boolean;
    ticker_speed: number;
    standby_message: string;
    announcement_volume: number;
}

interface TickerMessage {
    id: string;
    text: string;
    position: number;
    is_active: boolean;
}

export default function PantallaConfigPage() {
    const router = useRouter();
    const { role, centerId, loading: authLoading } = useAuth();

    const [settings, setSettings] = useState<DisplaySettings | null>(null);
    const [tickerMessages, setTickerMessages] = useState<TickerMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [hasTickerChanges, setHasTickerChanges] = useState(false);

    const isEditor = role === 'editor_profe' || role === 'admin_global';

    // Check permissions - all editors can view config
    useEffect(() => {
        if (!authLoading && role !== 'editor_profe' && role !== 'admin_global' && role !== 'editor_alumne') {
            router.push('/dashboard');
        }
    }, [role, authLoading, router]);

    // Fetch settings
    const fetchSettings = useCallback(async () => {
        if (!centerId) return;

        setLoading(true);
        setError(null);

        try {
            const [settingsRes, tickerRes] = await Promise.all([
                fetch(`/api/display/settings?centerId=${centerId}`),
                fetch(`/api/display/ticker?centerId=${centerId}`),
            ]);

            if (!settingsRes.ok) {
                throw new Error('Error carregant la configuració');
            }

            const settingsData = await settingsRes.json();
            setSettings(settingsData.settings);

            if (tickerRes.ok) {
                const tickerData = await tickerRes.json();
                setTickerMessages(tickerData.messages || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconegut');
        } finally {
            setLoading(false);
        }
    }, [centerId]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Update local settings
    const updateSetting = <K extends keyof DisplaySettings>(
        key: K,
        value: DisplaySettings[K]
    ) => {
        if (!settings) return;

        setSettings({
            ...settings,
            [key]: value,
        });
        setHasChanges(true);
        setSuccess(null);
    };

    // Update ticker message locally
    const updateTickerMessage = (id: string, text: string) => {
        setTickerMessages(messages =>
            messages.map(m => m.id === id ? { ...m, text } : m)
        );
        setHasTickerChanges(true);
        setSuccess(null);
    };

    // Add new ticker message
    const addTickerMessage = async () => {
        if (!centerId || !isEditor) return;

        try {
            const response = await fetch('/api/display/ticker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Nou missatge', centerId }),
            });

            if (!response.ok) {
                throw new Error('Error afegint missatge');
            }

            const data = await response.json();
            setTickerMessages([...tickerMessages, data.message]);
            setSuccess('Missatge afegit');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error afegint missatge');
        }
    };

    // Delete ticker message
    const deleteTickerMessage = async (id: string) => {
        if (!isEditor) return;

        try {
            const response = await fetch(`/api/display/ticker/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error eliminant missatge');
            }

            setTickerMessages(messages => messages.filter(m => m.id !== id));
            setSuccess('Missatge eliminat');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error eliminant missatge');
        }
    };

    // Save all settings
    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Save display settings if changed
            if (hasChanges) {
                const response = await fetch('/api/display/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Error guardant la configuració');
                }
            }

            // Save ticker messages if changed
            if (hasTickerChanges) {
                for (const message of tickerMessages) {
                    await fetch(`/api/display/ticker/${message.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: message.text }),
                    });
                }
            }

            setSuccess('Configuració guardada correctament');
            setHasChanges(false);
            setHasTickerChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconegut');
        } finally {
            setSaving(false);
        }
    };

    // Speed label helper
    const getSpeedLabel = (speed: number) => {
        if (speed <= 30) return 'Lenta';
        if (speed <= 60) return 'Mitjana';
        return 'Ràpida';
    };

    if (authLoading || loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Carregant...</div>
                </div>
            </AdminLayout>
        );
    }

    if (!settings) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-red-500">{error || 'Configuració no disponible'}</div>
                </div>
            </AdminLayout>
        );
    }

    const canSave = isEditor && (hasChanges || hasTickerChanges);

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto">
                <PageHeader
                    title="Configuració de Pantalla"
                    description="Personalitza l'aparença de la pantalla de display"
                />

                {/* Error/Success messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {success}
                    </div>
                )}

                {/* Settings Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    {/* Header section */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Capçalera
                        </h2>

                        <div className="space-y-4">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.show_header}
                                    onChange={(e) => updateSetting('show_header', e.target.checked)}
                                    disabled={!isEditor}
                                    className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 disabled:opacity-50"
                                />
                                <span className={`${!isEditor ? 'text-gray-400' : 'text-gray-700'}`}>
                                    Mostrar capçalera amb logo
                                </span>
                            </label>

                            <label className="flex items-center gap-3 ml-8">
                                <input
                                    type="checkbox"
                                    checked={settings.show_clock}
                                    onChange={(e) => updateSetting('show_clock', e.target.checked)}
                                    disabled={!isEditor || !settings.show_header}
                                    className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 disabled:opacity-50"
                                />
                                <span className={`${!isEditor || !settings.show_header ? 'text-gray-400' : 'text-gray-700'}`}>
                                    Mostrar rellotge
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Ticker section */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Ticker de missatges
                        </h2>

                        <p className="text-sm text-gray-500 mb-4">
                            Els missatges es mostraran en rotació a la part inferior de la pantalla.
                        </p>

                        {/* Messages list */}
                        <div className="space-y-3 mb-4">
                            {tickerMessages.map((message, index) => (
                                <div key={message.id} className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
                                    <input
                                        type="text"
                                        value={message.text}
                                        onChange={(e) => updateTickerMessage(message.id, e.target.value)}
                                        disabled={!isEditor}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-50 disabled:text-gray-500"
                                        placeholder="Escriu el missatge..."
                                    />
                                    {/* Show delete button only if more than 1 message and user is editor */}
                                    {isEditor && tickerMessages.length > 1 && (
                                        <button
                                            onClick={() => deleteTickerMessage(message.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar missatge"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                    {/* Show placeholder for first message (can't delete) */}
                                    {(!isEditor || tickerMessages.length === 1) && (
                                        <div className="w-9" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add message button */}
                        {isEditor && (
                            <button
                                onClick={addTickerMessage}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Afegir missatge
                            </button>
                        )}

                        {/* Speed control */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Velocitat del ticker: {getSpeedLabel(settings.ticker_speed)}
                            </label>
                            <input
                                type="range"
                                min="20"
                                max="100"
                                value={settings.ticker_speed}
                                onChange={(e) => updateSetting('ticker_speed', parseInt(e.target.value))}
                                disabled={!isEditor}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:opacity-50"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Lenta</span>
                                <span>Ràpida</span>
                            </div>
                        </div>

                    </div>

                    {/* Actions */}
                    <div className="p-6 flex items-center justify-between bg-gray-50 rounded-b-xl">
                        <Link
                            href="/pantalla"
                            target="_blank"
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            Obrir previsualització en nova pestanya
                        </Link>

                        <div className="flex items-center gap-3">
                            <Link
                                href="/visor"
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                Tornar
                            </Link>
                            {isEditor && (
                                <button
                                    onClick={handleSave}
                                    disabled={!canSave || saving}
                                    className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-900 font-medium rounded-lg transition-colors"
                                >
                                    {saving ? 'Guardant...' : 'Guardar'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
