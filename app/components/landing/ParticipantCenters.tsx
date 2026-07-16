'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface ParticipantCenter {
  id: string;
  name: string;
  logo_url: string;
}

interface ParticipantCentersResponse {
  centers: ParticipantCenter[];
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function CenterList({
  centers,
  duplicate = false,
}: {
  centers: ParticipantCenter[];
  duplicate?: boolean;
}) {
  return (
    <ul
      className="participant-centers-group"
      aria-hidden={duplicate ? true : undefined}
    >
      {centers.map((center) => (
        <li
          key={`${duplicate ? 'duplicate-' : ''}${center.id}`}
          className="flex shrink-0 items-center gap-3"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/80">
            <Image
              src={center.logo_url}
              alt=""
              fill
              sizes="44px"
              className="object-contain p-1.5"
            />
          </div>
          <span className="max-w-64 whitespace-nowrap text-base font-semibold text-[#111827]">
            {center.name}
          </span>
          <span
            aria-hidden="true"
            className="ml-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F91248]/70"
          />
        </li>
      ))}
    </ul>
  );
}

export default function ParticipantCenters() {
  const [centers, setCenters] = useState<ParticipantCenter[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchCenters = async () => {
      try {
        const response = await fetch('/api/landing/centers');
        if (!response.ok) {
          throw new Error('Error carregant els centres participants');
        }

        const data = (await response.json()) as ParticipantCentersResponse;
        if (isMounted) {
          setCenters(data.centers);
        }
      } catch (error) {
        console.error('Error carregant els centres participants:', error);
      }
    };

    fetchCenters();
    const interval = window.setInterval(fetchCenters, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (centers.length === 0) {
    return null;
  }

  const shouldAnimate = centers.length > 1;

  return (
    <section
      aria-labelledby="participant-centers-title"
      className="participant-centers-section overflow-hidden border-y border-[#374151] py-10"
    >
      <div className="mx-auto mb-6 max-w-6xl px-6 text-center">
        <h2
          id="participant-centers-title"
          className="text-2xl font-bold text-white sm:text-3xl"
        >
          Centres participants
        </h2>
        <p className="mt-2 text-sm font-medium text-white/75">
          {centers.length} {centers.length === 1 ? 'centre' : 'centres'}
        </p>
      </div>

      <div className="mx-auto max-w-[96rem] px-4 sm:px-6">
        <div
          className={`participant-centers-viewport rounded-full border border-white/20 bg-white/95 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm ${
            shouldAnimate ? 'participant-centers-animated' : ''
          }`}
          tabIndex={0}
          aria-label="Llista de centres participants"
        >
          <div className="participant-centers-track">
            <CenterList centers={centers} />
            {shouldAnimate && <CenterList centers={centers} duplicate />}
          </div>
        </div>
      </div>
    </section>
  );
}
