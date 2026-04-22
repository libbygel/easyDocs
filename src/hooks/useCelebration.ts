import { useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationOptions {
  enabled?: boolean;
}

export function useCelebration(options: CelebrationOptions = {}) {
  const { enabled = true } = options;
  const hasTriggered = useRef(false);

  const triggerCelebration = useCallback(() => {
    if (!enabled) return;
    
    // Launch confetti from both sides
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
      });
      
      // Confetti from right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
      });
    }, 250);

    return () => clearInterval(interval);
  }, [enabled]);

  const triggerOnce = useCallback(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;
    triggerCelebration();
  }, [triggerCelebration]);

  const reset = useCallback(() => {
    hasTriggered.current = false;
  }, []);

  return { triggerCelebration, triggerOnce, reset };
}

/**
 * Checks if all required documents are approved
 */
export function areAllDocumentsApproved(
  documents: Array<{ required: boolean; review_status: string }>
): boolean {
  const requiredDocs = documents.filter(d => d.required);
  if (requiredDocs.length === 0) return false;
  return requiredDocs.every(d => d.review_status === 'תקין');
}
