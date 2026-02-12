import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface SharedTab {
  name: string;
  tax_percent: number;
  tip_percent: number;
}

interface SharedItem {
  id: string;
  description: string;
  price_cents: number;
}

interface SharedRabbit {
  id: string;
  name: string;
  color: string;
}

interface SharedAssignment {
  item_id: string;
  rabbit_id: string;
}

interface OwnerProfile {
  display_name: string | null;
  venmo_username: string | null;
  cashapp_cashtag: string | null;
  paypal_username: string | null;
}

export interface SharedTabData {
  tab: SharedTab;
  items: SharedItem[];
  rabbits: SharedRabbit[];
  assignments: SharedAssignment[];
  ownerProfile: OwnerProfile;
}

export function useSharedTab(shareToken: string | undefined) {
  const [data, setData] = useState<SharedTabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setLoading(false);
      setError('No share token provided');
      return;
    }

    async function fetchSharedTab() {
      setLoading(true);
      setError(null);

      const { data: result, error: rpcError } = await supabase.rpc('get_shared_tab', {
        p_share_token: shareToken,
      });

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      if (!result) {
        setError('Bill not found');
        setLoading(false);
        return;
      }

      setData({
        tab: result.tab,
        items: result.items || [],
        rabbits: result.rabbits || [],
        assignments: result.assignments || [],
        ownerProfile: result.owner_profile,
      });
      setLoading(false);
    }

    fetchSharedTab();
  }, [shareToken]);

  return { data, loading, error };
}
