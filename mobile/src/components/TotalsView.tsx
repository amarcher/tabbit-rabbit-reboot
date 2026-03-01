import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { venmoChargeLink, buildChargeNote } from '../utils/payments';
import { amountToDecimal } from '../utils/currency';
import { COLOR_HEX } from '../types';
import { colors, fonts, timing } from '../utils/theme';
import PaymentLinks from './PaymentLinks';
import AnimatedNumber from './AnimatedNumber';

function getTipLabelKey(tip: number): string | null {
  if (tip >= 25) return 'tipLabels.wow';
  if (tip >= 20) return 'tipLabels.generous';
  if (tip >= 18) return 'tipLabels.nice';
  if (tip >= 15) return 'tipLabels.standard';
  return null;
}

/** Animated tip feedback badge */
function TipFeedback({ tipPercent }: { tipPercent: number }) {
  const { t } = useTranslation();
  const labelKey = getTipLabelKey(tipPercent);
  const label = labelKey ? t(labelKey) : null;
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
  const { t } = useTranslation();
  const currencyCode = tab.currency_code || 'USD';
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
      const rounded = Math.round(val);
      setTipPercent(rounded);
      setTipInputText(String(rounded));
      onUpdateTab({ tip_percent: rounded });
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
      <Text style={styles.sectionTitle}>{t('labels.totals')}</Text>

      {/* Tax Slider */}
      <View style={styles.sliderGroup}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>{t('labels.taxPercent')}</Text>
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
            accessibilityLabel={t('accessibility.taxPercentage')}
          />
          <TextInput
            style={styles.sliderInput}
            keyboardType="decimal-pad"
            value={taxInputText}
            onChangeText={handleTaxInputChange}
            onBlur={handleTaxInputBlur}
            selectTextOnFocus
            returnKeyType="done"
            accessibilityLabel={t('accessibility.taxPercentageInput')}
          />
        </View>
        <AnimatedNumber value={taxAmount} currencyCode={currencyCode} style={styles.sliderAmount} />
      </View>

      {/* Tip Slider */}
      <View style={styles.sliderGroup}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>{t('labels.tipPercent')}</Text>
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
            accessibilityLabel={t('accessibility.tipPercentage')}
          />
          <TextInput
            style={styles.sliderInput}
            keyboardType="decimal-pad"
            value={tipInputText}
            onChangeText={handleTipInputChange}
            onBlur={handleTipInputBlur}
            selectTextOnFocus
            returnKeyType="done"
            accessibilityLabel={t('accessibility.tipPercentageInput')}
          />
        </View>
        <View style={styles.tipAmountRow}>
          <TipFeedback tipPercent={tipPercent} />
          <AnimatedNumber value={tipAmount} currencyCode={currencyCode} style={styles.sliderAmount} />
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
                <View style={styles.breakdownDetailRow}>
                  <AnimatedNumber value={subtotal} currencyCode={currencyCode} style={styles.breakdownDetail} />
                  <Text style={styles.breakdownDetail}> + </Text>
                  <AnimatedNumber value={tax} currencyCode={currencyCode} style={styles.breakdownDetail} />
                  <Text style={styles.breakdownDetail}> {t('breakdown.tax')} + </Text>
                  <AnimatedNumber value={tip} currencyCode={currencyCode} style={styles.breakdownDetail} />
                  <Text style={styles.breakdownDetail}> {t('breakdown.tip')}</Text>
                </View>
              </View>
              <View style={styles.breakdownRight}>
                <AnimatedNumber value={total} currencyCode={currencyCode} style={styles.rabbitTotal} />
                <PaymentLinks
                  rabbit={rabbit}
                  amount={amountToDecimal(total, currencyCode)}
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
                    onPress={() => Linking.openURL(venmoChargeLink(rabbit.profile!.venmo_username!, amountToDecimal(total, currencyCode), buildChargeNote(tab.name, rabbit.name,
                      assignments
                        .filter((a) => a.rabbit_id === rabbit.id)
                        .map((a) => ({
                          description: items.find((i) => i.id === a.item_id)?.description || '',
                          splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
                        }))
                    )))}
                  >
                    <Text style={styles.chargeButtonText}>{t('actions.requestViaVenmo')}</Text>
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
            {t('messages.unassignedItems', { count: unassignedCount })}
          </Text>
        </View>
      )}

      {/* Grand total card */}
      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('labels.subtotal')}</Text>
          <AnimatedNumber value={itemsSubtotal} currencyCode={currencyCode} style={styles.totalValue} />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('labels.taxWithPercent', { percent: taxPercent })}</Text>
          <AnimatedNumber value={taxAmount} currencyCode={currencyCode} style={styles.totalValue} />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('labels.tipWithPercent', { percent: tipPercent })}</Text>
          <AnimatedNumber value={tipAmount} currencyCode={currencyCode} style={styles.totalValue} />
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.grandLabel}>{t('labels.grandTotal')}</Text>
          <AnimatedNumber value={grandTotal} currencyCode={currencyCode} style={styles.grandValue} />
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
    fontFamily: fonts.heading,
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
    fontFamily: fonts.bodySemiBold,
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
    fontFamily: fonts.bodyBold,
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
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  breakdownDetailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 2,
  },
  breakdownDetail: {
    fontSize: 12,
    color: colors.muted,
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
    backgroundColor: '#fffefa',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#a08c64',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(160,140,100,0.35)',
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
    fontFamily: fonts.bodySemiBold,
    color: colors.muted,
  },
});
