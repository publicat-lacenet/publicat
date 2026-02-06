'use client';

import { useEffect } from 'react';
import TagFilterSelector from './TagFilterSelector';
import HashtagFilterSelector from './HashtagFilterSelector';
import ZoneSelector from './ZoneSelector';
import CenterSelector from './CenterSelector';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTagIds: string[];
  selectedHashtagIds: string[];
  selectedZoneId: string | null;
  selectedCenterId: string | null;
  onTagsChange: (tagIds: string[]) => void;
  onHashtagsChange: (hashtagIds: string[]) => void;
  onZoneChange: (zoneId: string | null) => void;
  onCenterChange: (centerId: string | null) => void;
  onClearAll: () => void;
  centerId: string | null;
  hideZoneFilter?: boolean;
  hideCenterFilter?: boolean;
}

export default function FilterDrawer({
  isOpen,
  onClose,
  selectedTagIds,
  selectedHashtagIds,
  selectedZoneId,
  selectedCenterId,
  onTagsChange,
  onHashtagsChange,
  onZoneChange,
  onCenterChange,
  onClearAll,
  centerId,
  hideZoneFilter,
  hideCenterFilter,
}: FilterDrawerProps) {
  const activeCount = selectedTagIds.length + selectedHashtagIds.length + (selectedZoneId ? 1 : 0) + (selectedCenterId ? 1 : 0);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-80 bg-white shadow-[-4px_0_16px_rgba(0,0,0,0.1)] z-50
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold font-[family-name:var(--font-montserrat)] text-[var(--color-dark)]">
            Filtres
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-gray)] hover:text-[var(--color-dark)] text-2xl leading-none"
            aria-label="Tancar filtres"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Tags globals */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-dark)] mb-2 font-[family-name:var(--font-montserrat)]">
              Etiquetes
              {selectedTagIds.length > 0 && (
                <span className="ml-2 text-xs font-normal text-[var(--color-gray)]">
                  ({selectedTagIds.length} {selectedTagIds.length === 1 ? 'seleccionada' : 'seleccionades'})
                </span>
              )}
            </h3>
            <TagFilterSelector
              selectedTagIds={selectedTagIds}
              onChange={onTagsChange}
            />
          </div>

          {/* Hashtags del centre */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-dark)] mb-2 font-[family-name:var(--font-montserrat)]">
              Hashtags
              {selectedHashtagIds.length > 0 && (
                <span className="ml-2 text-xs font-normal text-[var(--color-gray)]">
                  ({selectedHashtagIds.length} {selectedHashtagIds.length === 1 ? 'seleccionat' : 'seleccionats'})
                </span>
              )}
            </h3>
            <HashtagFilterSelector
              centerId={centerId}
              selectedHashtagIds={selectedHashtagIds}
              onChange={onHashtagsChange}
            />
          </div>

          {/* Zona */}
          {!hideZoneFilter && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-dark)] mb-2 font-[family-name:var(--font-montserrat)]">
                Zona
                {selectedZoneId && (
                  <span className="ml-2 text-xs font-normal text-[var(--color-gray)]">
                    (1 seleccionada)
                  </span>
                )}
              </h3>
              <ZoneSelector
                selectedZoneId={selectedZoneId}
                onChange={onZoneChange}
              />
            </div>
          )}

          {/* Centre */}
          {!hideCenterFilter && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-dark)] mb-2 font-[family-name:var(--font-montserrat)]">
                Centre
                {selectedCenterId && (
                  <span className="ml-2 text-xs font-normal text-[var(--color-gray)]">
                    (1 seleccionat)
                  </span>
                )}
              </h3>
              <CenterSelector
                selectedCenterId={selectedCenterId}
                onChange={onCenterChange}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {activeCount > 0 && (
          <div className="px-5 py-4 border-t border-[var(--color-border)]">
            <button
              onClick={onClearAll}
              className="w-full text-sm font-medium text-[#F91248] hover:text-[#d10e3d] transition-colors"
            >
              Netejar filtres ({activeCount})
            </button>
          </div>
        )}
      </div>
    </>
  );
}
