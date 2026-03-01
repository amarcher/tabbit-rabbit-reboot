import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Rabbit } from '../types';
import { formatAmount } from '../utils/currency';
import { BUTTON_COLORS, BUTTON_OUTLINE_COLORS } from '../utils/colors';
import { colors, fonts } from '../utils/theme';

interface RabbitBarProps {
  rabbits: Rabbit[];
  selectedRabbitId: string | null;
  subtotals: Record<string, number>;
  currencyCode: string;
  onSelect: (rabbitId: string) => void;
  onRemove: (rabbitId: string) => void;
  onAddClick: () => void;
  /** Optional wrapper for the "+ Add Someone" chip (used for coachmark anchoring) */
  wrapAddChip?: (chip: React.ReactElement) => React.ReactElement;
}

export default function RabbitBar({
  rabbits,
  selectedRabbitId,
  subtotals,
  currencyCode,
  onSelect,
  onRemove,
  onAddClick,
  wrapAddChip,
}: RabbitBarProps) {
  const { t } = useTranslation();

  const handleLongPress = (rabbit: Rabbit) => {
    Alert.alert(
      t('messages.confirmRemoveRabbit', { name: rabbit.name }),
      t('messages.removeFromAllItems'),
      [
        { text: t('actions.cancel'), style: 'cancel' },
        { text: t('actions.remove'), style: 'destructive', onPress: () => onRemove(rabbit.id) },
      ]
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {rabbits.map((rabbit) => {
        const isSelected = selectedRabbitId === rabbit.id;
        const colorSet = isSelected
          ? BUTTON_COLORS[rabbit.color]
          : BUTTON_OUTLINE_COLORS[rabbit.color];

        return (
          <TouchableOpacity
            key={rabbit.id}
            style={[
              styles.chip,
              {
                backgroundColor: colorSet.bg,
                borderColor: colorSet.border,
              },
            ]}
            onPress={() => onSelect(rabbit.id)}
            onLongPress={() => handleLongPress(rabbit)}
          >
            <Text style={[styles.chipText, { color: colorSet.text }]}>
              {rabbit.name}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatAmount(subtotals[rabbit.id] || 0, currencyCode)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      {(() => {
        const chip = (
          <TouchableOpacity style={styles.addChip} onPress={onAddClick}>
            <Text style={styles.addChipText}>{t('actions.addSomeone')}</Text>
          </TouchableOpacity>
        );
        return wrapAddChip ? wrapAddChip(chip) : chip;
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  chipText: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  badge: {
    backgroundColor: colors.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  addChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.muted,
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: 15,
    color: colors.muted,
  },
});
