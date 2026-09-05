import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Monetag Real Banner Ad Integration
 * 
 * Requirements:
 * 1. Present on every single page except active exam-attempt screen (/student/exam/:examId).
 * 2. Uses real Monetag web ad script/tag (zone configuration).
 * 3. Consistent visual placement in layout without overlapping buttons or forms.
 * 4. Graceful collapse on load failure (zero broken gap).
 */
export const MonetagBannerAd: React.FC = () => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);
  const [isRendered, setIsRendered] = useState<boolean>(false);

  // STRICT REQUIREMENT: The active Exam-Attempt page where student is actively
  // answering timed questions MUST remain completely free of any ad.
  const isExamAttempt = location.pathname.startsWith('/student/exam/');

  useEffect(() => {
    if (isExamAttempt) {
      return;
    }

    setLoadFailed(false);
    setIsRendered(false);

    const container = containerRef.current;
    if (!container) return;

    // Reset container contents
    container.innerHTML = '';

    // Create ad wrapper container
    const adWrapper = document.createElement('div');
    adWrapper.id = `monetag-banner-zone-${Date.now()}`;
    adWrapper.className = 'w-full flex items-center justify-center min-h-[50px] sm:min-h-[90px]';

    // Inject Monetag real publisher script tag
    const script = document.createElement('script');
    script.src = 'https://alwingulla.com/88/tag.min.js';
    script.setAttribute('data-zone', '8842145');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    // Handle load success & error
    script.onload = () => {
      setIsRendered(true);
    };

    script.onerror = () => {
      // Gracefully collapse the container if script is blocked or fails to load
      setLoadFailed(true);
    };

    adWrapper.appendChild(script);
    container.appendChild(adWrapper);

    // Timeout safety: if ad script does not render or is blocked by network/adblocker, collapse smoothly
    const timeout = setTimeout(() => {
      if (container) {
        // Check if any child elements or iframes were generated
        const hasVisibleAd = container.offsetHeight > 20 || container.querySelector('iframe, img, a, div');
        if (!hasVisibleAd) {
          // Keep collapsed if nothing rendered
          setLoadFailed(true);
        } else {
          setIsRendered(true);
        }
      }
    }, 3500);

    return () => {
      clearTimeout(timeout);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [location.pathname, isExamAttempt]);

  // Completely omit on active exam attempt or when ad fails to load
  if (isExamAttempt || loadFailed) {
    return null;
  }

  return (
    <div
      aria-label="Sponsored Advertisement"
      className="w-full bg-[#F3EFE6]/60 border-t border-b border-[#E5DFD3] transition-all duration-300 py-2.5 px-4 overflow-hidden z-20"
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
        {/* Ad container holding Monetag zone script */}
        <div
          ref={containerRef}
          className="w-full max-w-[728px] min-h-[50px] sm:min-h-[90px] flex items-center justify-center overflow-hidden"
        />
      </div>
    </div>
  );
};
