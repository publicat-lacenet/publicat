'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Tag {
  id: string;
  name: string;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export default function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();


  useEffect(() => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('tags')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (fetchError) {
        console.error('Error carregant tags:', fetchError);
        setError(fetchError.message);
      } else {
        console.log('Tags carregats:', data);
        setTags(data || []);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (error) {
    return <div className="text-sm text-red-600">Error carregant etiquetes: {error}</div>;
  }

  if (tags.length === 0) {
    return <div className="text-sm text-amber-600">No hi ha etiquetes disponibles. Si us plau, contacta amb l&apos;administrador.</div>;
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Etiquetes globals * (mínim 1)
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`px-3 py-2 rounded border text-sm font-medium transition flex items-center gap-2 w-full
              ${selectedTagIds.includes(tag.id)
                ? 'bg-[#E31E52] text-white border-[#E31E52]'
                : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}
            `}
            onClick={() => toggleTag(tag.id)}
            aria-pressed={selectedTagIds.includes(tag.id)}
          >
            <span>{tag.name}</span>
          </button>
        ))}
      </div>
      {selectedTagIds.length === 0 && (
        <p className="text-xs text-red-600">Cal seleccionar almenys una etiqueta</p>
      )}
    </div>
  );
}
