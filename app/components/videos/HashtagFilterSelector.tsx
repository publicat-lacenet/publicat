'use client';

import { useEffect, useState } from 'react';

interface Hashtag {
  id: string;
  name: string;
}

interface HashtagFilterSelectorProps {
  centerId: string | null;
  selectedHashtagIds: string[];
  onChange: (hashtagIds: string[]) => void;
}

export default function HashtagFilterSelector({ centerId, selectedHashtagIds, onChange }: HashtagFilterSelectorProps) {
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!centerId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/hashtags?centerId=${centerId}`);
        if (res.ok) {
          const data = await res.json();
          setHashtags(data.hashtags || []);
        }
      } catch (err) {
        console.error('Error carregant hashtags:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [centerId]);

  const toggleHashtag = (hashtagId: string) => {
    if (selectedHashtagIds.includes(hashtagId)) {
      onChange(selectedHashtagIds.filter(id => id !== hashtagId));
    } else {
      onChange([...selectedHashtagIds, hashtagId]);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Carregant hashtags...</div>;
  }

  if (!centerId) {
    return <div className="text-sm text-gray-400">Selecciona un centre primer</div>;
  }

  if (hashtags.length === 0) {
    return <div className="text-sm text-gray-400">No hi ha hashtags al centre</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {hashtags.map((hashtag) => (
        <button
          key={hashtag.id}
          type="button"
          className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors duration-150
            ${selectedHashtagIds.includes(hashtag.id)
              ? 'bg-[#16AFAA] text-white border border-[#16AFAA]'
              : 'bg-[#F3F4F6] text-[#374151] border border-[#D1D5DB] hover:bg-gray-200'}
          `}
          onClick={() => toggleHashtag(hashtag.id)}
          aria-pressed={selectedHashtagIds.includes(hashtag.id)}
        >
          #{hashtag.name}
        </button>
      ))}
    </div>
  );
}
