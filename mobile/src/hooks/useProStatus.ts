import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type EventSubscription,
  ErrorCode,
} from 'react-native-iap';
import { isProUser, setProStatus } from '../utils/proStatus';

const PRODUCT_ID = 'com.tabbitrabbit.app.pro';

export function useProStatus() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const subscriptions = useRef<EventSubscription[]>([]);

  useEffect(() => {
    let mounted = true;

    // Fast: read local pro status
    isProUser().then((pro) => {
      if (mounted) {
        setIsPro(pro);
        setLoading(false);
      }
    });

    // Slower: connect to App Store + fetch product
    (async () => {
      try {
        await initConnection();
        const products = await fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' });
        if (mounted && products?.length) {
          setProduct(products[0] as Product);
        }
      } catch {
        // App Store connection may fail in simulator / dev builds — that's OK
      }
    })();

    // Purchase listeners
    subscriptions.current.push(
      purchaseUpdatedListener(async (purchase) => {
        if (purchase.productId === PRODUCT_ID) {
          await setProStatus(true);
          if (mounted) setIsPro(true);
          await finishTransaction({ purchase });
          if (mounted) setPurchasing(false);
        }
      }),
      purchaseErrorListener((error) => {
        if (error.code !== ErrorCode.UserCancelled) {
          console.warn('IAP error:', error.code, error.message);
        }
        if (mounted) setPurchasing(false);
      }),
    );

    return () => {
      mounted = false;
      subscriptions.current.forEach((s) => s.remove());
      subscriptions.current = [];
      endConnection();
    };
  }, []);

  const purchasePro = useCallback(async () => {
    setPurchasing(true);
    try {
      await requestPurchase({
        request: { apple: { sku: PRODUCT_ID } },
        type: 'in-app',
      });
    } catch {
      setPurchasing(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    setPurchasing(true);
    try {
      const purchases = await getAvailablePurchases();
      const hasPro = purchases.some((p) => p.productId === PRODUCT_ID);
      await setProStatus(hasPro);
      setIsPro(hasPro);
      return hasPro;
    } catch {
      return false;
    } finally {
      setPurchasing(false);
    }
  }, []);

  return { isPro, loading, product, purchasing, purchasePro, restorePurchases };
}
