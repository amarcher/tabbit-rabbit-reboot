import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { formatAmount } from '../utils/currency';
import { getGradientColors } from '../utils/colors';
import { colors as theme, fonts } from '../utils/theme';

interface ItemRowProps {
  item: Item;
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  selectedRabbitId: string | null;
  currencyCode: string;
  onToggle: (itemId: string, rabbitId: string) => void;
  onDelete: (itemId: string) => void;
}

export default function ItemRow({
  item,
  rabbits,
  assignments,
  selectedRabbitId,
  currencyCode,
  onToggle,
  onDelete,
}: ItemRowProps) {
  const { t } = useTranslation();
  const swipeableRef = useRef<Swipeable>(null);

  const itemRabbitIds = assignments
    .filter((a) => a.item_id === item.id)
    .map((a) => a.rabbit_id);

  const assignedRabbits = rabbits.filter((r) => itemRabbitIds.includes(r.id));
  const rabbitColors = assignedRabbits.map((r) => r.color);
  const gradientColors = getGradientColors(rabbitColors);

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
        <Text style={styles.actionText}>{t('actions.delete')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => swipeableRef.current?.close()}
      >
        <Text style={styles.actionText}>{t('actions.cancel')}</Text>
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
          <Text style={styles.price}>{formatAmount(item.price_cents, currencyCode)}</Text>
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
    borderBottomColor: theme.border,
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
    color: theme.text,
    marginRight: 8,
  },
  price: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: theme.text,
  },
  swipeActions: {
    flexDirection: 'row',
  },
  confirmButton: {
    backgroundColor: theme.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  cancelButton: {
    backgroundColor: theme.muted,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  actionText: {
    color: '#fff',
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});
