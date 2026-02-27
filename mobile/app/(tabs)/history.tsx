import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBillCache } from '@/src/hooks/useBillCache';
import { formatCents } from '@/src/utils/currency';
import { colors, fonts } from '@/src/utils/theme';

export default function BillHistoryScreen() {
  const { cachedBills, loading, refresh } = useBillCache();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (cachedBills.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Bills Yet</Text>
        <Text style={styles.emptyText}>
          Bills you view from shared links will appear here for offline access.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={cachedBills}
      keyExtractor={(item) => item.shareToken}
      onRefresh={refresh}
      refreshing={loading}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push(`/bill/${item.shareToken}`)}
        >
          <View style={styles.rowInfo}>
            <Text style={styles.tabName}>{item.tabName}</Text>
            {item.ownerName && (
              <Text style={styles.ownerName}>by {item.ownerName}</Text>
            )}
            <Text style={styles.viewedDate}>
              {new Date(item.viewedAt).toLocaleDateString()} at{' '}
              {new Date(item.viewedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Text style={styles.total}>{formatCents(item.totalCents)}</Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.bg,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowInfo: {
    flex: 1,
  },
  tabName: {
    fontSize: 17,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  ownerName: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  viewedDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  total: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    marginLeft: 12,
  },
});
