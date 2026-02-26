import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useToast } from '@/src/components/Toast';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { CoachmarkAnchor, useCoachmark } from '@edwardloopez/react-native-coachmark';
import { useTab } from '@/src/hooks/useTab';
import { useAuth } from '@/src/hooks/useAuth';
import { useProStatus } from '@/src/hooks/useProStatus';
import { useSavedRabbits } from '@/src/hooks/useSavedRabbits';
import { shareBill } from '@/src/utils/billEncoder';
import { canScanFree, incrementScanCount, FREE_SCAN_LIMIT } from '@/src/utils/scanCounter';
import { receiptValueToPercent } from '@/src/utils/anthropic';
import type { ReceiptResult } from '@/src/utils/anthropic';
import { colors, fonts } from '@/src/utils/theme';
import ItemList from '@/src/components/ItemList';
import RabbitBar from '@/src/components/RabbitBar';
import AddRabbitModal from '@/src/components/AddRabbitModal';
import TotalsView from '@/src/components/TotalsView';
import HintArrow from '@/src/components/HintArrow';
import Confetti from '@/src/components/Confetti';
import { editorTour } from '@/src/utils/onboardingTour';
import type { RabbitColor, Profile, Tab } from '@/src/types';

function ActionBar({
  onScanReceipt,
  onShareBill,
  scanning,
  sharing,
  hasItems,
  hasRabbits,
}: {
  onScanReceipt: () => void;
  onShareBill: () => void;
  scanning: boolean;
  sharing: boolean;
  hasItems: boolean;
  hasRabbits: boolean;
}) {
  const showShare = hasItems && hasRabbits;
  const scanIsPrimary = !hasItems;

  return (
    <View style={styles.actionBar}>
      <TouchableOpacity
        style={[
          scanIsPrimary ? styles.actionButtonFilled : styles.actionButtonOutline,
          !showShare && { flex: 1 },
        ]}
        onPress={onScanReceipt}
        disabled={scanning}
      >
        <Text
          style={
            scanIsPrimary
              ? styles.actionButtonFilledText
              : styles.actionButtonOutlineText
          }
        >
          {scanning ? 'Scanning...' : 'Scan Receipt'}
        </Text>
      </TouchableOpacity>
      {showShare && (
        <TouchableOpacity
          style={styles.actionButtonOutline}
          onPress={onShareBill}
          disabled={sharing}
        >
          <Text style={styles.actionButtonOutlineText}>
            {sharing ? 'Sharing...' : 'Share Bill'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TabEditorScreen() {
  const { tabId } = useLocalSearchParams<{ tabId: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { profile } = useAuth();
  const { isPro } = useProStatus();
  const { savedRabbits, addSaved, removeSaved } = useSavedRabbits();
  const {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    updateTab,
    addItem,
    addItems,
    deleteItem,
    addRabbit,
    removeRabbit,
    toggleAssignment,
  } = useTab(tabId);

  const { showToast } = useToast();
  const { start, isActive } = useCoachmark();
  const [selectedRabbitId, setSelectedRabbitId] = useState<string | null>(null);
  const [showAddRabbit, setShowAddRabbit] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Scroll-to-top button state
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTopOpacity = useSharedValue(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollTopOpacity.value = withTiming(y > 200 ? 1 : 0, { duration: 200 });
  }, []);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const scrollTopStyle = useAnimatedStyle(() => ({
    opacity: scrollTopOpacity.value,
    pointerEvents: scrollTopOpacity.value > 0.5 ? 'auto' as const : 'none' as const,
  }));

  // Auto-start editor tour once the screen loads
  useEffect(() => {
    if (!loading && tab && !isActive) {
      const timer = setTimeout(() => start(editorTour), 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, tab, isActive, start]);

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
    if (!(await canScanFree())) {
      Alert.alert(
        'Out of Free Scans',
        `You've used all ${FREE_SCAN_LIMIT} free scans this month. Upgrade to Tabbit Pro for unlimited scans.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade to Pro',
            onPress: () => router.push('/(tabs)/profile'),
          },
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

      const res = await fetch('https://tabbitrabbit.com/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64, media_type: 'image/jpeg' }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`OCR failed (${res.status}): ${errBody}`);
      }
      const result: ReceiptResult = await res.json();
      const remaining = FREE_SCAN_LIMIT - (await incrementScanCount());
      if (remaining > 0) {
        Alert.alert('Scan Complete', `${remaining} free scan${remaining === 1 ? '' : 's'} remaining this month.`);
      }

      if (result?.items?.length) {
        addItems(
          result.items.map((item) => ({
            description: item.description,
            price_cents: Math.round(item.price * 100),
          }))
        );
        const taxPercent = receiptValueToPercent(result.tax, result.tax_unit, result.subtotal);
        const tipPercent = receiptValueToPercent(result.tip, result.tip_unit, result.subtotal);
        const updates: Partial<Tab> = {};
        if (taxPercent !== null) updates.tax_percent = taxPercent;
        if (tipPercent !== null) updates.tip_percent = tipPercent;
        if (Object.keys(updates).length) updateTab(updates);
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
    setSharing(true);
    try {
      const token = await shareBill({
        tab,
        items,
        rabbits,
        assignments,
        ownerProfile: {
          display_name: profile?.display_name || null,
          venmo_username: profile?.venmo_username || null,
          cashapp_cashtag: profile?.cashapp_cashtag || null,
          paypal_username: profile?.paypal_username || null,
        },
      });
      const url = `https://tabbitrabbit.com/bill/${token}`;
      setShowConfetti(true);
      await Share.share({ url });
    } catch {
      Alert.alert('Error', 'Failed to share bill. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  if (loading || !tab) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const hasItems = items.length > 0;
  const hasRabbits = rabbits.length > 0;
  const showFirstTabHints = !hasItems && !hasRabbits;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {/* Hint: scan a receipt */}
      {showFirstTabHints && (
        <View style={styles.hintRow}>
          <HintArrow text="Scan a receipt to get started" />
        </View>
      )}

      {/* Action Bar (top) */}
      <CoachmarkAnchor id="scan-receipt" shape="rect" padding={8}>
        <ActionBar
          onScanReceipt={handleScanReceipt}
          onShareBill={handleShareBill}
          scanning={scanning}
          sharing={sharing}
          hasItems={hasItems}
          hasRabbits={hasRabbits}
        />
      </CoachmarkAnchor>

      {/* Rabbit Bar */}
      <CoachmarkAnchor id="rabbit-bar" shape="rect" padding={4}>
        <RabbitBar
          rabbits={rabbits}
          selectedRabbitId={selectedRabbitId}
          subtotals={subtotals}
          onSelect={(id) =>
            setSelectedRabbitId(id === selectedRabbitId ? null : id)
          }
          onRemove={removeRabbit}
          onAddClick={() => setShowAddRabbit(true)}
          wrapAddChip={(chip) => (
            <CoachmarkAnchor id="add-rabbit" shape="pill" padding={4}>
              {chip}
            </CoachmarkAnchor>
          )}
        />
      </CoachmarkAnchor>

      {selectedRabbitId && (
        <Text style={styles.assignHint}>
          Tap items to assign them to{' '}
          <Text style={styles.assignHintName}>
            {rabbits.find((r) => r.id === selectedRabbitId)?.name}
          </Text>
        </Text>
      )}

      {/* Hint: enter items manually */}
      {showFirstTabHints && (
        <View style={styles.hintRow}>
          <HintArrow text="Or enter items manually below" />
        </View>
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

      {/* Totals */}
      <CoachmarkAnchor id="tax-tip" shape="rect" padding={8}>
        <TotalsView
          tab={tab}
          items={items}
          rabbits={rabbits}
          assignments={assignments}
          onUpdateTab={updateTab}
        />
      </CoachmarkAnchor>

      {/* Bottom Action Bar — only shown when content exists */}
      {(hasItems || hasRabbits) && (
        <CoachmarkAnchor id="share-bill" shape="rect" padding={8}>
          <ActionBar
            onScanReceipt={handleScanReceipt}
            onShareBill={handleShareBill}
            scanning={scanning}
            sharing={sharing}
            hasItems={hasItems}
            hasRabbits={hasRabbits}
          />
        </CoachmarkAnchor>
      )}

      {/* Add Rabbit Modal */}
      <AddRabbitModal
        visible={showAddRabbit}
        onClose={() => setShowAddRabbit(false)}
        onAdd={(name, color, prof) => addRabbit(name, color, prof)}
        usedColors={rabbits.map((r) => r.color as RabbitColor)}
        isPro={isPro}
        savedRabbits={savedRabbits}
        onAddSavedRabbit={addSaved}
        onRemoveSavedRabbit={removeSaved}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
    {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
    <Animated.View style={[styles.scrollTopButton, scrollTopStyle]}>
      <TouchableOpacity onPress={scrollToTop} activeOpacity={0.8}>
        <Text style={styles.scrollTopText}>↑</Text>
      </TouchableOpacity>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  actionButtonOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonOutlineText: {
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  actionButtonFilled: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonFilledText: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  hintRow: {
    marginBottom: 8,
  },
  assignHint: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
    marginBottom: 8,
  },
  assignHintName: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  bottomPadding: {
    height: 40,
  },
  scrollTopButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a08c64',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  scrollTopText: {
    fontSize: 20,
    color: colors.text,
    fontFamily: fonts.bodyBold,
  },
});
