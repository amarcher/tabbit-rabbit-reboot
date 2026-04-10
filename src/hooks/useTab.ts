import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tab, Item, Rabbit, ItemRabbit, Profile } from '../types';
import { getDefaultTaxTip } from '../utils/currency';
import { trackTabCreate } from '../utils/analytics';

// Safari does not support requestIdleCallback — fall back to a 1ms setTimeout
const scheduleIdle =
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1) as unknown as number;
const cancelIdle =
  typeof cancelIdleCallback === 'function'
    ? cancelIdleCallback
    : (id: number) => clearTimeout(id);

const TABS_INDEX_KEY = 'tabbitrabbit:tabs';
const TAB_PREFIX = 'tabbitrabbit:tab:';

interface TabData {
  tab: Tab;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
}

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTabs = useCallback(() => {
    const raw = localStorage.getItem(TABS_INDEX_KEY);
    const tabsList: Tab[] = raw ? JSON.parse(raw) : [];
    tabsList.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setTabs(tabsList);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  const createTab = async (name: string, currencyCode: string = 'USD') => {
    const defaults = getDefaultTaxTip(currencyCode);
    const newTab: Tab = {
      id: crypto.randomUUID(),
      name,
      owner_id: '',
      currency_code: currencyCode,
      tax_percent: defaults.tax,
      tip_percent: defaults.tip,
      receipt_image_url: null,
      created_at: new Date().toISOString(),
      share_token: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
    };

    // Save tab data
    const tabData: TabData = {
      tab: newTab,
      items: [],
      rabbits: [],
      assignments: [],
    };
    localStorage.setItem(TAB_PREFIX + newTab.id, JSON.stringify(tabData));

    // Update index
    const raw = localStorage.getItem(TABS_INDEX_KEY);
    const tabsList: Tab[] = raw ? JSON.parse(raw) : [];
    tabsList.unshift(newTab);
    localStorage.setItem(TABS_INDEX_KEY, JSON.stringify(tabsList));

    setTabs(tabsList);
    trackTabCreate();
    return newTab;
  };

  const deleteTab = async (tabId: string) => {
    localStorage.removeItem(TAB_PREFIX + tabId);
    const raw = localStorage.getItem(TABS_INDEX_KEY);
    let tabsList: Tab[] = raw ? JSON.parse(raw) : [];
    tabsList = tabsList.filter((t) => t.id !== tabId);
    localStorage.setItem(TABS_INDEX_KEY, JSON.stringify(tabsList));
    setTabs(tabsList);
  };

  return { tabs, loading, createTab, deleteTab, fetchTabs };
}

export function useTab(tabId: string | undefined) {
  const [tab, setTab] = useState<Tab | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [assignments, setAssignments] = useState<ItemRabbit[]>([]);
  const [loading, setLoading] = useState(true);

  const loaded = useRef(false);
  const persistTimer = useRef<number>(0);

  // Always tracks the latest state so the unmount flush can read correct values
  const latestRef = useRef({ tabId, tab, items, rabbits, assignments });
  latestRef.current = { tabId, tab, items, rabbits, assignments };

  // --- Load from localStorage ---

  const fetchTab = useCallback(() => {
    if (!tabId) return;
    setLoading(true);

    const raw = localStorage.getItem(TAB_PREFIX + tabId);
    if (raw) {
      const data: TabData = JSON.parse(raw);
      // Lazy migration: ensure currency_code exists
      if (!data.tab.currency_code) {
        data.tab.currency_code = 'USD';
      }
      setTab(data.tab);
      setItems(data.items);
      setRabbits(data.rabbits);
      setAssignments(data.assignments);
    }
    loaded.current = true;
    setLoading(false);
  }, [tabId]);

  useEffect(() => {
    fetchTab();
  }, [fetchTab]);

  // --- Persist to localStorage on every change ---
  // Batched via requestIdleCallback so rapid state changes (e.g. toggling many
  // assignments in one frame) are coalesced into a single serialization pass.

  useEffect(() => {
    if (!tabId || !tab || !loaded.current) return;

    // Cancel any pending idle persist before scheduling a new one
    if (persistTimer.current) {
      cancelIdle(persistTimer.current);
    }

    persistTimer.current = scheduleIdle(() => {
      const { tab: t, items: i, rabbits: r, assignments: a } = latestRef.current;
      if (!t) return;

      const data: TabData = { tab: t, items: i, rabbits: r, assignments: a };
      localStorage.setItem(TAB_PREFIX + tabId, JSON.stringify(data));

      // Also update the tab in the index
      const raw = localStorage.getItem(TABS_INDEX_KEY);
      if (raw) {
        let tabsList: Tab[] = JSON.parse(raw);
        tabsList = tabsList.map((entry) => (entry.id === tabId ? t : entry));
        localStorage.setItem(TABS_INDEX_KEY, JSON.stringify(tabsList));
      }
    });

    return () => {
      if (persistTimer.current) {
        cancelIdle(persistTimer.current);
      }
    };
  }, [tabId, tab, items, rabbits, assignments]);

  // --- Flush pending persist on unmount ---
  // The idle callback may not have fired yet when the user navigates away.
  // Cancel it and write synchronously so no data is lost.

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        cancelIdle(persistTimer.current);
        persistTimer.current = 0;
      }
      const { tabId: id, tab: t, items: i, rabbits: r, assignments: a } = latestRef.current;
      if (id && t && loaded.current) {
        const data: TabData = { tab: t, items: i, rabbits: r, assignments: a };
        localStorage.setItem(TAB_PREFIX + id, JSON.stringify(data));

        const raw = localStorage.getItem(TABS_INDEX_KEY);
        if (raw) {
          let tabsList: Tab[] = JSON.parse(raw);
          tabsList = tabsList.map((entry) => (entry.id === id ? t : entry));
          localStorage.setItem(TABS_INDEX_KEY, JSON.stringify(tabsList));
        }
      }
    };
  }, []);

  // --- Local-first mutations ---

  const updateTab = useCallback(
    (updates: Partial<Tab>) => {
      setTab((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    []
  );

  const addItem = useCallback(
    (description: string, priceCents: number) => {
      if (!tabId) return;
      const newItem: Item = {
        id: crypto.randomUUID(),
        tab_id: tabId,
        description,
        price_cents: priceCents,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
    },
    [tabId]
  );

  const addItems = useCallback(
    (newItems: { description: string; price_cents: number }[]) => {
      if (!tabId || newItems.length === 0) return;
      const created = newItems.map((item) => ({
        id: crypto.randomUUID(),
        tab_id: tabId,
        description: item.description,
        price_cents: item.price_cents,
        created_at: new Date().toISOString(),
      }));
      setItems((prev) => [...prev, ...created]);
    },
    [tabId]
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setAssignments((prev) => prev.filter((a) => a.item_id !== itemId));
    },
    []
  );

  const addRabbit = useCallback(
    (name: string, color: string, profile?: Profile) => {
      if (!tabId) return;
      const newRabbit: Rabbit = {
        id: crypto.randomUUID(),
        tab_id: tabId,
        profile_id: profile?.id || null,
        name,
        color: color as Rabbit['color'],
        created_at: new Date().toISOString(),
        profile,
      };
      setRabbits((prev) => [...prev, newRabbit]);
    },
    [tabId]
  );

  const removeRabbit = useCallback(
    (rabbitId: string) => {
      setRabbits((prev) => prev.filter((r) => r.id !== rabbitId));
      setAssignments((prev) => prev.filter((a) => a.rabbit_id !== rabbitId));
    },
    []
  );

  const toggleAssignment = useCallback(
    (itemId: string, rabbitId: string) => {
      setAssignments((prev) => {
        const exists = prev.some(
          (a) => a.item_id === itemId && a.rabbit_id === rabbitId
        );
        if (exists) {
          return prev.filter(
            (a) => !(a.item_id === itemId && a.rabbit_id === rabbitId)
          );
        }
        return [...prev, { item_id: itemId, rabbit_id: rabbitId }];
      });
    },
    []
  );

  const applyAssignments = useCallback(
    (newAssignments: ItemRabbit[]) => {
      setAssignments((prev) => {
        const result = [...prev];
        for (const na of newAssignments) {
          const idx = result.findIndex(
            (a) => a.item_id === na.item_id && a.rabbit_id === na.rabbit_id
          );
          if (idx >= 0) {
            // Update existing assignment (e.g. share changed)
            result[idx] = na;
          } else {
            result.push(na);
          }
        }
        return result;
      });
    },
    []
  );

  return {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    fetchTab,
    updateTab,
    addItem,
    addItems,
    deleteItem,
    addRabbit,
    removeRabbit,
    toggleAssignment,
    applyAssignments,
  };
}
