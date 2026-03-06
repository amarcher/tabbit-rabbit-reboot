import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useBillCache } from '@/src/hooks/useBillCache';
import { formatAmount } from '@/src/utils/currency';
import { colors, fonts } from '@/src/utils/theme';

const PRESSED_STYLE = { opacity: 0.7 } as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

interface BillRowProps {
  shareToken: string;
  tabName: string;
  ownerName: string | null;
  totalCents: number;
  currencyCode: string;
  viewedAt: string;
  onPress: (token: string) => void;
  onDelete: (token: string) => void;
}

const BillRow = React.memo(function BillRow({
  shareToken,
  tabName,
  ownerName,
  totalCents,
  currencyCode,
  viewedAt,
  onPress,
  onDelete,
}: BillRowProps) {
  const { t } = useTranslation();
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback(() => (
    <View style={styles.swipeActions}>
      <Pressable
        style={({ pressed }) => [styles.deleteAction, pressed && PRESSED_STYLE]}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete(shareToken);
        }}
      >
        <Text style={styles.actionText}>{t('actions.delete')}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.cancelAction, pressed && PRESSED_STYLE]}
        onPress={() => swipeableRef.current?.close()}
      >
        <Text style={styles.actionText}>{t('actions.cancel')}</Text>
      </Pressable>
    </View>
  ), [shareToken, onDelete, t]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
    >
      <Pressable
        style={({ pressed }) => [styles.row, pressed && PRESSED_STYLE]}
        onPress={() => onPress(shareToken)}
      >
        <View style={styles.rowInfo}>
          <Text style={styles.tabName}>{tabName}</Text>
          {ownerName && (
            <Text style={styles.ownerName}>{t('messages.sharedBy', { name: ownerName })}</Text>
          )}
          <Text style={styles.viewedDate}>
            {dateFormatter.format(new Date(viewedAt))} at{' '}
            {timeFormatter.format(new Date(viewedAt))}
          </Text>
        </View>
        <Text style={styles.total}>{formatAmount(totalCents, currencyCode || 'USD')}</Text>
      </Pressable>
    </Swipeable>
  );
});

export default function BillHistoryScreen() {
  const { t } = useTranslation();
  const { cachedBills, loading, refresh, removeBill } = useBillCache();
  const router = useRouter();

  // Re-read from AsyncStorage whenever this tab gains focus
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handlePress = useCallback((token: string) => {
    router.push(`/bill/${token}`);
  }, [router]);

  const handleDelete = useCallback((token: string) => {
    removeBill(token);
  }, [removeBill]);

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
        <BillRow
          shareToken={item.shareToken}
          tabName={item.tabName}
          ownerName={item.ownerName}
          totalCents={item.totalCents}
          currencyCode={item.currencyCode}
          viewedAt={item.viewedAt}
          onPress={handlePress}
          onDelete={handleDelete}
        />
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
});
