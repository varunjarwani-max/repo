import { useState, useEffect } from 'react';

/**
 * Animated count-up hook with cubic ease-out over durationMs.
 * Respects prefers-reduced-motion and guarantees the final value matches exactly.
 */
export function useCountUp(
  target: number,
  durationMs: number = 1200,
  decimals: number = 0,
  active: boolean = true
): number {
  const [val, setVal] = useState(active ? 0 : target);

  useEffect(() => {
    if (!active) {
      setVal(0);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVal(target);
      return;
    }

    let startTimestamp: number | null = null;
    let animId: number;

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const elapsed = now - startTimestamp;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = progress >= 1 ? target : parseFloat((ease * target).toFixed(decimals));
      setVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [target, durationMs, decimals, active]);

  return val;
}

export default useCountUp;
