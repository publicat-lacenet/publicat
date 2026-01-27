'use client';

import { useState } from 'react';
import Link from 'next/link';
import DisplayScreen from '@/app/components/display/DisplayScreen';
import SignOutButton from './sign-out-button';

interface DisplayScreenWrapperProps {
    centerId: string;
    playlistOverride?: string;
    userRole: string;
}

export default function DisplayScreenWrapper({
    centerId,
    playlistOverride,
    userRole,
}: DisplayScreenWrapperProps) {
    const [showControls, setShowControls] = useState(false);

    const hasVisorAccess = userRole === 'editor_profe' || userRole === 'admin_global' || userRole === 'editor_alumne';

    return (
        <div
            className="relative w-screen h-screen"
            onMouseMove={() => {
                if (hasVisorAccess) {
                    setShowControls(true);
                    // Auto-hide after 3 seconds
                    setTimeout(() => setShowControls(false), 3000);
                }
            }}
        >
            {/* Main display */}
            <DisplayScreen
                centerId={centerId}
                playlistOverride={playlistOverride}
            />

            {/* Control buttons - visible on hover for editors, always for display role */}
            <div
                className={`absolute top-2 right-4 flex items-center gap-2 transition-opacity duration-300 ${
                    showControls || userRole === 'display' ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {/* Config button for all editors */}
                {hasVisorAccess && (
                    <Link
                        href="/pantalla/config"
                        className="px-3 py-1.5 bg-white/90 hover:bg-white text-gray-800 text-sm font-medium rounded shadow-lg transition-colors"
                    >
                        Configurar
                    </Link>
                )}

                {/* Exit/Signout button */}
                {hasVisorAccess ? (
                    <Link
                        href="/visor"
                        className="px-3 py-1.5 bg-gray-800/90 hover:bg-gray-800 text-white text-sm font-medium rounded shadow-lg transition-colors"
                    >
                        Sortir
                    </Link>
                ) : (
                    <SignOutButton />
                )}
            </div>

        </div>
    );
}
