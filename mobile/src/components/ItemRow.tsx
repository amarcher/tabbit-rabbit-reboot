import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { formatCents } from '../utils/currency';
import { getGradientColors } from '../utils/colors';

interface ItemRowProps {
  item: Item;
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  selectedRabbitId: string | null;
  onToggle: (itemId: string, rabbitId: string) => void;
  onDelete: (itemId: string) => void;
}

export default function ItemRow({
  item,
  rabbits,
  assignments,
  selectedRabbitId,
  onToggle,
  onDelete,
}: ItemRowProps) {
  const itemRabbitIds = assignments
    .filter((a) => a.item_id === item.id)
    .map((a) => a.rabbit_id);

  const assignedRabbits = rabbits.filter((r) => itemRabbitIds.includes(r.id));
  const colors = assignedRabbits.map((r) => r.color);
  const gradientColors = getGradientColors(colors);

  const isSelectedRabbitAssigned =
    selectedRabbitId != null && itemRabbitIds.includes(selectedRabbitId);

  const handlePress = () => {
    if (selectedRabbitId) {
      onToggle(item.id, selectedRabbitId);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!selectedRabbitId}
      activeOpacity={selectedRabbitId ? 0.7 : 1}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.row,
          isSelectedRabbitAssigned && styles.highlighted,
        ]}
      >
        <Text style={styles.description} numberOfLines={1}>
          {item.description}
        </Text>
        <View style={styles.rightSide}>
          <Text style={styles.price}>{formatCents(item.price_cents)}</Text>
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={styles.deleteButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteText}>&times;</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dee2e6',
  },
  highlighted: {
    shadowColor: '#EDD29E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  description: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
    marginTop: -1,
  },
});
