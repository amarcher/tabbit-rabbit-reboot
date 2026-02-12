import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Tab, Item, Rabbit, ItemRabbit } from '../types';

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

export function useTab(tabId: string | undefined) {
  const [tab, setTab] = useState<Tab | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [assignments, setAssignments] = useState<ItemRabbit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTab = useCallback(async () => {
    if (!tabId) return;
    setLoading(true);

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
      supabase
        .from('item_rabbits')
        .select('*')
        .in(
          'item_id',
          (
            await supabase
              .from('items')
              .select('id')
              .eq('tab_id', tabId)
          ).data?.map((i) => i.id) || []
        ),
    ]);

    if (tabRes.data) setTab(tabRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (rabbitsRes.data) setRabbits(rabbitsRes.data);
    if (assignRes.data) setAssignments(assignRes.data);
    setLoading(false);
  }, [tabId]);

  useEffect(() => {
    fetchTab();
  }, [fetchTab]);

  const updateTab = async (updates: Partial<Tab>) => {
    if (!tabId) return;
    const { error } = await supabase
      .from('tabs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tabId);
    if (error) throw error;
    await fetchTab();
  };

  const addItem = async (description: string, priceCents: number) => {
    if (!tabId) return;
    const { error } = await supabase
      .from('items')
      .insert({ tab_id: tabId, description, price_cents: priceCents });
    if (error) throw error;
    await fetchTab();
  };

  const updateItem = async (
    itemId: string,
    updates: { description?: string; price_cents?: number }
  ) => {
    const { error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', itemId);
    if (error) throw error;
    await fetchTab();
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) throw error;
    await fetchTab();
  };

  const addRabbit = async (name: string, color: string) => {
    if (!tabId) return;
    const { error } = await supabase
      .from('rabbits')
      .insert({ tab_id: tabId, name, color });
    if (error) throw error;
    await fetchTab();
  };

  const removeRabbit = async (rabbitId: string) => {
    const { error } = await supabase
      .from('rabbits')
      .delete()
      .eq('id', rabbitId);
    if (error) throw error;
    await fetchTab();
  };

  const toggleAssignment = async (itemId: string, rabbitId: string) => {
    const existing = assignments.find(
      (a) => a.item_id === itemId && a.rabbit_id === rabbitId
    );
    if (existing) {
      await supabase
        .from('item_rabbits')
        .delete()
        .eq('item_id', itemId)
        .eq('rabbit_id', rabbitId);
    } else {
      await supabase
        .from('item_rabbits')
        .insert({ item_id: itemId, rabbit_id: rabbitId });
    }
    await fetchTab();
  };

  return {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    fetchTab,
    updateTab,
    addItem,
    updateItem,
    deleteItem,
    addRabbit,
    removeRabbit,
    toggleAssignment,
  };
}
