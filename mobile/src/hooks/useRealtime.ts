import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useRealtime(tabId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!tabId) return;

    const channel = supabase
      .channel(`tab-${tabId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `tab_id=eq.${tabId}` },
        onUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rabbits', filter: `tab_id=eq.${tabId}` },
        onUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'item_rabbits' },
        onUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tabId, onUpdate]);
}
