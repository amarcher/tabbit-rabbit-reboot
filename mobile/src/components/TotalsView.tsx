import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Item, Rabbit, ItemRabbit, Tab } from '../types';
import { formatCents } from '../utils/currency';
import { buildPaymentNote } from '../utils/payments';
import { COLOR_HEX } from '../types';
import PaymentLinks from './PaymentLinks';

interface TotalsViewProps {
  tab: Tab;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  onUpdateTab: (updates: Partial<Tab>) => void;
  shareToken?: string;
}

interface RabbitTotal {
  rabbit: Rabbit;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export default function TotalsView({
  tab,
  items,
  rabbits,
  assignments,
  onUpdateTab,
  shareToken,
}: TotalsViewProps) {
  const [taxPercent, setTaxPercent] = useState(tab.tax_percent || 8.75);
  const [tipPercent, setTipPercent] = useState(tab.tip_percent || 18);
  const [copied, setCopied] = useState(false);

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price_cents, 0),
    [items]
  );

  const assignedItemIds = useMemo(
    () => new Set(assignments.map((a) => a.item_id)),
    [assignments]
  );

  const unassignedCount = useMemo(
    () => items.filter((item) => !assignedItemIds.has(item.id)).length,
    [items, assignedItemIds]
  );

  const totals = useMemo(() => {
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

      const tax = subtotal * (taxPercent / 100);
      const tip = subtotal * (tipPercent / 100);

      return {
        rabbit,
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        tip: Math.round(tip),
        total: Math.round(subtotal + tax + tip),
      } as RabbitTotal;
    });
  }, [rabbits, items, assignments, taxPercent, tipPercent]);

  const taxAmount = Math.round(itemsSubtotal * (taxPercent / 100));
  const tipAmount = Math.round(itemsSubtotal * (tipPercent / 100));
  const grandTotal = itemsSubtotal + taxAmount + tipAmount;

  const handleTaxChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setTaxPercent(num);
    onUpdateTab({ tax_percent: num });
  };

  const handleTipChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setTipPercent(num);
    onUpdateTab({ tip_percent: num });
  };

  const handleShare = async () => {
    if (!shareToken) return;
    const url = `https://tabbitrabbit.com/bill/${shareToken}`;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Totals</Text>

      {/* Tax & Tip Controls */}
      <View style={styles.controlsRow}>
        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>Tax %</Text>
          <TextInput
            style={styles.controlInput}
            keyboardType="decimal-pad"
            value={String(taxPercent)}
            onChangeText={handleTaxChange}
          />
        </View>
        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>Tip %</Text>
          <TextInput
            style={styles.controlInput}
            keyboardType="decimal-pad"
            value={String(tipPercent)}
            onChangeText={handleTipChange}
          />
        </View>
      </View>

      {/* Per-rabbit breakdown */}
      {totals.length > 0 && (
        <View style={styles.breakdownList}>
          {totals.map(({ rabbit, subtotal, tax, tip, total }) => (
            <View
              key={rabbit.id}
              style={[
                styles.breakdownItem,
                { backgroundColor: COLOR_HEX[rabbit.color] },
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
                <PaymentLinks
                  rabbit={rabbit}
                  amount={total / 100}
                  note={buildPaymentNote(tab.name, rabbit.name,
                    assignments
                      .filter((a) => a.rabbit_id === rabbit.id)
                      .map((a) => ({
                        description: items.find((i) => i.id === a.item_id)?.description || '',
                        splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
                      }))
                  )}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Unassigned warning */}
      {unassignedCount > 0 && rabbits.length > 0 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {unassignedCount} item{unassignedCount > 1 ? 's' : ''} not assigned to anyone yet.
          </Text>
        </View>
      )}

      {/* Grand total card */}
      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCents(itemsSubtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({taxPercent}%)</Text>
          <Text style={styles.totalValue}>{formatCents(taxAmount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tip ({tipPercent}%)</Text>
          <Text style={styles.totalValue}>{formatCents(tipAmount)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <Text style={styles.grandValue}>{formatCents(grandTotal)}</Text>
        </View>
      </View>

      {/* Share button */}
      {shareToken && (
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>
            {copied ? 'Copied!' : 'Share Bill'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  controlItem: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  controlInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#fff',
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
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
  },
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
  shareButton: {
    marginTop: 16,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: '#198754',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  shareButtonText: {
    color: '#198754',
    fontWeight: '600',
    fontSize: 16,
  },
});
