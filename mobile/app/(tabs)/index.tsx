import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { CoachmarkAnchor, useCoachmark } from '@edwardloopez/react-native-coachmark';
import { useTabs } from '@/src/hooks/useTab';
import { formatCents } from '@/src/utils/currency';
import { BUTTON_COLORS } from '@/src/utils/colors';
import { colors, fonts } from '@/src/utils/theme';
import { TabListSkeleton } from '@/src/components/Skeleton';
import { homeTour } from '@/src/utils/onboardingTour';
import type { Tab, Item, Rabbit } from '@/src/types';

function TabRow({
  tab,
  items,
  rabbits,
  onPress,
  onDelete,
}: {
  tab: Tab;
  items: Item[];
  rabbits: Rabbit[];
  onPress: () => void;
  onDelete: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const subtotalCents = items.reduce((sum, i) => sum + i.price_cents, 0);
  const totalCents = Math.round(
    subtotalCents * (1 + tab.tax_percent / 100 + tab.tip_percent / 100)
  );

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelAction}
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
      <TouchableOpacity style={styles.tabRow} onPress={onPress}>
        {/* Row 1: Name + Total */}
        <View style={styles.tableRow}>
          <Text style={styles.tabName} numberOfLines={1}>{tab.name}</Text>
          {totalCents > 0 && (
            <Text style={styles.tabTotal}>{formatCents(totalCents)}</Text>
          )}
        </View>
        {/* Row 2: Rabbits + Date */}
        <View style={styles.tableRow}>
          <View style={styles.rabbitChips}>
            {rabbits.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.rabbitChip,
                  { backgroundColor: BUTTON_COLORS[r.color].bg },
                ]}
              >
                <Text
                  style={[
                    styles.rabbitChipText,
                    { color: BUTTON_COLORS[r.color].text },
                  ]}
                >
                  {r.name}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.tabDate}>
            {new Date(tab.created_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function DashboardScreen() {
  const { tabs, loading, createTab, deleteTab } = useTabs();
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [tabDataMap, setTabDataMap] = useState<
    Record<string, { items: Item[]; rabbits: Rabbit[] }>
  >({});

  const { start, isActive } = useCoachmark();

  // Auto-start home tour for new users with no tabs
  useEffect(() => {
    if (!loading && tabs.length === 0 && !isActive) {
      const timer = setTimeout(() => start(homeTour), 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, tabs.length, isActive, start]);

  const loadTabData = useCallback(async () => {
    if (tabs.length === 0) return;
    const keys = tabs.map((t) => `@tab:${t.id}`);
    const results = await AsyncStorage.multiGet(keys);
    const map: Record<string, { items: Item[]; rabbits: Rabbit[] }> = {};
    for (const [key, raw] of results) {
      if (raw) {
        const data = JSON.parse(raw);
        const id = key.replace('@tab:', '');
        map[id] = { items: data.items || [], rabbits: data.rabbits || [] };
      }
    }
    setTabDataMap(map);
  }, [tabs]);

  useFocusEffect(
    useCallback(() => {
      loadTabData();
    }, [loadTabData])
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const tab = await createTab(newName.trim());
      setNewName('');
      if (tab) {
        router.push(`/tab/${tab.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.createForm}>
          <TextInput
            style={styles.createInput}
            placeholder="New tab name (e.g. Friday Dinner)"
            placeholderTextColor={colors.placeholder}
            value={newName}
            onChangeText={setNewName}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity
            style={[
              styles.createButton,
              (creating || !newName.trim()) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={creating || !newName.trim()}
          >
            <Text style={styles.createButtonText}>
              {creating ? 'Creating...' : 'New Tab'}
            </Text>
          </TouchableOpacity>
        </View>
        <TabListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CoachmarkAnchor id="create-tab" shape="rect" padding={8}>
        <View style={styles.createForm}>
          <TextInput
            style={styles.createInput}
            placeholder={
              tabs.length === 0
                ? 'Type a tab name to create one'
                : 'New tab name (e.g. Friday Dinner)'
            }
            placeholderTextColor={colors.placeholder}
            value={newName}
            onChangeText={setNewName}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity
            style={[
              styles.createButton,
              (creating || !newName.trim()) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={creating || !newName.trim()}
          >
            <Text style={styles.createButtonText}>
              {creating ? 'Creating...' : 'New Tab'}
            </Text>
          </TouchableOpacity>
        </View>
      </CoachmarkAnchor>

      {tabs.length === 0 ? (
        <View style={styles.emptyState} />
      ) : (
        <FlatList
          data={tabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TabRow
              tab={item}
              items={tabDataMap[item.id]?.items ?? []}
              rabbits={tabDataMap[item.id]?.rabbits ?? []}
              onPress={() => router.push(`/tab/${item.id}`)}
              onDelete={() => deleteTab(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  createForm: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontFamily: fonts.body,
  },
  createButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.bodyBold,
  },
  list: {
    padding: 16,
  },
  tabRow: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 6,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabName: {
    fontSize: 17,
    color: colors.text,
    flex: 1,
    marginRight: 12,
    fontFamily: fonts.headingSemiBold,
  },
  tabTotal: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.bodyBold,
  },
  rabbitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  rabbitChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rabbitChipText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  tabDate: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  deleteAction: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  cancelAction: {
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  emptyState: {
    flex: 1,
  },
});
