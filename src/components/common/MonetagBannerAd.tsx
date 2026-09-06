import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Monetag Banner Ad Unit
 * 
 * Strict User Requirement: "only monetag banner ads hii dikhna hei"
 * Renders ONLY the official Monetag banner publisher tag (Zone 8842145).
 * Completely omits any custom or simulated sponsor cards.
 * 
 * Features:
 * 1. Appears across the application layout (except during active timed exam attempts).
 * 2. Re-mounts cleanly on every route transition using refreshTrigger / route hooks.
 * 3. Mounts the real Monetag publisher script tag (Zone 8842145).
 */

export interface MonetagBannerAdProps {
  className?: string;
  refreshTrigger?: string | number;
}

let globalAdImpressionCounter = 0;

export const MonetagBannerAd: React.FC<MonetagBannerAdProps> = ({
  className = '',
  refreshTrigger,
}) => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [adMounted, setAdMounted] = useState<boolean>(false);

  // STRICT REQUIREMENT: Active timed student exam attempt screen MUST remain completely distraction-free
  const isExamAttempt = location.pathname.startsWith('/student/exam/');

  useEffect(() => {
    if (isExamAttempt) {
      return;
    }

    globalAdImpressionCounter += 1;
    const container = containerRef.current;
    if (!container) return;

    // Purge previous ad scripts and elements
    container.innerHTML = '';

    // Create container element for Monetag Banner
    const adWrapper = document.createElement('div');
    adWrapper.id = `monetag-banner-${Date.now()}-${globalAdImpressionCounter}`;
    adWrapper.className = 'w-full flex items-center justify-center min-h-[60px] sm:min-h-[90px]';

    // Official Monetag publisher script tag
    const script = document.createElement('script');
    script.src = `https://alwingulla.com/88/tag.min.js?cb=${Date.now()}`;
    script.setAttribute('data-zone', '8842145');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    script.onload = () => {
      setAdMounted(true);
    };

    script.onerror = () => {
      setAdMounted(false);
    };

    adWrapper.appendChild(script);
    container.appendChild(adWrapper);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [location.pathname, location.search, isExamAttempt, refreshTrigger]);

  if (isExamAttempt) {
    return null;
  }

  return (
    <aside
      aria-label="Advertisement Banner"
      className={`w-full my-3 px-3 sm:px-6 ${className}`.trim()}
    >
      <div className="max-w-7xl mx-auto flex justify-center items-center">
        {/* Real Monetag Banner Ad Container ONLY */}
        <div
          ref={containerRef}
          id="monetag-banner-zone-8842145"
          className="w-full flex items-center justify-center min-h-[50px] sm:min-h-[90px] overflow-hidden"
        />
      </div>
    </aside>
  );
};

