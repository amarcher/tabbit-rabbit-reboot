import { useEffect, useState } from 'react';
import { decodeBill, type SharedTabData } from '../utils/billEncoder';

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

    const decoded = decodeBill(shareToken);
    if (decoded) {
      setData(decoded);
    } else {
      setError('Could not decode bill data');
    }
    setLoading(false);
  }, [shareToken]);

  return { data, loading, error };
}
