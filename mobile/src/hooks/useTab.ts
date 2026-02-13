import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { supabase } from '../supabaseClient';
import type { Tab, Item, Rabbit, ItemRabbit } from '../types';

const AUTO_SAVE_DELAY = 2 * 60 * 1000; // 2 minutes of inactivity

export function useTabs(userId: string | undefined) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTabs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tabs')
      .select('*, rabbits(count)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setTabs(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  const createTab = async (name: string) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('tabs')
      .insert({ name, owner_id: userId })
      .select()
      .single();
    if (error) throw error;
    await fetchTabs();
    return data as Tab;
  };

  const deleteTab = async (tabId: string) => {
    const { error } = await supabase.from('tabs').delete().eq('id', tabId);
    if (error) throw error;
    await fetchTabs();
  };

  return { tabs, loading, createTab, deleteTab, fetchTabs };
}

// --- Pending changes tracking ---

interface PendingChanges {
  newItems: Item[];
  deletedItemIds: Set<string>;
  newRabbits: Rabbit[];
  deletedRabbitIds: Set<string>;
  addedAssignments: ItemRabbit[];
  removedAssignments: ItemRabbit[];
  tabUpdates: Partial<Tab>;
}

function emptyPending(): PendingChanges {
  return {
    newItems: [],
    deletedItemIds: new Set(),
    newRabbits: [],
    deletedRabbitIds: new Set(),
    addedAssignments: [],
    removedAssignments: [],
    tabUpdates: {},
  };
}

function hasPendingChanges(p: PendingChanges): boolean {
  return (
    p.newItems.length > 0 ||
    p.deletedItemIds.size > 0 ||
    p.newRabbits.length > 0 ||
    p.deletedRabbitIds.size > 0 ||
    p.addedAssignments.length > 0 ||
    p.removedAssignments.length > 0 ||
    Object.keys(p.tabUpdates).length > 0
  );
}

export function useTab(tabId: string | undefined) {
  const [tab, setTab] = useState<Tab | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [assignments, setAssignments] = useState<ItemRabbit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pending = useRef<PendingChanges>(emptyPending());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // --- Fetch from DB (initial load only) ---

  const fetchTab = useCallback(async () => {
    if (!tabId) return;
    setLoading(true);

    const itemIds =
      (await supabase.from('items').select('id').eq('tab_id', tabId)).data?.map(
        (i) => i.id
      ) || [];

    const [tabRes, itemsRes, rabbitsRes, assignRes] = await Promise.all([
      supabase.from('tabs').select('*').eq('id', tabId).single(),
      supabase
        .from('items')
        .select('*')
        .eq('tab_id', tabId)
        .order('created_at'),
      supabase
        .from('rabbits')
        .select('*, profile:profiles(*)')
        .eq('tab_id', tabId)
        .order('created_at'),
      itemIds.length > 0
        ? supabase
            .from('item_rabbits')
            .select('*')
            .in('item_id', itemIds)
        : Promise.resolve({ data: [] as ItemRabbit[] }),
    ]);

    if (tabRes.data) setTab(tabRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (rabbitsRes.data) setRabbits(rabbitsRes.data);
    if (assignRes.data) setAssignments(assignRes.data!);
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

  // --- Flush pending changes to DB ---

  const flushChanges = useCallback(async () => {
    const p = pending.current;
    if (!tabId || !hasPendingChanges(p)) return;

    setSaving(true);
    try {
      const promises: PromiseLike<unknown>[] = [];

      if (Object.keys(p.tabUpdates).length > 0) {
        promises.push(
          supabase
            .from('tabs')
            .update({ ...p.tabUpdates, updated_at: new Date().toISOString() })
            .eq('id', tabId)
            .then()
        );
      }

      if (p.newItems.length > 0) {
        promises.push(
          supabase.from('items').insert(
            p.newItems.map((item) => ({
              id: item.id,
              tab_id: tabId,
              description: item.description,
              price_cents: item.price_cents,
            }))
          ).then()
        );
      }

      if (p.deletedItemIds.size > 0) {
        promises.push(
          supabase
            .from('items')
            .delete()
            .in('id', Array.from(p.deletedItemIds))
            .then()
        );
      }

      if (p.newRabbits.length > 0) {
        promises.push(
          supabase.from('rabbits').insert(
            p.newRabbits.map((r) => ({
              id: r.id,
              tab_id: tabId,
              name: r.name,
              color: r.color,
              profile_id: r.profile_id,
            }))
          ).then()
        );
      }

      if (p.deletedRabbitIds.size > 0) {
        promises.push(
          supabase
            .from('rabbits')
            .delete()
            .in('id', Array.from(p.deletedRabbitIds))
            .then()
        );
      }

      await Promise.all(promises);

      if (p.addedAssignments.length > 0) {
        await supabase.from('item_rabbits').insert(p.addedAssignments);
      }

      for (const a of p.removedAssignments) {
        await supabase
          .from('item_rabbits')
          .delete()
          .eq('item_id', a.item_id)
          .eq('rabbit_id', a.rabbit_id);
      }

      pending.current = emptyPending();
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save changes:', err);
    } finally {
      setSaving(false);
    }
  }, [tabId]);

  // --- Local-first mutations ---

  const updateTab = useCallback(
    (updates: Partial<Tab>) => {
      setTab((prev) => (prev ? { ...prev, ...updates } : prev));
      pending.current.tabUpdates = {
        ...pending.current.tabUpdates,
        ...updates,
      };
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
      pending.current.newItems.push(newItem);
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
      pending.current.newItems.push(...created);
      markDirty();
    },
    [tabId, markDirty]
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setAssignments((prev) => prev.filter((a) => a.item_id !== itemId));
      const idx = pending.current.newItems.findIndex((i) => i.id === itemId);
      if (idx >= 0) {
        pending.current.newItems.splice(idx, 1);
      } else {
        pending.current.deletedItemIds.add(itemId);
      }
      pending.current.addedAssignments = pending.current.addedAssignments.filter(
        (a) => a.item_id !== itemId
      );
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
      pending.current.newRabbits.push(newRabbit);
      markDirty();
    },
    [tabId, markDirty]
  );

  const removeRabbit = useCallback(
    (rabbitId: string) => {
      setRabbits((prev) => prev.filter((r) => r.id !== rabbitId));
      setAssignments((prev) => prev.filter((a) => a.rabbit_id !== rabbitId));
      const idx = pending.current.newRabbits.findIndex(
        (r) => r.id === rabbitId
      );
      if (idx >= 0) {
        pending.current.newRabbits.splice(idx, 1);
      } else {
        pending.current.deletedRabbitIds.add(rabbitId);
      }
      pending.current.addedAssignments =
        pending.current.addedAssignments.filter(
          (a) => a.rabbit_id !== rabbitId
        );
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
        const addIdx = pending.current.addedAssignments.findIndex(
          (a) => a.item_id === itemId && a.rabbit_id === rabbitId
        );
        if (addIdx >= 0) {
          pending.current.addedAssignments.splice(addIdx, 1);
        } else {
          pending.current.removedAssignments.push({ item_id: itemId, rabbit_id: rabbitId });
        }
      } else {
        const newAssignment = { item_id: itemId, rabbit_id: rabbitId };
        setAssignments((prev) => [...prev, newAssignment]);
        const rmIdx = pending.current.removedAssignments.findIndex(
          (a) => a.item_id === itemId && a.rabbit_id === rabbitId
        );
        if (rmIdx >= 0) {
          pending.current.removedAssignments.splice(rmIdx, 1);
        } else {
          pending.current.addedAssignments.push(newAssignment);
        }
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
