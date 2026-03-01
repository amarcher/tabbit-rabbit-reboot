import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatAmount } from '@/src/utils/currency';
import { colors, fonts } from '@/src/utils/theme';

export default function BillHistoryScreen() {
  const { t } = useTranslation();
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
        <Text style={styles.emptyTitle}>{t('messages.noBillsYet')}</Text>
        <Text style={styles.emptyText}>{t('messages.noBillsDesc')}</Text>
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
              <Text style={styles.ownerName}>{t('messages.sharedBy', { name: item.ownerName })}</Text>
            )}
            <Text style={styles.viewedDate}>
              {new Date(item.viewedAt).toLocaleDateString()} at{' '}
              {new Date(item.viewedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Text style={styles.total}>{formatAmount(item.totalCents, item.currencyCode || 'USD')}</Text>
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
