'use client';

import { useEffect, useState } from 'react';

interface Tag {
  id: string;
  name: string;
}

interface TagFilterSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export default function TagFilterSelector({ selectedTagIds, onChange }: TagFilterSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tags');
        if (res.ok) {
          const data = await res.json();
          setTags(data.tags || []);
        }
      } catch (err) {
        console.error('Error carregant tags:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Carregant etiquetes...</div>;
  }

  if (tags.length === 0) {
    return <div className="text-sm text-gray-400">No hi ha etiquetes disponibles</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150
            ${selectedTagIds.includes(tag.id)
              ? 'bg-[#FEDD2C] text-[#111827] border border-[#FEDD2C]'
              : 'bg-[#F3F4F6] text-[#374151] border border-[#D1D5DB] hover:bg-gray-200'}
          `}
          onClick={() => toggleTag(tag.id)}
          aria-pressed={selectedTagIds.includes(tag.id)}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
