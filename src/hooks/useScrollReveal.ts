import { useRef } from 'react';
import { useInView } from 'framer-motion';

/**
 * Returns a ref and a boolean indicating whether the element
 * has scrolled into the viewport. Once visible it stays visible.
 */
export function useScrollReveal(options?: { amount?: number; once?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    amount: options?.amount ?? 0.15,
    once: options?.once ?? true,
  });
  return { ref, isInView };
}
