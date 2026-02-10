'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface RSSSettings {
  seconds_per_item: number;
  seconds_per_feed: number;
  refresh_minutes: number;
}

interface RSSConfigFormProps {
  refreshKey?: number;
}

export default function RSSConfigForm({ refreshKey = 0 }: RSSConfigFormProps) {
  const [settings, setSettings] = useState<RSSSettings>({
    seconds_per_item: 15,
    seconds_per_feed: 120,
    refresh_minutes: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<RSSSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/rss/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
          setOriginalSettings(data.settings);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [refreshKey]);

  useEffect(() => {
    if (originalSettings) {
      // Note: refresh_minutes excluded - disabled due to Vercel Hobby limitation
      const changed =
        settings.seconds_per_item !== originalSettings.seconds_per_item ||
        settings.seconds_per_feed !== originalSettings.seconds_per_feed;
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      // Only send editable settings (refresh_minutes disabled due to Vercel Hobby)
      const res = await fetch('/api/rss/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seconds_per_item: settings.seconds_per_item,
          seconds_per_feed: settings.seconds_per_feed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error guardant la configuració');
      }

      setOriginalSettings(settings);
      setHasChanges(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
          Configuració RSS del Centre
        </h3>
        <p className="text-sm text-[var(--color-gray)] mt-1">
          Aquests paràmetres controlen com es mostren els feeds a la pantalla
        </p>
      </div>

      <div className="space-y-6">
        {/* Seconds per item */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Temps per ítem
            </label>
            <span className="text-sm font-semibold text-[var(--color-secondary)]">
              {settings.seconds_per_item} segons
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            value={settings.seconds_per_item}
            onChange={e =>
              setSettings(prev => ({ ...prev, seconds_per_item: parseInt(e.target.value) }))
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-secondary)]"
          />
          <p className="text-xs text-[var(--color-gray)] mt-1">
            Quant temps es mostra cada notícia (5-30 segons)
          </p>
        </div>

        {/* Seconds per feed */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Temps per feed
            </label>
            <span className="text-sm font-semibold text-[var(--color-secondary)]">
              {settings.seconds_per_feed} segons
            </span>
          </div>
          <input
            type="range"
            min="60"
            max="300"
            step="10"
            value={settings.seconds_per_feed}
            onChange={e =>
              setSettings(prev => ({ ...prev, seconds_per_feed: parseInt(e.target.value) }))
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-secondary)]"
          />
          <p className="text-xs text-[var(--color-gray)] mt-1">
            Quant temps es mostra cada feed abans de passar al següent (60-300 segons)
          </p>
        </div>

        {/* Refresh minutes - DISABLED due to Vercel Hobby limitation */}
        <div className="opacity-60">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Interval d&apos;actualització
            </label>
            <span className="text-sm font-semibold text-gray-500">
              1 vegada/dia
            </span>
          </div>
          <input
            type="range"
            min="15"
            max="180"
            step="15"
            value={60}
            disabled
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-not-allowed"
          />
          <p className="text-xs text-[var(--color-gray)] mt-1">
            Actualització automàtica diària (mitjanit UTC)
          </p>
        </div>

        {/* Vercel Hobby limitation warning */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Limitació del pla gratuït de Vercel
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Amb el pla Hobby, els feeds RSS només s&apos;actualitzen una vegada al dia
                (mitjanit UTC). Per habilitar actualitzacions més freqüents, cal actualitzar
                a Vercel Pro.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Configuració guardada correctament
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="px-4 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardant...' : 'Guardar configuració'}
        </button>
      </div>
    </div>
  );
}

export type { RSSSettings, RSSConfigFormProps };
