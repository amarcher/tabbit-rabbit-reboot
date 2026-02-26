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
import { colors, fonts } from '@/src/utils/theme';
import { COLOR_HEX, RabbitColor } from '@/src/types';
import AnimatedNumber from '@/src/components/AnimatedNumber';

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
                { backgroundColor: COLOR_HEX[rabbit.color as RabbitColor] || colors.bg },
              ]}
            >
              <View style={styles.breakdownLeft}>
                <Text style={styles.rabbitName}>{rabbit.name}</Text>
                <Text style={styles.breakdownDetail}>
                  <AnimatedNumber value={subtotal} style={styles.breakdownDetail} /> + <AnimatedNumber value={tax} style={styles.breakdownDetail} /> tax + <AnimatedNumber value={tip} style={styles.breakdownDetail} /> tip
                </Text>
              </View>
              <View style={styles.breakdownRight}>
                <AnimatedNumber value={total} style={styles.rabbitTotal} />
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
          <AnimatedNumber value={subtotalCents} style={styles.totalValue} />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({tab.tax_percent}%)</Text>
          <AnimatedNumber value={taxAmount} style={styles.totalValue} />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tip ({tab.tip_percent}%)</Text>
          <AnimatedNumber value={tipAmount} style={styles.totalValue} />
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <AnimatedNumber value={grandTotal} style={styles.grandValue} />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    color: colors.danger,
  },
  tabName: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 15,
    color: colors.muted,
    marginBottom: 20,
  },
  itemsList: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemDesc: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
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
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  breakdownDetail: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  breakdownRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rabbitTotal: {
    fontSize: 20,
    fontFamily: fonts.bodyBold,
    color: colors.text,
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
  venmoBtn: { borderColor: '#3d95ce' },
  venmoText: { color: '#3d95ce', fontSize: 12, fontFamily: fonts.bodySemiBold },
  cashappBtn: { borderColor: '#198754' },
  cashappText: { color: '#198754', fontSize: 12, fontFamily: fonts.bodySemiBold },
  paypalBtn: { borderColor: '#0070ba' },
  paypalText: { color: '#0070ba', fontSize: 12, fontFamily: fonts.bodySemiBold },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  totalValue: {
    fontSize: 14,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  grandLabel: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  grandValue: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
});
