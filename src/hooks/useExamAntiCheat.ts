import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseExamAntiCheatOptions {
  enabled: boolean;
  maxViolations?: number;
  debounceMs?: number;
  onFirstWarning: (details: { reason: string; timestamp: number }) => void;
  onSecondViolation: (details: { reason: string; timestamp: number }) => Promise<void> | void;
}

export interface WarningToastState {
  visible: boolean;
  strikeNumber: number;
  title: string;
  message: string;
  reason: string;
  timestamp: number;
}

export interface UseExamAntiCheatReturn {
  violationCount: number;
  isWindowBlurred: boolean;
  isAutoSubmitting: boolean;
  warningToast: WarningToastState | null;
  dismissWarningToast: () => void;
  triggerManualViolation: (reason: string) => void;
  resetViolations: () => void;
}

/**
 * Web Audio warning tone generator
 */
function playAudioWarningBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    // Trigger haptic vibration on supported mobile devices
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Hook that listens for visibilitychange (tab switching) and blur (unfocus) events
 * during an active exam.
 * - Instance 1: Shows a prominent warning toast and triggers onFirstWarning
 * - Instance 2: Triggers onSecondViolation for automatic exam submission
 */
export function useExamAntiCheat({
  enabled,
  maxViolations = 2,
  debounceMs = 2500,
  onFirstWarning,
  onSecondViolation,
}: UseExamAntiCheatOptions): UseExamAntiCheatReturn {
  const [violationCount, setViolationCount] = useState<number>(0);
  const [isWindowBlurred, setIsWindowBlurred] = useState<boolean>(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState<boolean>(false);
  const [warningToast, setWarningToast] = useState<WarningToastState | null>(null);

  const violationCountRef = useRef<number>(0);
  const lastViolationTimeRef = useRef<number>(0);
  const isAutoSubmittingRef = useRef<boolean>(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callback refs fresh
  const onFirstWarningRef = useRef(onFirstWarning);
  onFirstWarningRef.current = onFirstWarning;

  const onSecondViolationRef = useRef(onSecondViolation);
  onSecondViolationRef.current = onSecondViolation;

  const dismissWarningToast = useCallback(() => {
    setWarningToast((prev) => (prev ? { ...prev, visible: false } : null));
  }, []);

  const resetViolations = useCallback(() => {
    violationCountRef.current = 0;
    lastViolationTimeRef.current = 0;
    isAutoSubmittingRef.current = false;
    setViolationCount(0);
    setIsAutoSubmitting(false);
    setWarningToast(null);
  }, []);

  // Main violation processor
  const handleViolation = useCallback(
    (reason: string) => {
      if (!enabled || isAutoSubmittingRef.current) return;

      const now = Date.now();
      // Debounce window: browser blur and visibilitychange often fire simultaneously
      // when a user switches tabs or navigates away
      if (now - lastViolationTimeRef.current < debounceMs) {
        return;
      }
      lastViolationTimeRef.current = now;

      const nextCount = violationCountRef.current + 1;
      violationCountRef.current = nextCount;
      setViolationCount(nextCount);

      // Play alert sound for auditory alert
      playAudioWarningBeep();

      if (nextCount === 1) {
        // INSTANCE 1: Display prominent warning toast
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }

        setWarningToast({
          visible: true,
          strikeNumber: 1,
          title: 'PROCTOR WARNING: TAB SWITCHING DETECTED (STRIKE 1 of 2)',
          message:
            'You switched browser tabs or minimized the exam window. This is your FIRST and FINAL warning.',
          reason,
          timestamp: now,
        });

        // Trigger callback for instance 1
        if (onFirstWarningRef.current) {
          onFirstWarningRef.current({ reason, timestamp: now });
        }

        // Auto-dismiss toast after 10 seconds if student doesn't close it
        toastTimeoutRef.current = setTimeout(() => {
          setWarningToast((curr) => (curr ? { ...curr, visible: false } : null));
        }, 10000);
      } else if (nextCount >= maxViolations) {
        // INSTANCE 2: Second violation -> Auto submit exam to Firebase
        isAutoSubmittingRef.current = true;
        setIsAutoSubmitting(true);

        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }

        setWarningToast({
          visible: true,
          strikeNumber: 2,
          title: 'SECURITY VIOLATION: STRIKE 2 of 2 - AUTO-SUBMITTING',
          message:
            'Second tab switch or window blur detected. Your examination is now being automatically submitted to Firebase.',
          reason,
          timestamp: now,
        });

        // Trigger callback for instance 2
        if (onSecondViolationRef.current) {
          onSecondViolationRef.current({ reason, timestamp: now });
        }
      }
    },
    [enabled, debounceMs, maxViolations]
  );

  // Expose manual violation trigger (e.g. for key-event violations or devtools)
  const triggerManualViolation = useCallback(
    (reason: string) => {
      handleViolation(reason);
    },
    [handleViolation]
  );

  // Setup event listeners for visibilitychange and blur
  useEffect(() => {
    if (!enabled) return;

    const onVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setIsWindowBlurred(true);
        handleViolation('Tab switched away or browser minimized (visibilitychange)');
      } else {
        setIsWindowBlurred(false);
      }
    };

    const onWindowBlur = () => {
      setIsWindowBlurred(true);
      handleViolation('Browser window lost focus or secondary app opened (window blur)');
    };

    const onWindowFocus = () => {
      setIsWindowBlurred(false);
    };

    // Listen for tab switching and window blur
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [enabled, handleViolation]);

  return {
    violationCount,
    isWindowBlurred,
    isAutoSubmitting,
    warningToast,
    dismissWarningToast,
    triggerManualViolation,
    resetViolations,
  };
}
