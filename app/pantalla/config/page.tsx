'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/utils/supabase/useAuth';
import AdminLayout from '@/app/components/layout/AdminLayout';
import PageHeader from '@/app/components/ui/PageHeader';
import TickerMessageEditor from '@/app/components/display/TickerMessageEditor';

interface DisplaySettings {
    center_id: string;
    show_header: boolean;
    show_clock: boolean;
    show_ticker: boolean;
    ticker_speed: number;
    default_playlist_mode: 'permanent' | 'weekday';
    standby_message: string;
    announcement_volume: number;
    announcement_mode: 'video' | 'video_360p' | 'slideshow' | 'none';
}

export default function PantallaConfigPage() {
    const router = useRouter();
    const { role, centerId, loading: authLoading } = useAuth();

    const [settings, setSettings] = useState<DisplaySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

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
            const settingsRes = await fetch(`/api/display/settings?centerId=${centerId}`);

            if (!settingsRes.ok) {
                throw new Error('Error carregant la configuració');
            }

            const settingsData = await settingsRes.json();
            setSettings(settingsData.settings);
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

            setSuccess('Configuració guardada correctament');
            setHasChanges(false);
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

    const canSave = isEditor && hasChanges;

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto">
                <PageHeader
                    title="Configuració de Pantalla"
                    description="Personalitza l'aparença de la pantalla de display"
                    action={
                        <Link
                            href="/pantalla"
                            target="_blank"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FEDD2C] hover:bg-yellow-400 text-gray-900 font-medium rounded-lg text-sm transition-colors shadow-sm"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                            </svg>
                            Previsualitzar
                        </Link>
                    }
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

                    {/* Announcement mode section */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">
                            Mode de reproducció d&apos;anuncis
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Tria com es mostren els vídeos d&apos;anunci al costat de la pantalla.
                        </p>

                        <div className="space-y-3">
                            {([
                                {
                                    value: 'video' as const,
                                    label: 'Vídeo complet',
                                    description: 'Millor qualitat. Requereix TV potent.',
                                },
                                {
                                    value: 'video_360p' as const,
                                    label: 'Vídeo 360p',
                                    description: 'Menor consum de CPU. Adequat per a la majoria de TVs.',
                                },
                                {
                                    value: 'slideshow' as const,
                                    label: 'Diapositives',
                                    description: 'Zero decodificació de vídeo. Per a TVs molt limitades. Els vídeos d\'anunci es mostren com a imatges estàtiques (màx. 90 s de contingut).',
                                },
                                {
                                    value: 'none' as const,
                                    label: 'No mostrar anuncis',
                                    description: 'La columna lateral mostrarà només el RSS a pantalla completa.',
                                },
                            ] as { value: 'video' | 'video_360p' | 'slideshow' | 'none'; label: string; description: string }[]).map((option) => {
                                const isSelected = settings.announcement_mode === option.value;
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => isEditor && updateSetting('announcement_mode', option.value)}
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'border-yellow-400 bg-yellow-50'
                                                : isEditor
                                                ? 'border-gray-200 hover:border-gray-300 bg-white'
                                                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                                    isSelected
                                                        ? 'border-yellow-500 bg-yellow-500'
                                                        : 'border-gray-400'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="w-2 h-2 rounded-full bg-white m-auto mt-0.5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 text-sm">
                                                    {option.label}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {option.description}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ticker section */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Ticker de missatges
                        </h2>

                        <div className="space-y-5">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.show_ticker}
                                    onChange={(e) => updateSetting('show_ticker', e.target.checked)}
                                    disabled={!isEditor}
                                    className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 disabled:opacity-50"
                                />
                                <span className={`${!isEditor ? 'text-gray-400' : 'text-gray-700'}`}>
                                    Mostrar ticker de missatges
                                </span>
                            </label>

                            {settings.default_playlist_mode === 'weekday' ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                                    En mode per dies, aquests són els missatges generals del centre. S&apos;utilitzen com a reserva quan el dia actual no té ticker propi configurat dins de la seva llista.
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    Aquests missatges són el ticker principal i es mostraran en rotació a la part inferior de la pantalla.
                                </p>
                            )}

                            <TickerMessageEditor
                                centerId={settings.center_id}
                                isEditor={isEditor}
                                disabled={!settings.show_ticker}
                                emptyText="No hi ha missatges generals configurats"
                            />

                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Velocitat del ticker: {getSpeedLabel(settings.ticker_speed)}
                                </label>
                                <input
                                    type="range"
                                    min="20"
                                    max="100"
                                    value={settings.ticker_speed}
                                    onChange={(e) => updateSetting('ticker_speed', parseInt(e.target.value))}
                                    disabled={!isEditor || !settings.show_ticker}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:opacity-50"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Lenta</span>
                                    <span>Ràpida</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 flex items-center justify-end bg-gray-50 rounded-b-xl">
                        <div className="flex items-center gap-3">
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
