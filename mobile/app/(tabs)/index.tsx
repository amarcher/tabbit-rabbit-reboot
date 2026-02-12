import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { useTabs } from '@/src/hooks/useTab';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { tabs, loading, createTab, deleteTab } = useTabs(user?.id);
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

  const handleDelete = (tabId: string, tabName: string) => {
    Alert.alert(
      `Delete "${tabName}"?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTab(tabId) },
      ]
    );
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
            <TouchableOpacity
              style={styles.tabRow}
              onPress={() => router.push(`/tab/${item.id}`)}
            >
              <View style={styles.tabInfo}>
                <Text style={styles.tabName}>{item.name}</Text>
                <Text style={styles.tabDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id, item.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteText}>&times;</Text>
              </TouchableOpacity>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dee2e6',
  },
  tabInfo: {
    flex: 1,
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
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteText: {
    color: '#dc3545',
    fontSize: 18,
    fontWeight: '600',
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
