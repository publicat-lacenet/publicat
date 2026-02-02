'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const PRIMARY_COLOR = '#FEDD2C';

interface StandbyScreenProps {
  message?: string;
  centerLogo?: string | null;
  centerName?: string;
}

export default function StandbyScreen({
  message = 'Pròximament...',
  centerLogo,
  centerName = 'PUBLI*CAT',
}: StandbyScreenProps) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ca-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800"
      style={{ '--primary-color': PRIMARY_COLOR } as React.CSSProperties}
    >
      {/* Logo */}
      <div className="mb-8 animate-pulse">
        {centerLogo ? (
          <Image
            src={centerLogo}
            alt={centerName}
            width={120}
            height={120}
            className="object-contain"
          />
        ) : (
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <span className="text-4xl font-bold text-gray-900">
              {centerName.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Nom del centre */}
      <h1 className="text-3xl font-bold text-white mb-4">
        {centerName}
      </h1>

      {/* Missatge */}
      <p
        className="text-xl font-medium mb-8"
        style={{ color: PRIMARY_COLOR }}
      >
        {message}
      </p>

      {/* Rellotge */}
      <div className="text-6xl font-light text-white/80">
        {currentTime}
      </div>

      {/* Decoració animada */}
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
        <div
          className="h-full animate-slide"
          style={{
            background: `linear-gradient(90deg, transparent, ${PRIMARY_COLOR}, transparent)`,
            width: '200%',
            animation: 'slide 3s linear infinite',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
      `}</style>
    </div>
  );
}
