'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';

interface TickerMessage {
  id: string;
  text: string;
  position: number;
}

interface TickerBarProps {
  centerId: string;
  speed?: number; // pixels per second (default: 50)
  className?: string;
}

export default function TickerBar({
  centerId,
  speed = 50,
  className = '',
}: TickerBarProps) {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const singleSetRef = useRef<HTMLDivElement>(null);
  const [singleSetWidth, setSingleSetWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(`/api/display/ticker?centerId=${centerId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error fetching ticker messages:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMessages();

    // Refresh messages every 5 minutes
    const interval = setInterval(fetchMessages, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [centerId]);

  // Measure widths after messages load
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        if (singleSetRef.current) {
          setSingleSetWidth(singleSetRef.current.offsetWidth);
        }
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Calculate how many copies we need to fill the screen + extra for seamless loop
  const copies = useMemo(() => {
    if (singleSetWidth === 0 || containerWidth === 0) return 3;
    // We need enough copies to fill at least 2x the container width
    const needed = Math.ceil((containerWidth * 2) / singleSetWidth) + 1;
    return Math.max(needed, 3);
  }, [singleSetWidth, containerWidth]);

  // Calculate animation duration based on single set width and speed
  const animationDuration = useMemo(() => {
    if (singleSetWidth === 0) return 20;
    return Math.max(singleSetWidth / speed, 5);
  }, [singleSetWidth, speed]);

  if (isLoading || messages.length === 0) {
    return null;
  }

  // Single set of messages with separators
  const MessageSet = ({ measureRef }: { measureRef?: React.Ref<HTMLDivElement> }) => (
    <div ref={measureRef} className="flex items-center flex-shrink-0">
      {messages.map((message) => (
        <span key={message.id} className="flex items-center flex-shrink-0">
          <span className="whitespace-nowrap px-8 text-[#FEDD2C] font-bold text-2xl">
            {message.text}
          </span>
          <Image
            src="/logo_videos.png"
            alt=""
            width={36}
            height={36}
            className="flex-shrink-0 mx-4"
          />
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`w-full h-[100px] bg-black overflow-hidden flex items-center ${className}`}
    >
      <div
        className="flex items-center"
        style={{
          animation: singleSetWidth > 0
            ? `tickerScroll ${animationDuration}s linear infinite`
            : 'none',
        }}
      >
        {/* First copy is used for measurement */}
        <MessageSet measureRef={singleSetRef} />

        {/* Additional copies to fill the space */}
        {Array.from({ length: copies - 1 }).map((_, i) => (
          <MessageSet key={i} />
        ))}
      </div>

      <style>{`
        @keyframes tickerScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-${singleSetWidth}px);
          }
        }
      `}</style>
    </div>
  );
}
