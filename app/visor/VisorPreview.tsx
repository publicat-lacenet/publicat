'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DisplayScreen from '@/app/components/display/DisplayScreen';

interface VisorPreviewProps {
  centerId: string;
}

export default function VisorPreview({ centerId }: VisorPreviewProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const scheduleHide = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    };

    const handleMouseMove = () => {
      setControlsVisible(true);
      scheduleHide();
    };

    const container = containerRef.current;
    container?.addEventListener('mousemove', handleMouseMove);

    // Initial hide schedule
    scheduleHide();

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      container?.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
      {/* Display Screen - Full size */}
      <DisplayScreen centerId={centerId} embedded />

      {/* Floating Controls */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between transition-all duration-300 ${
          controlsVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Left side - Config button + info */}
        <div className="flex items-center gap-2">
          <Link
            href="/pantalla/config"
            className="flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Configurar
          </Link>

          {/* Info tooltip */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white/70 hover:text-white rounded-lg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute top-full left-0 mt-2 w-72 p-3 bg-black/90 backdrop-blur-sm text-white text-xs rounded-lg shadow-lg">
                <p>
                  <strong>Preview del display</strong> (sense audio).
                  La llista mostrada correspon al dia actual.
                  L&apos;audio s&apos;activara automaticament en obrir la pantalla completa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Fullscreen button */}
        <Link
          href="/pantalla"
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-[#FEDD2C] hover:bg-yellow-400 text-gray-900 font-medium rounded-lg text-sm transition-colors shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          Obrir pantalla completa
        </Link>
      </div>
    </div>
  );
}
