'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface DisplayHeaderProps {
  centerLogo?: string | null;
  centerName?: string;
  showClock?: boolean;
}

export default function DisplayHeader({
  centerLogo,
  centerName = 'PUBLI*CAT',
  showClock = true,
}: DisplayHeaderProps) {
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
    <header
      className="h-[50px] flex items-center px-6 relative"
      style={{ backgroundColor: '#FEDD2C' }}
    >
      {/* Logo i nom */}
      <div className="flex items-center gap-3">
        {centerLogo ? (
          <Image
            src={centerLogo}
            alt={centerName}
            width={36}
            height={36}
            className="object-contain"
          />
        ) : (
          <Image
            src="/logo_videos.png"
            alt="PUBLI*CAT"
            width={36}
            height={36}
            className="object-contain"
          />
        )}
        <span className="text-lg font-semibold text-gray-900">
          {centerName}
        </span>
      </div>

      {/* Rellotge centrat */}
      {showClock && (
        <div className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-medium text-gray-900">
          {currentTime}
        </div>
      )}
    </header>
  );
}
