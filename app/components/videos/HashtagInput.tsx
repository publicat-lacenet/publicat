'use client';

interface HashtagInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function HashtagInput({ value, onChange }: HashtagInputProps) {
  const hashtags = value
    .split(',')
    .map(h => h.trim())
    .filter(h => h.length > 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    
    // Auto-añadir # si no está presente
    const parts = input.split(',').map(part => {
      const trimmed = part.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return '#' + trimmed;
      }
      return trimmed;
    });
    
    onChange(parts.join(', '));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Hashtags del centre (opcional)
      </label>
      
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="#esports, #ciencies, #cultura"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
      />
      
      <p className="text-xs text-gray-500">
        Separa els hashtags amb comes. S&apos;afegiran automàticament si no existeixen.
      </p>

      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {hashtags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
