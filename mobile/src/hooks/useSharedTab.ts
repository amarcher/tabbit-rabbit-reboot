import { useEffect, useState } from 'react';
import { decodeBill, isLegacyToken, type SharedTabData } from '../utils/billEncoder';

export type { SharedTabData };

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

    if (isLegacyToken(shareToken)) {
      const decoded = decodeBill(shareToken);
      if (decoded) {
        setData(decoded);
      } else {
        setError('Could not decode bill data');
      }
      setLoading(false);
      return;
    }

    fetch(`https://tabbitrabbit.com/api/bill/${shareToken}`)
      .then((res) => {
        if (!res.ok) throw new Error('Bill not found');
        return res.json();
      })
      .then((bill) => setData(bill))
      .catch(() => setError('Could not load bill'))
      .finally(() => setLoading(false));
  }, [shareToken]);

  return { data, loading, error };
}
