'use client';

import { ReactNode } from 'react';

interface DisplayLayoutProps {
  showHeader?: boolean;
  headerContent?: ReactNode;
  mainZone: ReactNode;
  announcementZone?: ReactNode;
  rssZone?: ReactNode;
  tickerZone?: ReactNode;
  className?: string;
}

export default function DisplayLayout({
  showHeader = true,
  headerContent,
  mainZone,
  announcementZone,
  rssZone,
  tickerZone,
  className = '',
}: DisplayLayoutProps) {
  const hasRightColumn = announcementZone || rssZone;

  return (
    <div className={`w-full h-screen flex flex-col bg-black overflow-hidden ${className}`}>
      {/* Header opcional */}
      {showHeader && headerContent && (
        <div className="flex-shrink-0">
          {headerContent}
        </div>
      )}

      {/* Contingut principal */}
      <div className="flex-1 flex min-h-0">
        {/* Zona Principal (70% o 100% si no hi ha columna dreta) */}
        <div
          className={`h-full ${hasRightColumn ? 'w-[70%]' : 'w-full'}`}
        >
          {mainZone}
        </div>

        {/* Columna Dreta (30%) - Anuncis i RSS */}
        {hasRightColumn && (
          <div className="w-[30%] h-full flex flex-col border-l border-gray-800">
            {/* Zona Anuncis - aspect ratio 16:9 amb límit d'alçada */}
            {announcementZone && (
              <div className="flex-shrink-0 aspect-video max-h-[45%] border-b border-gray-800 overflow-hidden">
                {announcementZone}
              </div>
            )}

            {/* Zona RSS - ocupa l'espai restant */}
            {rssZone && (
              <div className="flex-1 min-h-0">
                {rssZone}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticker a la part inferior */}
      {tickerZone && (
        <div className="flex-shrink-0">
          {tickerZone}
        </div>
      )}
    </div>
  );
}
