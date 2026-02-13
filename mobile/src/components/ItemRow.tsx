import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
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
  const swipeableRef = useRef<Swipeable>(null);

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

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete(item.id);
        }}
      >
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => swipeableRef.current?.close()}
      >
        <Text style={styles.actionText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
    >
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
          <Text style={styles.price}>{formatCents(item.price_cents)}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Swipeable>
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
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  swipeActions: {
    flexDirection: 'row',
  },
  confirmButton: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
