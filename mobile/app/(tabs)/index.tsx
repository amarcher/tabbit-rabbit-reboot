import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useTabs } from '@/src/hooks/useTab';
import type { Tab } from '@/src/types';

function TabRow({
  tab,
  onPress,
  onDelete,
}: {
  tab: Tab;
  onPress: () => void;
  onDelete: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

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
        <Text style={styles.tabName}>{tab.name}</Text>
        <Text style={styles.tabDate}>
          {new Date(tab.created_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function DashboardScreen() {
  const { tabs, loading, createTab, deleteTab } = useTabs();
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.createForm}>
        <TextInput
          style={styles.createInput}
          placeholder="New tab name (e.g. Friday Dinner)"
          placeholderTextColor="#999"
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

      {tabs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No tabs yet. Create one to start splitting a bill!
          </Text>
        </View>
      ) : (
        <FlatList
          data={tabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TabRow
              tab={item}
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
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createForm: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dee2e6',
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  createButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333',
  },
  list: {
    padding: 16,
  },
  tabRow: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dee2e6',
  },
  tabName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  tabDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  deleteAction: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  cancelAction: {
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
