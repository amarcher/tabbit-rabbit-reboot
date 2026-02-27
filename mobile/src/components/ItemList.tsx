import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { parseAmount, getPricePlaceholder } from '../utils/currency';
import { colors, fonts } from '../utils/theme';
import ItemRow from './ItemRow';

interface ItemListProps {
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  selectedRabbitId: string | null;
  currencyCode: string;
  onToggle: (itemId: string, rabbitId: string) => void;
  onAddItem: (description: string, priceCents: number) => void;
  onDeleteItem: (itemId: string) => void;
}

export default function ItemList({
  items,
  rabbits,
  assignments,
  selectedRabbitId,
  currencyCode,
  onToggle,
  onAddItem,
  onDeleteItem,
}: ItemListProps) {
  const { t } = useTranslation();
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');

  const handleAdd = () => {
    if (!desc.trim() || !price.trim()) return;
    onAddItem(desc.trim(), parseAmount(price, currencyCode));
    setDesc('');
    setPrice('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.listContainer}>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            rabbits={rabbits}
            assignments={assignments}
            selectedRabbitId={selectedRabbitId}
            currencyCode={currencyCode}
            onToggle={onToggle}
            onDelete={onDeleteItem}
          />
        ))}
      </View>

      <View style={styles.addForm}>
        <TextInput
          style={[styles.input, styles.descInput]}
          placeholder={t('placeholders.itemName')}
          placeholderTextColor={colors.placeholder}
          value={desc}
          onChangeText={setDesc}
          returnKeyType="next"
        />
        <TextInput
          style={[styles.input, styles.priceInput]}
          placeholder={getPricePlaceholder(currencyCode)}
          placeholderTextColor={colors.placeholder}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[
            styles.addButton,
            (!desc.trim() || !price.trim()) && styles.addButtonDisabled,
          ]}
          onPress={handleAdd}
          disabled={!desc.trim() || !price.trim()}
        >
          <Text style={styles.addButtonText}>{t('actions.add')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  listContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 12,
  },
  addForm: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colors.inputBg,
    color: colors.text,
  },
  descInput: {
    flex: 1,
  },
  priceInput: {
    width: 90,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
});
