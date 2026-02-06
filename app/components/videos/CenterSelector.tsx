'use client';

import { useEffect, useState } from 'react';

interface Center {
  id: string;
  name: string;
}

interface CenterSelectorProps {
  selectedCenterId: string | null;
  onChange: (centerId: string | null) => void;
}

export default function CenterSelector({ selectedCenterId, onChange }: CenterSelectorProps) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/centers');
        if (res.ok) {
          const data = await res.json();
          setCenters(data.centers || []);
        }
      } catch (err) {
        console.error('Error carregant centres:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Carregant centres...</div>;
  }

  if (centers.length === 0) {
    return <div className="text-sm text-gray-400">No hi ha centres disponibles</div>;
  }

  return (
    <select
      value={selectedCenterId || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm
               focus:outline-none focus:border-[var(--color-secondary)]
               font-[family-name:var(--font-inter)]"
    >
      <option value="">Tots els centres</option>
      {centers.map((center) => (
        <option key={center.id} value={center.id}>
          {center.name}
        </option>
      ))}
    </select>
  );
}
