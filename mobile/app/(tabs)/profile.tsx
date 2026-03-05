import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useToast } from '@/src/components/Toast';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { useProStatus } from '@/src/hooks/useProStatus';
import { useSavedRabbits } from '@/src/hooks/useSavedRabbits';
import { remainingFreeScans, FREE_SCAN_LIMIT } from '@/src/utils/scanCounter';
import { BUTTON_COLORS } from '@/src/utils/colors';
import { colors, fonts } from '@/src/utils/theme';
import { CURRENCIES } from '@/src/utils/currency';
import i18n from '@/src/i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedRabbit } from '@/src/types';
import {
  providersForRegion,
  regionFromCurrency,
  PAYMENT_PROVIDERS,
  profileToHandles,
  handlesToLegacyFields,
  type PaymentHandle,
} from '@/src/utils/paymentProviders';

const PRESSED_STYLE = { opacity: 0.7 } as const;

const LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ru', name: 'Русский' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, updateProfile } = useAuth();
  const { isPro, product, purchasing, purchasePro, restorePurchases } = useProStatus();
  const { savedRabbits, refresh: refreshSavedRabbits, removeSaved, updateSaved } = useSavedRabbits();
  const { showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      refreshSavedRabbits();
    }, [refreshSavedRabbits])
  );

  const [displayName, setDisplayName] = useState('');
  const [editingRabbitId, setEditingRabbitId] = useState<string | null>(null);
  const [editHandles, setEditHandles] = useState<Record<string, string>>({});
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [showMoreProviders, setShowMoreProviders] = useState(false);
  const [showMoreEditProviders, setShowMoreEditProviders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [freeScansLeft, setFreeScansLeft] = useState(FREE_SCAN_LIMIT);

  const region = regionFromCurrency(currencyCode);
  const regionProviders = providersForRegion(region);
  const extraProviders = PAYMENT_PROVIDERS.filter(
    (p) => !regionProviders.find((rp) => rp.id === p.id)
  );

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setCurrencyCode(profile.currency_code || 'USD');
      // Populate handles from profileToHandles
      const profileHandles = profileToHandles(profile);
      const handlesMap: Record<string, string> = {};
      for (const h of profileHandles) {
        handlesMap[h.provider] = h.username;
      }
      setHandles(handlesMap);
    }
  }, [profile]);

  useEffect(() => {
    remainingFreeScans().then(setFreeScansLeft);
  }, []);

  const stripPrefix = (val: string) => val.replace(/^[@$]/, '');

  const buildHandlesArray = (handlesMap: Record<string, string>): PaymentHandle[] =>
    Object.entries(handlesMap)
      .filter(([, username]) => username.trim())
      .map(([provider, username]) => ({
        provider: provider as PaymentHandle['provider'],
        username: stripPrefix(username.trim()),
      }));

  const startEditingRabbit = (rabbit: SavedRabbit) => {
    setEditingRabbitId(rabbit.id);
    setShowMoreEditProviders(false);
    const rabbitHandles = profileToHandles({
      venmo_username: rabbit.venmo_username,
      cashapp_cashtag: rabbit.cashapp_cashtag,
      paypal_username: rabbit.paypal_username,
    });
    // Also check payment_handles if present
    const allHandles = rabbit.payment_handles && rabbit.payment_handles.length > 0
      ? rabbit.payment_handles
      : rabbitHandles;
    const handlesMap: Record<string, string> = {};
    for (const h of allHandles) {
      handlesMap[h.provider] = h.username;
    }
    setEditHandles(handlesMap);
  };

  const saveRabbitEdit = async (id: string) => {
    const handlesArray = buildHandlesArray(editHandles);
    const legacyFields = handlesToLegacyFields(handlesArray);
    await updateSaved(id, {
      venmo_username: legacyFields.venmo_username,
      cashapp_cashtag: legacyFields.cashapp_cashtag,
      paypal_username: legacyFields.paypal_username,
      payment_handles: handlesArray,
    });
    setEditingRabbitId(null);
    setEditHandles({});
  };

  const confirmDeleteRabbit = (rabbit: SavedRabbit) => {
    Alert.alert(
      t('messages.removeSavedRabbitTitle'),
      t('messages.confirmRemoveSavedRabbit', { name: rabbit.name }),
      [
        { text: t('actions.cancel'), style: 'cancel' },
        { text: t('actions.remove'), style: 'destructive', onPress: () => removeSaved(rabbit.id) },
      ]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const handlesArray = buildHandlesArray(handles);
      const legacyFields = handlesToLegacyFields(handlesArray);
      await updateProfile({
        display_name: displayName.trim() || null,
        currency_code: currencyCode,
        venmo_username: legacyFields.venmo_username,
        cashapp_cashtag: legacyFields.cashapp_cashtag,
        paypal_username: legacyFields.paypal_username,
        payment_handles: handlesArray,
      });
      showToast(t('messages.profileUpdated'), 'success');
    } catch (err: any) {
      Alert.alert(t('messages.error'), err.message || t('messages.profileSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const getRabbitHandleBadges = (rabbit: SavedRabbit) => {
    const rabbitHandles =
      rabbit.payment_handles && rabbit.payment_handles.length > 0
        ? rabbit.payment_handles
        : profileToHandles({
            venmo_username: rabbit.venmo_username,
            cashapp_cashtag: rabbit.cashapp_cashtag,
            paypal_username: rabbit.paypal_username,
          });
    return rabbitHandles;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.field}>
        <Text style={styles.label}>{t('labels.displayName')}</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t('placeholders.yourName')}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('labels.defaultCurrency')}</Text>
        <Pressable
          style={({ pressed }) => [styles.currencyPicker, pressed && PRESSED_STYLE]}
          onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
        >
          <Text style={styles.currencyPickerText}>
            {CURRENCIES.find((c) => c.code === currencyCode)?.symbol || ''}{' '}
            {currencyCode}
          </Text>
          <Text style={styles.currencyPickerArrow}>{showCurrencyPicker ? '▲' : '▼'}</Text>
        </Pressable>
        {showCurrencyPicker && (
          <ScrollView style={styles.currencyList} nestedScrollEnabled>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c.code}
                style={({ pressed }) => [
                  styles.currencyOption,
                  c.code === currencyCode && styles.currencyOptionSelected,
                  pressed && PRESSED_STYLE,
                ]}
                onPress={() => {
                  setCurrencyCode(c.code);
                  setShowCurrencyPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.currencyOptionText,
                    c.code === currencyCode && styles.currencyOptionTextSelected,
                  ]}
                >
                  {c.symbol} {c.code} — {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <Text style={styles.currencyHint}>{t('messages.currencyHint')}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('profile.languageLabel', 'Language')}</Text>
        <Pressable
          style={({ pressed }) => [styles.currencyPicker, pressed && PRESSED_STYLE]}
          onPress={() => setShowLanguagePicker(!showLanguagePicker)}
        >
          <Text style={styles.currencyPickerText}>
            {LANGUAGES.find((l) => l.code === language)?.name || 'English'}
          </Text>
          <Text style={styles.currencyPickerArrow}>{showLanguagePicker ? '▲' : '▼'}</Text>
        </Pressable>
        {showLanguagePicker && (
          <ScrollView style={styles.currencyList} nestedScrollEnabled>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                style={({ pressed }) => [
                  styles.currencyOption,
                  l.code === language && styles.currencyOptionSelected,
                  pressed && PRESSED_STYLE,
                ]}
                onPress={() => {
                  setLanguage(l.code);
                  i18n.changeLanguage(l.code);
                  AsyncStorage.setItem('tabbitrabbit:language', l.code);
                  setShowLanguagePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.currencyOptionText,
                    l.code === language && styles.currencyOptionTextSelected,
                  ]}
                >
                  {l.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Payment handles — region-relevant providers */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('labels.paymentInfoOptional', 'Payment Info (optional)')}</Text>
        {regionProviders.map((provider) => (
          <View key={provider.id} style={styles.paymentInputRow}>
            <Text style={styles.paymentProviderLabel}>{provider.name}</Text>
            <TextInput
              style={[styles.input, styles.paymentInput]}
              value={handles[provider.id] || ''}
              onChangeText={(text) =>
                setHandles((prev) => ({ ...prev, [provider.id]: text }))
              }
              placeholder={provider.placeholder}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
        {extraProviders.length > 0 && !showMoreProviders && (
          <Pressable
            style={({ pressed }) => [styles.moreButton, pressed && PRESSED_STYLE]}
            onPress={() => setShowMoreProviders(true)}
          >
            <Text style={styles.moreButtonText}>
              {t('actions.morePaymentOptions', 'More payment options')}
            </Text>
          </Pressable>
        )}
        {showMoreProviders && extraProviders.map((provider) => (
          <View key={provider.id} style={styles.paymentInputRow}>
            <Text style={styles.paymentProviderLabel}>{provider.name}</Text>
            <TextInput
              style={[styles.input, styles.paymentInput]}
              value={handles[provider.id] || ''}
              onChangeText={(text) =>
                setHandles((prev) => ({ ...prev, [provider.id]: text }))
              }
              placeholder={provider.placeholder}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          saving && styles.saveButtonDisabled,
          pressed && PRESSED_STYLE,
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? t('actions.saving') : t('actions.saveProfile')}
        </Text>
      </Pressable>

      {/* Tabbit Pro Section */}
      <View style={styles.proSection}>
        <Text style={styles.proTitle}>{t('labels.tabbitPro')}</Text>
        {isPro ? (
          <View style={styles.proBadgeRow}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.proBadgeLabel}>{t('messages.unlimitedScans')}</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.proDescription}>
              {t('messages.unlimitedScansDesc')}
            </Text>
            <Text style={styles.scanCountHint}>
              {t('messages.freeScansRemaining', { remaining: freeScansLeft, limit: FREE_SCAN_LIMIT })}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.proButton,
                purchasing && styles.saveButtonDisabled,
                pressed && PRESSED_STYLE,
              ]}
              onPress={purchasePro}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.proButtonText}>
                  {t('messages.upgradePrice', { price: product?.displayPrice ?? '$4.99' })}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.restoreButton, pressed && PRESSED_STYLE]}
              onPress={async () => {
                const restored = await restorePurchases();
                Alert.alert(
                  restored ? t('messages.restored') : t('messages.notFound'),
                  restored
                    ? t('messages.proRestored')
                    : t('messages.noPurchaseFound'),
                );
              }}
              disabled={purchasing}
            >
              <Text style={styles.linkText}>{t('actions.restorePurchases')}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Saved Rabbits Section (Pro only) */}
      {isPro && (
        <View style={styles.proSection}>
          <Text style={styles.proTitle}>{t('labels.savedRabbits')}</Text>
          {savedRabbits.length === 0 ? (
            <Text style={styles.proDescription}>
              {t('messages.noSavedRabbits')}
            </Text>
          ) : (
            <View style={styles.savedRabbitsList}>
              {savedRabbits.map((rabbit) => {
                const rabbitHandleBadges = getRabbitHandleBadges(rabbit);
                return (
                  <View key={rabbit.id} style={styles.savedRabbitCard}>
                    <View style={styles.savedRabbitHeader}>
                      <View style={styles.savedRabbitInfo}>
                        <View
                          style={[
                            styles.rabbitDot,
                            { backgroundColor: BUTTON_COLORS[rabbit.color].bg },
                          ]}
                        />
                        <Text style={styles.savedRabbitName}>{rabbit.name}</Text>
                        {rabbitHandleBadges.map((handle) => (
                          <View
                            key={handle.provider}
                            style={[styles.handleBadge, { borderColor: PAYMENT_PROVIDERS.find((p) => p.id === handle.provider)?.color || colors.accent }]}
                          >
                            <Text
                              style={[styles.handleBadgeText, { color: PAYMENT_PROVIDERS.find((p) => p.id === handle.provider)?.color || colors.accent }]}
                            >
                              {PAYMENT_PROVIDERS.find((p) => p.id === handle.provider)?.name || handle.provider}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.savedRabbitActions}>
                        <Pressable
                          style={({ pressed }) => [pressed && PRESSED_STYLE]}
                          onPress={() =>
                            editingRabbitId === rabbit.id
                              ? setEditingRabbitId(null)
                              : startEditingRabbit(rabbit)
                          }
                        >
                          <Text style={styles.linkText}>
                            {editingRabbitId === rabbit.id ? t('actions.cancel') : t('actions.edit')}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [pressed && PRESSED_STYLE]}
                          onPress={() => confirmDeleteRabbit(rabbit)}
                        >
                          <Text style={styles.deleteText}>{t('actions.delete')}</Text>
                        </Pressable>
                      </View>
                    </View>

                    {editingRabbitId === rabbit.id && (
                      <View style={styles.editFields}>
                        {regionProviders.map((provider) => (
                          <TextInput
                            key={provider.id}
                            style={styles.input}
                            value={editHandles[provider.id] || ''}
                            onChangeText={(text) =>
                              setEditHandles((prev) => ({ ...prev, [provider.id]: text }))
                            }
                            placeholder={`${provider.name} ${provider.placeholder}`}
                            placeholderTextColor={colors.placeholder}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        ))}
                        {extraProviders.length > 0 && !showMoreEditProviders && (
                          <Pressable
                            style={({ pressed }) => [styles.moreButton, pressed && PRESSED_STYLE]}
                            onPress={() => setShowMoreEditProviders(true)}
                          >
                            <Text style={styles.moreButtonText}>
                              {t('actions.morePaymentOptions', 'More payment options')}
                            </Text>
                          </Pressable>
                        )}
                        {showMoreEditProviders && extraProviders.map((provider) => (
                          <TextInput
                            key={provider.id}
                            style={styles.input}
                            value={editHandles[provider.id] || ''}
                            onChangeText={(text) =>
                              setEditHandles((prev) => ({ ...prev, [provider.id]: text }))
                            }
                            placeholder={`${provider.name} ${provider.placeholder}`}
                            placeholderTextColor={colors.placeholder}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        ))}
                        <Pressable
                          style={({ pressed }) => [styles.saveEditButton, pressed && PRESSED_STYLE]}
                          onPress={() => saveRabbitEdit(rabbit.id)}
                        >
                          <Text style={styles.saveEditButtonText}>{t('actions.save')}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
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
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 6,
    fontFamily: fonts.bodySemiBold,
  },
  input: {
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
  paymentInputRow: {
    marginBottom: 12,
  },
  paymentProviderLabel: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 4,
  },
  paymentInput: {
    marginBottom: 0,
  },
  moreButton: {
    marginBottom: 12,
  },
  moreButtonText: {
    fontSize: 14,
    color: colors.link,
    fontFamily: fonts.bodySemiBold,
  },
  currencyPicker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.inputBg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyPickerText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.body,
  },
  currencyPickerArrow: {
    fontSize: 12,
    color: colors.muted,
  },
  currencyList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    backgroundColor: colors.surface,
    overflow: 'hidden' as const,
  },
  currencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  currencyOptionSelected: {
    backgroundColor: colors.accent + '18',
  },
  currencyOptionText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.body,
  },
  currencyOptionTextSelected: {
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
  },
  currencyHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    fontFamily: fonts.body,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
  },
  proSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  proTitle: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
    fontFamily: fonts.heading,
  },
  proDescription: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
    fontFamily: fonts.body,
  },
  scanCountHint: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  proButton: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  proButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bodyBold,
  },
  proBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proBadge: {
    backgroundColor: '#f97316',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fonts.bodyBold,
  },
  proBadgeLabel: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  restoreButton: {
    marginTop: 10,
    alignItems: 'center' as const,
  },
  linkText: {
    color: colors.link,
    fontSize: 14,
  },
  savedRabbitsList: {
    gap: 10,
  },
  savedRabbitCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedRabbitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedRabbitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  rabbitDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  savedRabbitName: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
  },
  handleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  handleBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
  },
  savedRabbitActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 14,
  },
  editFields: {
    marginTop: 12,
    gap: 8,
  },
  saveEditButton: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  saveEditButtonText: {
    color: '#fff',
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});
