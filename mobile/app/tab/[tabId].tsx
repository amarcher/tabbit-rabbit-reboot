import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTab } from '@/src/hooks/useTab';
import { useRealtime } from '@/src/hooks/useRealtime';
import { supabase } from '@/src/supabaseClient';
import ItemList from '@/src/components/ItemList';
import RabbitBar from '@/src/components/RabbitBar';
import AddRabbitModal from '@/src/components/AddRabbitModal';
import TotalsView from '@/src/components/TotalsView';
import type { RabbitColor } from '@/src/types';

interface ReceiptResult {
  items: { description: string; price: number }[];
  subtotal?: number;
  tax?: number;
  total?: number;
}

function ActionBar({
  onScanReceipt,
  onShareBill,
  onSave,
  scanning,
  saving,
  isDirty,
  shareToken,
}: {
  onScanReceipt: () => void;
  onShareBill: () => void;
  onSave: () => void;
  scanning: boolean;
  saving: boolean;
  isDirty: boolean;
  shareToken: string | undefined;
}) {
  return (
    <View style={styles.actionBar}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onScanReceipt}
        disabled={scanning}
      >
        <Text style={styles.actionButtonText}>
          {scanning ? 'Scanning...' : 'Scan Receipt'}
        </Text>
      </TouchableOpacity>
      {shareToken && (
        <TouchableOpacity style={styles.actionButton} onPress={onShareBill}>
          <Text style={styles.actionButtonText}>Share Bill</Text>
        </TouchableOpacity>
      )}
      {isDirty && (
        <TouchableOpacity
          style={[styles.actionButton, styles.saveActionButton]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={[styles.actionButtonText, styles.saveActionText]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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
  const [scanning, setScanning] = useState(false);

  useRealtime(tabId, useCallback(() => fetchTab(), [fetchTab]));

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

  const handleScanReceipt = async () => {
    Alert.alert('Scan Receipt', 'Choose image source', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await processReceiptImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await processReceiptImage(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const processReceiptImage = async (uri: string) => {
    if (!tabId) return;
    setScanning(true);
    try {
      const filename = `${Date.now()}.jpg`;
      const filePath = `receipts/${tabId}/${filename}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('receipts').getPublicUrl(filePath);

      const { data, error: fnError } = await supabase.functions.invoke(
        'parse-receipt',
        { body: { image_url: publicUrl } }
      );
      if (fnError) throw fnError;

      if (data?.items?.length) {
        const result = data as ReceiptResult;
        addItems(
          result.items.map((item) => ({
            description: item.description,
            price_cents: Math.round(item.price * 100),
          }))
        );
        if (result.tax && result.subtotal && result.subtotal > 0) {
          const taxPercent =
            Math.round((result.tax / result.subtotal) * 10000) / 100;
          updateTab({ tax_percent: taxPercent });
        }
      } else {
        Alert.alert('No items found', 'Try a clearer photo.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to process receipt');
    } finally {
      setScanning(false);
    }
  };

  const handleShareBill = async () => {
    if (!tab?.share_token) return;
    const url = `https://tabbitrabbit.com/bill/${tab.share_token}`;
    await Clipboard.setStringAsync(url);
    Alert.alert('Link Copied', url);
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
      {/* Action Bar (top) */}
      <ActionBar
        onScanReceipt={handleScanReceipt}
        onShareBill={handleShareBill}
        onSave={saveChanges}
        scanning={scanning}
        saving={saving}
        isDirty={isDirty}
        shareToken={tab.share_token}
      />

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

      {/* Totals (no share button — it's in the action bar now) */}
      <TotalsView
        tab={tab}
        items={items}
        rabbits={rabbits}
        assignments={assignments}
        onUpdateTab={updateTab}
      />

      {/* Action Bar (bottom) */}
      <ActionBar
        onScanReceipt={handleScanReceipt}
        onShareBill={handleShareBill}
        onSave={saveChanges}
        scanning={scanning}
        saving={saving}
        isDirty={isDirty}
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
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#0dcaf0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#0dcaf0',
    fontWeight: '600',
    fontSize: 14,
  },
  saveActionButton: {
    borderColor: '#198754',
  },
  saveActionText: {
    color: '#198754',
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
