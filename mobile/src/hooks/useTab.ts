import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Tab, Item, Rabbit, ItemRabbit } from '../types';

const TABS_INDEX_KEY = '@tabs';
const TAB_PREFIX = '@tab:';
const AUTO_SAVE_DELAY = 2 * 60 * 1000; // 2 minutes of inactivity

interface TabData {
  tab: Tab;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
}

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTabs = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(TABS_INDEX_KEY);
      const tabsList: Tab[] = raw ? JSON.parse(raw) : [];
      tabsList.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTabs(tabsList);
    } catch {
      setTabs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  const createTab = async (name: string) => {
    const newTab: Tab = {
      id: Crypto.randomUUID(),
      name,
      owner_id: '',
      tax_percent: 0,
      tip_percent: 0,
      receipt_image_url: null,
      created_at: new Date().toISOString(),
      share_token: Crypto.randomUUID(),
      updated_at: new Date().toISOString(),
    };

    // Save tab data
    const tabData: TabData = {
      tab: newTab,
      items: [],
      rabbits: [],
      assignments: [],
    };
    await AsyncStorage.setItem(TAB_PREFIX + newTab.id, JSON.stringify(tabData));

    // Update index
    const raw = await AsyncStorage.getItem(TABS_INDEX_KEY);
    const tabsList: Tab[] = raw ? JSON.parse(raw) : [];
    tabsList.unshift(newTab);
    await AsyncStorage.setItem(TABS_INDEX_KEY, JSON.stringify(tabsList));

    setTabs(tabsList);
    return newTab;
  };

  const deleteTab = async (tabId: string) => {
    await AsyncStorage.removeItem(TAB_PREFIX + tabId);
    const raw = await AsyncStorage.getItem(TABS_INDEX_KEY);
    let tabsList: Tab[] = raw ? JSON.parse(raw) : [];
    tabsList = tabsList.filter((t) => t.id !== tabId);
    await AsyncStorage.setItem(TABS_INDEX_KEY, JSON.stringify(tabsList));
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
  const [saving, setSaving] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // --- Load from AsyncStorage ---

  const fetchTab = useCallback(async () => {
    if (!tabId) return;
    setLoading(true);

    try {
      const raw = await AsyncStorage.getItem(TAB_PREFIX + tabId);
      if (raw) {
        const data: TabData = JSON.parse(raw);
        setTab(data.tab);
        setItems(data.items);
        setRabbits(data.rabbits);
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error('Failed to load tab:', err);
    }
    setLoading(false);
  }, [tabId]);

  useEffect(() => {
    fetchTab();
  }, [fetchTab]);

  // --- Dirty tracking & auto-save timer ---

  const markDirty = useCallback(() => {
    setIsDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      flushChanges();
    }, AUTO_SAVE_DELAY);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // --- Flush to AsyncStorage ---

  const flushChanges = useCallback(async () => {
    if (!tabId || !tab) return;

    setSaving(true);
    try {
      const data: TabData = { tab, items, rabbits, assignments };
      await AsyncStorage.setItem(TAB_PREFIX + tabId, JSON.stringify(data));

      // Also update the tab in the index
      const raw = await AsyncStorage.getItem(TABS_INDEX_KEY);
      if (raw) {
        let tabsList: Tab[] = JSON.parse(raw);
        tabsList = tabsList.map((t) => (t.id === tabId ? tab : t));
        await AsyncStorage.setItem(TABS_INDEX_KEY, JSON.stringify(tabsList));
      }

      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save changes:', err);
    } finally {
      setSaving(false);
    }
  }, [tabId, tab, items, rabbits, assignments]);

  // --- Local-first mutations ---

  const updateTab = useCallback(
    (updates: Partial<Tab>) => {
      setTab((prev) => (prev ? { ...prev, ...updates } : prev));
      markDirty();
    },
    [markDirty]
  );

  const addItem = useCallback(
    (description: string, priceCents: number) => {
      if (!tabId) return;
      const newItem: Item = {
        id: Crypto.randomUUID(),
        tab_id: tabId,
        description,
        price_cents: priceCents,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
      markDirty();
    },
    [tabId, markDirty]
  );

  const addItems = useCallback(
    (newItems: { description: string; price_cents: number }[]) => {
      if (!tabId || newItems.length === 0) return;
      const created = newItems.map((item) => ({
        id: Crypto.randomUUID(),
        tab_id: tabId,
        description: item.description,
        price_cents: item.price_cents,
        created_at: new Date().toISOString(),
      }));
      setItems((prev) => [...prev, ...created]);
      markDirty();
    },
    [tabId, markDirty]
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setAssignments((prev) => prev.filter((a) => a.item_id !== itemId));
      markDirty();
    },
    [markDirty]
  );

  const addRabbit = useCallback(
    (name: string, color: string) => {
      if (!tabId) return;
      const newRabbit: Rabbit = {
        id: Crypto.randomUUID(),
        tab_id: tabId,
        profile_id: null,
        name,
        color: color as Rabbit['color'],
        created_at: new Date().toISOString(),
      };
      setRabbits((prev) => [...prev, newRabbit]);
      markDirty();
    },
    [tabId, markDirty]
  );

  const removeRabbit = useCallback(
    (rabbitId: string) => {
      setRabbits((prev) => prev.filter((r) => r.id !== rabbitId));
      setAssignments((prev) => prev.filter((a) => a.rabbit_id !== rabbitId));
      markDirty();
    },
    [markDirty]
  );

  const toggleAssignment = useCallback(
    (itemId: string, rabbitId: string) => {
      const existing = assignments.find(
        (a) => a.item_id === itemId && a.rabbit_id === rabbitId
      );
      if (existing) {
        setAssignments((prev) =>
          prev.filter(
            (a) => !(a.item_id === itemId && a.rabbit_id === rabbitId)
          )
        );
      } else {
        setAssignments((prev) => [...prev, { item_id: itemId, rabbit_id: rabbitId }]);
      }
      markDirty();
    },
    [assignments, markDirty]
  );

  const saveChanges = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await flushChanges();
  }, [flushChanges]);

  return {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    saving,
    isDirty,
    fetchTab,
    updateTab,
    addItem,
    addItems,
    deleteItem,
    addRabbit,
    removeRabbit,
    toggleAssignment,
    saveChanges,
  };
}
