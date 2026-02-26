import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useNux } from '../contexts/NuxContext';
import type { NuxTarget } from '../contexts/NuxContext';
import NuxBubble from './NuxBubble';
import '../styles/nux.css';

interface FoundTarget {
  element: Element;
  target: NuxTarget;
}

export default function NuxOverlay() {
  const { active, currentStep, stepIndex, totalSteps, dismiss, dismissAll } = useNux();
  const location = useLocation();
  const [foundTargets, setFoundTargets] = useState<FoundTarget[]>([]);
  const spotlightedRef = useRef<Set<Element>>(new Set());

  // Clean up spotlight classes
  const clearSpotlights = useCallback(() => {
    spotlightedRef.current.forEach((el) => el.classList.remove('nux-spotlight'));
    spotlightedRef.current.clear();
  }, []);

  useEffect(() => {
    if (!active || !currentStep) {
      clearSpotlights();
      setFoundTargets([]);
      return;
    }

    // Check if route matches
    const routeMatch = new RegExp(currentStep.route).test(location.pathname);
    if (!routeMatch) {
      clearSpotlights();
      setFoundTargets([]);
      return;
    }

    const queryTargets = () => {
      const found: FoundTarget[] = [];
      for (const target of currentStep.targets) {
        const el = document.querySelector(target.selector);
        if (el) {
          found.push({ element: el, target });
        }
      }
      return found;
    };

    // Try immediately
    const initial = queryTargets();
    if (initial.length > 0) {
      clearSpotlights();
      initial.forEach((f) => {
        f.element.classList.add('nux-spotlight');
        spotlightedRef.current.add(f.element);
      });
      setFoundTargets(initial);
      return;
    }

    // Use MutationObserver to retry when DOM updates
    const observer = new MutationObserver(() => {
      const found = queryTargets();
      if (found.length > 0) {
        observer.disconnect();
        clearSpotlights();
        found.forEach((f) => {
          f.element.classList.add('nux-spotlight');
          spotlightedRef.current.add(f.element);
        });
        setFoundTargets(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [active, currentStep, location.pathname, clearSpotlights]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearSpotlights();
  }, [clearSpotlights]);

  if (!active || !currentStep || foundTargets.length === 0) return null;

  return (
    <AnimatePresence>
      {foundTargets.map((ft) => (
        <NuxBubble
          key={ft.target.selector}
          target={ft.element}
          message={ft.target.message}
          placement={ft.target.placement}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          showDismiss={currentStep.advanceOn === 'dismiss'}
          onDismiss={dismiss}
          onSkipAll={dismissAll}
        />
      ))}
    </AnimatePresence>
  );
}
