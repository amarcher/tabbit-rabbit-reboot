import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTab } from '@/src/hooks/useTab';
import { useRealtime } from '@/src/hooks/useRealtime';
import ItemList from '@/src/components/ItemList';
import RabbitBar from '@/src/components/RabbitBar';
import AddRabbitModal from '@/src/components/AddRabbitModal';
import ReceiptUpload from '@/src/components/ReceiptUpload';
import TotalsView from '@/src/components/TotalsView';
import type { ReceiptResult } from '@/src/components/ReceiptUpload';
import type { RabbitColor } from '@/src/types';

export default function TabEditorScreen() {
  const { tabId } = useLocalSearchParams<{ tabId: string }>();
  const navigation = useNavigation();
  const {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    saving,
    isDirty,
    fetchTab,
    updateTab,
    addItem,
    addItems,
    deleteItem,
    addRabbit,
    removeRabbit,
    toggleAssignment,
    saveChanges,
  } = useTab(tabId);

  const [selectedRabbitId, setSelectedRabbitId] = useState<string | null>(null);
  const [showAddRabbit, setShowAddRabbit] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tabName, setTabName] = useState('');

  useRealtime(tabId, useCallback(() => fetchTab(), [fetchTab]));

  // Set nav title
  React.useEffect(() => {
    if (tab?.name) {
      navigation.setOptions({ title: tab.name });
    }
  }, [tab?.name, navigation]);

  const subtotals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const rabbit of rabbits) {
      const rabbitItemIds = assignments
        .filter((a) => a.rabbit_id === rabbit.id)
        .map((a) => a.item_id);

      let total = 0;
      for (const itemId of rabbitItemIds) {
        const item = items.find((i) => i.id === itemId);
        if (!item) continue;
        const splitCount = assignments.filter(
          (a) => a.item_id === itemId
        ).length;
        total += item.price_cents / splitCount;
      }
      result[rabbit.id] = Math.round(total);
    }
    return result;
  }, [rabbits, items, assignments]);

  const handleNameSave = () => {
    if (tabName.trim() && tabName.trim() !== tab?.name) {
      updateTab({ name: tabName.trim() });
    }
    setEditingName(false);
  };

  const handleReceiptParsed = (result: ReceiptResult) => {
    const batchItems = result.items.map((item) => ({
      description: item.description,
      price_cents: Math.round(item.price * 100),
    }));
    addItems(batchItems);

    if (result.tax && result.subtotal && result.subtotal > 0) {
      const taxPercent = Math.round((result.tax / result.subtotal) * 10000) / 100;
      updateTab({ tax_percent: taxPercent });
    }
  };

  if (loading || !tab) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab Name */}
      <View style={styles.header}>
        {editingName ? (
          <TextInput
            style={styles.nameInput}
            value={tabName}
            onChangeText={setTabName}
            autoFocus
            onBlur={handleNameSave}
            onSubmitEditing={handleNameSave}
            returnKeyType="done"
          />
        ) : (
          <TouchableOpacity
            onPress={() => {
              setTabName(tab.name);
              setEditingName(true);
            }}
          >
            <Text style={styles.tabName}>{tab.name}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerRight}>
          {saving && (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}
          {isDirty && !saving && (
            <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rabbit Bar */}
      <RabbitBar
        rabbits={rabbits}
        selectedRabbitId={selectedRabbitId}
        subtotals={subtotals}
        onSelect={(id) =>
          setSelectedRabbitId(id === selectedRabbitId ? null : id)
        }
        onRemove={removeRabbit}
        onAddClick={() => setShowAddRabbit(true)}
      />

      {selectedRabbitId && (
        <Text style={styles.assignHint}>
          Tap items to assign them to{' '}
          <Text style={styles.assignHintName}>
            {rabbits.find((r) => r.id === selectedRabbitId)?.name}
          </Text>
        </Text>
      )}

      {/* Receipt Upload */}
      <ReceiptUpload tabId={tab.id} onReceiptParsed={handleReceiptParsed} />

      {/* Item List */}
      <ItemList
        items={items}
        rabbits={rabbits}
        assignments={assignments}
        selectedRabbitId={selectedRabbitId}
        onToggle={toggleAssignment}
        onAddItem={addItem}
        onDeleteItem={deleteItem}
      />

      {/* Totals */}
      <TotalsView
        tab={tab}
        items={items}
        rabbits={rabbits}
        assignments={assignments}
        onUpdateTab={updateTab}
        shareToken={tab.share_token}
      />

      {/* Add Rabbit Modal */}
      <AddRabbitModal
        visible={showAddRabbit}
        onClose={() => setShowAddRabbit(false)}
        onAdd={(name, color) => addRabbit(name, color)}
        usedColors={rabbits.map((r) => r.color as RabbitColor)}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#0d6efd',
    paddingVertical: 4,
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savingText: {
    fontSize: 13,
    color: '#999',
  },
  saveButton: {
    borderWidth: 1.5,
    borderColor: '#198754',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: '#198754',
    fontWeight: '600',
    fontSize: 14,
  },
  assignHint: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  assignHintName: {
    fontWeight: '700',
    color: '#333',
  },
  bottomPadding: {
    height: 40,
  },
});
