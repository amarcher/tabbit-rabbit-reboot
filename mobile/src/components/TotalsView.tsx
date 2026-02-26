import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import type { Item, Rabbit, ItemRabbit, Tab } from '../types';
import { formatCents } from '../utils/currency';
import { venmoChargeLink, buildChargeNote } from '../utils/payments';
import { COLOR_HEX } from '../types';
import { colors, timing } from '../utils/theme';
import PaymentLinks from './PaymentLinks';

function getTipLabel(tip: number): string | null {
  if (tip >= 25) return 'Wow!';
  if (tip >= 20) return 'Generous!';
  if (tip >= 18) return 'Nice!';
  if (tip >= 15) return 'Standard';
  return null;
}

/** Animated tip feedback badge */
function TipFeedback({ tipPercent }: { tipPercent: number }) {
  const label = getTipLabel(tipPercent);
  const opacity = useRef(new Animated.Value(label ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(label ? 0 : -4)).current;
  const prevLabel = useRef<string | null>(label);

  useEffect(() => {
    if (label && label !== prevLabel.current) {
      // New label appearing or changing
      opacity.setValue(0);
      translateY.setValue(-4);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: timing.fast,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: timing.fast,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!label && prevLabel.current) {
      // Label disappearing
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: timing.fast,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 4,
          duration: timing.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevLabel.current = label;
  }, [label, opacity, translateY]);

  if (!label) return null;

  return (
    <Animated.Text
      style={[
        styles.tipFeedback,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {label}
    </Animated.Text>
  );
}

interface TotalsViewProps {
  tab: Tab;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  onUpdateTab: (updates: Partial<Tab>) => void;
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
}: TotalsViewProps) {
  const [taxPercent, setTaxPercent] = useState(tab.tax_percent || 7);
  const [tipPercent, setTipPercent] = useState(tab.tip_percent || 18);

  // Raw string state for TextInputs — prevents trailing-dot / mid-edit issues
  const [taxInputText, setTaxInputText] = useState(String(tab.tax_percent || 7));
  const [tipInputText, setTipInputText] = useState(String(tab.tip_percent || 18));

  // Sync local input state when tab values change externally (e.g. receipt scan)
  useEffect(() => {
    setTaxPercent(tab.tax_percent || 7);
    setTaxInputText(String(tab.tax_percent || 7));
  }, [tab.tax_percent]);
  useEffect(() => {
    setTipPercent(tab.tip_percent || 18);
    setTipInputText(String(tab.tip_percent || 18));
  }, [tab.tip_percent]);

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

  // Slider handlers — update numeric state + text input + persist
  const handleTaxSlider = useCallback(
    (val: number) => {
      const rounded = Math.round(val * 100) / 100; // avoid floating point noise
      setTaxPercent(rounded);
      setTaxInputText(String(rounded));
      onUpdateTab({ tax_percent: rounded });
    },
    [onUpdateTab]
  );

  const handleTipSlider = useCallback(
    (val: number) => {
      setTipPercent(val);
      setTipInputText(String(val));
      onUpdateTab({ tip_percent: val });
    },
    [onUpdateTab]
  );

  // TextInput handlers — update text freely while typing, parse on blur
  const handleTaxInputChange = useCallback((text: string) => {
    setTaxInputText(text);
  }, []);

  const handleTaxInputBlur = useCallback(() => {
    const num = parseFloat(taxInputText) || 0;
    const clamped = Math.min(Math.max(num, 0), 15);
    setTaxPercent(clamped);
    setTaxInputText(String(clamped));
    onUpdateTab({ tax_percent: clamped });
  }, [taxInputText, onUpdateTab]);

  const handleTipInputChange = useCallback((text: string) => {
    setTipInputText(text);
  }, []);

  const handleTipInputBlur = useCallback(() => {
    const num = parseFloat(tipInputText) || 0;
    const clamped = Math.min(Math.max(num, 0), 30);
    setTipPercent(clamped);
    setTipInputText(String(clamped));
    onUpdateTab({ tip_percent: clamped });
  }, [tipInputText, onUpdateTab]);

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Totals</Text>

      {/* Tax Slider */}
      <View style={styles.sliderGroup}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Tax %</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={15}
            step={0.25}
            value={taxPercent}
            onValueChange={handleTaxSlider}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
            accessibilityLabel="Tax percentage"
          />
          <TextInput
            style={styles.sliderInput}
            keyboardType="decimal-pad"
            value={taxInputText}
            onChangeText={handleTaxInputChange}
            onBlur={handleTaxInputBlur}
            selectTextOnFocus
            returnKeyType="done"
            accessibilityLabel="Tax percentage input"
          />
        </View>
        <Text style={styles.sliderAmount}>{formatCents(taxAmount)}</Text>
      </View>

      {/* Tip Slider */}
      <View style={styles.sliderGroup}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Tip %</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={30}
            step={1}
            value={tipPercent}
            onValueChange={handleTipSlider}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
            accessibilityLabel="Tip percentage"
          />
          <TextInput
            style={styles.sliderInput}
            keyboardType="decimal-pad"
            value={tipInputText}
            onChangeText={handleTipInputChange}
            onBlur={handleTipInputBlur}
            selectTextOnFocus
            returnKeyType="done"
            accessibilityLabel="Tip percentage input"
          />
        </View>
        <View style={styles.tipAmountRow}>
          <TipFeedback tipPercent={tipPercent} />
          <Text style={styles.sliderAmount}>{formatCents(tipAmount)}</Text>
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
                  note={buildChargeNote(tab.name, rabbit.name,
                    assignments
                      .filter((a) => a.rabbit_id === rabbit.id)
                      .map((a) => ({
                        description: items.find((i) => i.id === a.item_id)?.description || '',
                        splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
                      }))
                  )}
                />
                {rabbit.profile?.venmo_username && total > 0 && (
                  <TouchableOpacity
                    style={styles.chargeButton}
                    onPress={() => Linking.openURL(venmoChargeLink(rabbit.profile!.venmo_username!, total / 100, buildChargeNote(tab.name, rabbit.name,
                      assignments
                        .filter((a) => a.rabbit_id === rabbit.id)
                        .map((a) => ({
                          description: items.find((i) => i.id === a.item_id)?.description || '',
                          splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
                        }))
                    )))}
                  >
                    <Text style={styles.chargeButtonText}>Request via Venmo</Text>
                  </TouchableOpacity>
                )}
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 24,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  sliderGroup: {
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    width: 42,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderInput: {
    width: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: colors.inputBg,
    color: colors.text,
  },
  sliderAmount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 2,
  },
  tipAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  tipFeedback: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
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
    fontWeight: '700',
    color: colors.text,
  },
  warningBox: {
    backgroundColor: colors.warningBg,
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: colors.warningText,
  },
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
    fontWeight: '700',
    color: colors.text,
  },
  grandValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  chargeButton: {
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  chargeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
});
