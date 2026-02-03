'use client';

import { parseHashtagInput } from '@/lib/hashtags';

interface HashtagInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function HashtagInput({ value, onChange }: HashtagInputProps) {
  const parsed = parseHashtagInput(value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Hashtags del centre (opcional)
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="esports, ciencies, cultura"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
      />

      <p className="text-xs text-gray-500">
        Paraules clau del centre separades per comes. S&apos;afegiran automàticament si no existeixen.
      </p>

      {parsed.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {parsed.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
