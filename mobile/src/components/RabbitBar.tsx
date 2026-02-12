import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import type { Rabbit } from '../types';
import { formatCents } from '../utils/currency';
import { BUTTON_COLORS, BUTTON_OUTLINE_COLORS } from '../utils/colors';

interface RabbitBarProps {
  rabbits: Rabbit[];
  selectedRabbitId: string | null;
  subtotals: Record<string, number>;
  onSelect: (rabbitId: string) => void;
  onRemove: (rabbitId: string) => void;
  onAddClick: () => void;
}

export default function RabbitBar({
  rabbits,
  selectedRabbitId,
  subtotals,
  onSelect,
  onRemove,
  onAddClick,
}: RabbitBarProps) {
  const handleLongPress = (rabbit: Rabbit) => {
    Alert.alert(
      `Remove ${rabbit.name}?`,
      'This will unassign them from all items.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(rabbit.id) },
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
                {formatCents(subtotals[rabbit.id] || 0)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.addChip} onPress={onAddClick}>
        <Text style={styles.addChipText}>+ Add Someone</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 4,
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
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  addChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#6c757d',
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: 15,
    color: '#6c757d',
  },
});
