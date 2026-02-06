'use client';

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
    return (
        <div className="relative w-screen h-screen">
            {/* Main display */}
            <DisplayScreen
                centerId={centerId}
                playlistOverride={playlistOverride}
            />

            {/* SignOut button - only for display role */}
            {userRole === 'display' && (
                <div className="absolute top-2 right-4">
                    <SignOutButton />
                </div>
            )}

        </div>
    );
}
