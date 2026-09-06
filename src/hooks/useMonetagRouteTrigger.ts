import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export interface MonetagRouteTriggerState {
  /** Unique key string that changes on every route transition to force React remount */
  adKey: string;
  /** Counter of route transitions since app launch */
  transitionCount: number;
  /** Current route pathname */
  pathname: string;
  /** True if user is currently inside an active timed exam attempt screen */
  isExamAttempt: boolean;
  /** Manually trigger a fresh ad re-mount without navigating */
  reinitializeAds: () => void;
}

// Global sequence counter to ensure adKey uniqueness across remounts
let globalRouteCounter = 0;

/**
 * useMonetagRouteTrigger
 *
 * Hook for AppLayout or Router setups that forces Monetag ad containers
 * to cleanly re-initialize and re-mount on every route transition.
 *
 * When the route changes (pathname or search parameters):
 * 1. Generates a fresh `adKey`. When passed as `key={adKey}` to Monetag ad components,
 *    React's reconciliation forces a complete unmount of the old container (running cleanups)
 *    and mounts a brand new DOM container with fresh scripts and creative rotations.
 * 2. Purges any stale Monetag script tags or leftover overlay artifacts from previous views.
 * 3. Skips re-initialization during active timed exam attempts (/student/exam/*) to guarantee
 *    a distraction-free exam environment.
 */
export function useMonetagRouteTrigger(): MonetagRouteTriggerState {
  const location = useLocation();
  const previousPathRef = useRef<string>(location.pathname + location.search);

  // Check if current route is an active timed exam attempt
  const isExamAttempt = location.pathname.startsWith('/student/exam/');

  const generateAdKey = useCallback((routePath: string, counter: number) => {
    // Sanitize path for use as a DOM/React key
    const cleanPath = routePath.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    return `monetag-ad-${counter}-${cleanPath}-${Date.now()}`;
  }, []);

  const [transitionCount, setTransitionCount] = useState<number>(() => {
    globalRouteCounter += 1;
    return globalRouteCounter;
  });

  const [adKey, setAdKey] = useState<string>(() =>
    generateAdKey(location.pathname, globalRouteCounter)
  );

  // Manual trigger method to reinitialize ads on demand
  const reinitializeAds = useCallback(() => {
    globalRouteCounter += 1;
    setTransitionCount(globalRouteCounter);
    setAdKey(generateAdKey(location.pathname, globalRouteCounter));

    // Clean up any stale global Monetag elements
    cleanupOrphanedMonetagScripts();
  }, [location.pathname, generateAdKey]);

  useEffect(() => {
    const currentPath = location.pathname + location.search;

    // Track every route transition
    if (previousPathRef.current !== currentPath) {
      previousPathRef.current = currentPath;

      globalRouteCounter += 1;
      setTransitionCount(globalRouteCounter);
      setAdKey(generateAdKey(location.pathname, globalRouteCounter));

      // Clean up previous page's Monetag script artifacts if not on exam attempt
      if (!isExamAttempt) {
        cleanupOrphanedMonetagScripts();
      }
    }
  }, [location.pathname, location.search, location.key, isExamAttempt, generateAdKey]);

  return {
    adKey,
    transitionCount,
    pathname: location.pathname,
    isExamAttempt,
    reinitializeAds,
  };
}

/**
 * Helper to clean up any orphaned or duplicate Monetag script tags
 * that might linger in the document head/body from prior page mounts.
 */
function cleanupOrphanedMonetagScripts(): void {
  if (typeof document === 'undefined') return;

  try {
    // Select any lingering Monetag tags with specific zones or origins
    const staleScripts = document.querySelectorAll(
      'script[data-zone="8842145"], script[data-zone="11737972"], script[src*="alwingulla.com"], script[src*="n6wxm.com"]'
    );

    staleScripts.forEach((el) => {
      // Remove stale scripts to allow fresh tags to execute cleanly
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  } catch {
    // Graceful no-op in restricted sandbox environments
  }
}
