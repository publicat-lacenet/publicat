'use client';

import { useEffect, useState } from 'react';

interface Zone {
  id: string;
  name: string;
}

interface ZoneSelectorProps {
  selectedZoneId: string | null;
  onChange: (zoneId: string | null) => void;
}

export default function ZoneSelector({ selectedZoneId, onChange }: ZoneSelectorProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/zones');
        if (res.ok) {
          const data = await res.json();
          setZones(data.zones || []);
        }
      } catch (err) {
        console.error('Error carregant zones:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Carregant zones...</div>;
  }

  if (zones.length === 0) {
    return <div className="text-sm text-gray-400">No hi ha zones disponibles</div>;
  }

  return (
    <select
      value={selectedZoneId || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm
               focus:outline-none focus:border-[var(--color-secondary)]
               font-[family-name:var(--font-inter)]"
    >
      <option value="">Totes les zones</option>
      {zones.map((zone) => (
        <option key={zone.id} value={zone.id}>
          {zone.name}
        </option>
      ))}
    </select>
  );
}
