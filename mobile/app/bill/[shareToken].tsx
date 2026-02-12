import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useSharedTab } from '@/src/hooks/useSharedTab';
import { useBillCache } from '@/src/hooks/useBillCache';
import { formatCents } from '@/src/utils/currency';
import { getGradientColors } from '@/src/utils/colors';
import { venmoLink, cashAppLink, paypalLink, buildPaymentNote } from '@/src/utils/payments';
import { COLOR_HEX, RabbitColor } from '@/src/types';

export default function SharedBillScreen() {
  const { shareToken } = useLocalSearchParams<{ shareToken: string }>();
  const { data, loading, error } = useSharedTab(shareToken);
  const { cacheBill } = useBillCache();

  // Cache bill on load
  useEffect(() => {
    if (data && shareToken) {
      cacheBill(shareToken, data);
    }
  }, [data, shareToken, cacheBill]);

  const totals = useMemo(() => {
    if (!data) return [];
    const { items, rabbits, assignments, tab } = data;

    return rabbits.map((rabbit) => {
      const rabbitItemIds = assignments
        .filter((a) => a.rabbit_id === rabbit.id)
        .map((a) => a.item_id);

      let subtotal = 0;
      for (const itemId of rabbitItemIds) {
        const item = items.find((i) => i.id === itemId);
        if (!item) continue;
        const numSplitters = assignments.filter(
          (a) => a.item_id === itemId
        ).length;
        subtotal += item.price_cents / numSplitters;
      }

      const tax = subtotal * (tab.tax_percent / 100);
      const tip = subtotal * (tab.tip_percent / 100);

      return {
        rabbit,
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        tip: Math.round(tip),
        total: Math.round(subtotal + tax + tip),
      };
    });
  }, [data]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Bill not found'}</Text>
      </View>
    );
  }

  const { tab, items, rabbits, assignments, ownerProfile } = data;
  const subtotalCents = items.reduce((sum, i) => sum + i.price_cents, 0);
  const taxAmount = Math.round(subtotalCents * (tab.tax_percent / 100));
  const tipAmount = Math.round(subtotalCents * (tab.tip_percent / 100));
  const grandTotal = subtotalCents + taxAmount + tipAmount;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.tabName}>{tab.name}</Text>
      {ownerProfile.display_name && (
        <Text style={styles.ownerName}>by {ownerProfile.display_name}</Text>
      )}

      {/* Items */}
      <View style={styles.itemsList}>
        {items.map((item) => {
          const itemRabbitIds = assignments
            .filter((a) => a.item_id === item.id)
            .map((a) => a.rabbit_id);
          const assignedColors = rabbits
            .filter((r) => itemRabbitIds.includes(r.id))
            .map((r) => r.color as RabbitColor);
          const gradientColors = getGradientColors(assignedColors);

          return (
            <LinearGradient
              key={item.id}
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.itemRow}
            >
              <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.itemPrice}>{formatCents(item.price_cents)}</Text>
            </LinearGradient>
          );
        })}
      </View>

      {/* Per-rabbit totals */}
      {totals.length > 0 && (
        <View style={styles.breakdownList}>
          {totals.map(({ rabbit, subtotal, tax, tip, total }) => (
            <View
              key={rabbit.id}
              style={[
                styles.breakdownItem,
                { backgroundColor: COLOR_HEX[rabbit.color as RabbitColor] || '#f8f9fa' },
              ]}
            >
              <View style={styles.breakdownLeft}>
                <Text style={styles.rabbitName}>{rabbit.name}</Text>
                <Text style={styles.breakdownDetail}>
                  {formatCents(subtotal)} + {formatCents(tax)} tax + {formatCents(tip)} tip
                </Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={styles.rabbitTotal}>{formatCents(total)}</Text>
                {/* Payment buttons using owner's profile */}
                <View style={styles.paymentButtons}>
                  {ownerProfile.venmo_username && (
                    <TouchableOpacity
                      style={[styles.payBtn, styles.venmoBtn]}
                      onPress={() =>
                        Linking.openURL(
                          venmoLink(
                            ownerProfile.venmo_username!,
                            total / 100,
                            buildPaymentNote(tab.name, rabbit.name,
                              assignments
                                .filter((a) => a.rabbit_id === rabbit.id)
                                .map((a) => ({
                                  description: items.find((i) => i.id === a.item_id)?.description || '',
                                  splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
                                }))
                            )
                          )
                        )
                      }
                    >
                      <Text style={styles.venmoText}>Venmo</Text>
                    </TouchableOpacity>
                  )}
                  {ownerProfile.cashapp_cashtag && (
                    <TouchableOpacity
                      style={[styles.payBtn, styles.cashappBtn]}
                      onPress={() =>
                        Linking.openURL(cashAppLink(ownerProfile.cashapp_cashtag!, total / 100))
                      }
                    >
                      <Text style={styles.cashappText}>Cash App</Text>
                    </TouchableOpacity>
                  )}
                  {ownerProfile.paypal_username && (
                    <TouchableOpacity
                      style={[styles.payBtn, styles.paypalBtn]}
                      onPress={() =>
                        Linking.openURL(paypalLink(ownerProfile.paypal_username!, total / 100))
                      }
                    >
                      <Text style={styles.paypalText}>PayPal</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Grand total */}
      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCents(subtotalCents)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({tab.tax_percent}%)</Text>
          <Text style={styles.totalValue}>{formatCents(taxAmount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tip ({tab.tip_percent}%)</Text>
          <Text style={styles.totalValue}>{formatCents(tipAmount)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <Text style={styles.grandValue}>{formatCents(grandTotal)}</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
  },
  tabName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },
  itemsList: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dee2e6',
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dee2e6',
  },
  itemDesc: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  breakdownList: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  breakdownLeft: {
    flex: 1,
  },
  rabbitName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  breakdownDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  breakdownRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rabbitTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  paymentButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  payBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  venmoBtn: { borderColor: '#0d6efd' },
  venmoText: { color: '#0d6efd', fontSize: 12, fontWeight: '600' },
  cashappBtn: { borderColor: '#198754' },
  cashappText: { color: '#198754', fontSize: 12, fontWeight: '600' },
  paypalBtn: { borderColor: '#0dcaf0' },
  paypalText: { color: '#0dcaf0', fontSize: 12, fontWeight: '600' },
  totalCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dee2e6',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#dee2e6',
    marginVertical: 8,
  },
  grandLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  grandValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
});
