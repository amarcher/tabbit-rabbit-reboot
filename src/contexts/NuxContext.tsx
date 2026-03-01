import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { tStatic } from '../i18n/i18n';

export interface NuxTarget {
  selector: string;
  message: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface NuxStepDef {
  id: string;
  route: string; // regex pattern to match pathname
  targets: NuxTarget[];
  advanceOn: 'action' | 'dismiss';
}

const NUX_STEPS: NuxStepDef[] = [
  {
    id: 'create-tab',
    route: '^/$',
    targets: [
      {
        selector: '[data-nux="create-tab-input"]',
        message: tStatic('nux.steps.createTab'),
        placement: 'bottom',
      },
    ],
    advanceOn: 'action',
  },
  {
    id: 'add-items',
    route: '^/tabs/',
    targets: [
      {
        selector: '[data-nux="scan-receipt-btn"]',
        message: tStatic('nux.steps.scanReceipt'),
        placement: 'bottom',
      },
      {
        selector: '[data-nux="add-item-form"]',
        message: tStatic('nux.steps.addItemManually'),
        placement: 'top',
      },
    ],
    advanceOn: 'action',
  },
  {
    id: 'add-rabbit',
    route: '^/tabs/',
    targets: [
      {
        selector: '[data-nux="add-rabbit-btn"]',
        message: tStatic('nux.steps.addRabbit'),
        placement: 'bottom',
      },
    ],
    advanceOn: 'action',
  },
  {
    id: 'assign-items',
    route: '^/tabs/',
    targets: [
      {
        selector: '[data-nux="rabbit-bar"]',
        message: tStatic('nux.steps.assignItems'),
        placement: 'bottom',
      },
    ],
    advanceOn: 'dismiss',
  },
  {
    id: 'tax-tip',
    route: '^/tabs/',
    targets: [
      {
        selector: '[data-nux="tax-tip-sliders"]',
        message: tStatic('nux.steps.taxTip'),
        placement: 'top',
      },
    ],
    advanceOn: 'dismiss',
  },
  {
    id: 'profile',
    route: '^/tabs/',
    targets: [
      {
        selector: '[data-nux="nav-profile-link"]',
        message: tStatic('nux.steps.profile'),
        placement: 'bottom',
      },
    ],
    advanceOn: 'dismiss',
  },
];

const STORAGE_KEY = 'tabbitrabbit:nux';
const TABS_KEY = 'tabbitrabbit:tabs';

interface NuxState {
  active: boolean;
  currentStep: number;
  dismissed: boolean;
}

export interface NuxContextValue {
  active: boolean;
  currentStep: NuxStepDef | null;
  stepIndex: number;
  totalSteps: number;
  advance: () => void;
  dismiss: () => void;
  dismissAll: () => void;
  completeAction: (id: string) => void;
}

const NuxContext = createContext<NuxContextValue | null>(null);

function loadState(): NuxState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: NuxState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hasExistingTabs(): boolean {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (!raw) return false;
    const tabs = JSON.parse(raw);
    return Array.isArray(tabs) && tabs.length > 0;
  } catch {
    return false;
  }
}

export function NuxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NuxState>(() => {
    const stored = loadState();
    if (stored) {
      if (stored.dismissed) return { active: false, currentStep: 0, dismissed: true };
      if (stored.active) return stored;
    }
    // No stored state: check if new user
    if (!hasExistingTabs()) {
      return { active: true, currentStep: 0, dismissed: false };
    }
    return { active: false, currentStep: 0, dismissed: false };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const advance = useCallback(() => {
    setState((prev) => {
      const next = prev.currentStep + 1;
      if (next >= NUX_STEPS.length) {
        return { active: false, currentStep: next, dismissed: true };
      }
      return { ...prev, currentStep: next };
    });
  }, []);

  const dismiss = useCallback(() => {
    advance();
  }, [advance]);

  const dismissAll = useCallback(() => {
    setState({ active: false, currentStep: 0, dismissed: true });
  }, []);

  const completeAction = useCallback(
    (id: string) => {
      const current = stateRef.current;
      if (!current.active) return;
      const step = NUX_STEPS[current.currentStep];
      if (!step) return;
      if (step.id === id && step.advanceOn === 'action') {
        advance();
      }
    },
    [advance]
  );

  const value = useMemo<NuxContextValue>(
    () => ({
      active: state.active,
      currentStep: state.active ? NUX_STEPS[state.currentStep] ?? null : null,
      stepIndex: state.currentStep,
      totalSteps: NUX_STEPS.length,
      advance,
      dismiss,
      dismissAll,
      completeAction,
    }),
    [state.active, state.currentStep, advance, dismiss, dismissAll, completeAction]
  );

  return <NuxContext.Provider value={value}>{children}</NuxContext.Provider>;
}

export function useNux(): NuxContextValue {
  const ctx = useContext(NuxContext);
  if (!ctx) throw new Error('useNux must be used within NuxProvider');
  return ctx;
}
