import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTab } from '@/src/hooks/useTab';
import { useAuth } from '@/src/hooks/useAuth';
import { encodeBill } from '@/src/utils/billEncoder';
import { canScanFree, incrementScanCount, remainingFreeScans, FREE_SCAN_LIMIT } from '@/src/utils/scanCounter';
import { scanReceiptDirect, getStoredApiKey } from '@/src/utils/anthropic';
import type { ReceiptResult } from '@/src/utils/anthropic';
import ItemList from '@/src/components/ItemList';
import RabbitBar from '@/src/components/RabbitBar';
import AddRabbitModal from '@/src/components/AddRabbitModal';
import TotalsView from '@/src/components/TotalsView';
import type { RabbitColor } from '@/src/types';

function ActionBar({
  onScanReceipt,
  onShareBill,
  onSave,
  scanning,
  saving,
  isDirty,
}: {
  onScanReceipt: () => void;
  onShareBill: () => void;
  onSave: () => void;
  scanning: boolean;
  saving: boolean;
  isDirty: boolean;
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
      <TouchableOpacity style={styles.actionButton} onPress={onShareBill}>
        <Text style={styles.actionButtonText}>Share Bill</Text>
      </TouchableOpacity>
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
  const { profile } = useAuth();
  const {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    saving,
    isDirty,
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
    const byokKey = await getStoredApiKey();
    if (!byokKey && !(await canScanFree())) {
      Alert.alert(
        'Out of Free Scans',
        `You've used all ${FREE_SCAN_LIMIT} free scans this month. Add your own Anthropic API key in Profile for unlimited scans.`,
        [
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
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
            quality: 0.5,
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
            quality: 0.5,
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
      const image_base64 = await readAsStringAsync(uri, {
        encoding: EncodingType.Base64,
      });

      const byokKey = await getStoredApiKey();
      let result: ReceiptResult;

      if (byokKey) {
        // BYOK: call Anthropic directly, no scan counter
        result = await scanReceiptDirect(byokKey, image_base64, 'image/jpeg');
      } else {
        // Free scan via Vercel function
        const res = await fetch('https://tabbitrabbit.com/api/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64, media_type: 'image/jpeg' }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`OCR failed (${res.status}): ${errBody}`);
        }
        result = await res.json();
        const remaining = FREE_SCAN_LIMIT - (await incrementScanCount());
        if (remaining > 0) {
          Alert.alert('Scan Complete', `${remaining} free scan${remaining === 1 ? '' : 's'} remaining this month.`);
        }
      }

      if (result?.items?.length) {
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
    if (!tab) return;
    const encoded = encodeBill(
      tab,
      items,
      rabbits,
      assignments,
      {
        display_name: profile?.display_name || null,
        venmo_username: profile?.venmo_username || null,
        cashapp_cashtag: profile?.cashapp_cashtag || null,
        paypal_username: profile?.paypal_username || null,
      }
    );
    const url = `https://tabbitrabbit.com/bill/${encoded}`;
    await Share.share({
      message: `Check out this bill for ${tab.name}: ${url}`,
      url,
    });
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
        currentUserProfile={profile}
      />

      {/* Action Bar (bottom) */}
      <ActionBar
        onScanReceipt={handleScanReceipt}
        onShareBill={handleShareBill}
        onSave={saveChanges}
        scanning={scanning}
        saving={saving}
        isDirty={isDirty}
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
