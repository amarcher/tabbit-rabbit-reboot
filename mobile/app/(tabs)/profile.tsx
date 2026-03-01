import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
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
  const [editVenmo, setEditVenmo] = useState('');
  const [editCashapp, setEditCashapp] = useState('');
  const [editPaypal, setEditPaypal] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [saving, setSaving] = useState(false);
  const [freeScansLeft, setFreeScansLeft] = useState(FREE_SCAN_LIMIT);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setCurrencyCode(profile.currency_code || 'USD');
      setVenmo(profile.venmo_username || '');
      setCashapp(profile.cashapp_cashtag || '');
      setPaypal(profile.paypal_username || '');
    }
  }, [profile]);

  useEffect(() => {
    remainingFreeScans().then(setFreeScansLeft);
  }, []);

  const stripPrefix = (val: string) => val.replace(/^[@$]/, '');

  const startEditingRabbit = (rabbit: SavedRabbit) => {
    setEditingRabbitId(rabbit.id);
    setEditVenmo(rabbit.venmo_username || '');
    setEditCashapp(rabbit.cashapp_cashtag || '');
    setEditPaypal(rabbit.paypal_username || '');
  };

  const saveRabbitEdit = async (id: string) => {
    await updateSaved(id, {
      venmo_username: stripPrefix(editVenmo.trim()) || null,
      cashapp_cashtag: stripPrefix(editCashapp.trim()) || null,
      paypal_username: stripPrefix(editPaypal.trim()) || null,
    });
    setEditingRabbitId(null);
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
      await updateProfile({
        display_name: displayName.trim() || null,
        currency_code: currencyCode,
        venmo_username: stripPrefix(venmo.trim()) || null,
        cashapp_cashtag: stripPrefix(cashapp.trim()) || null,
        paypal_username: stripPrefix(paypal.trim()) || null,
      });
      showToast(t('messages.profileUpdated'), 'success');
    } catch (err: any) {
      Alert.alert(t('messages.error'), err.message || t('messages.profileSaveFailed'));
    } finally {
      setSaving(false);
    }
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
        <TouchableOpacity
          style={styles.currencyPicker}
          onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
        >
          <Text style={styles.currencyPickerText}>
            {CURRENCIES.find((c) => c.code === currencyCode)?.symbol || ''}{' '}
            {currencyCode}
          </Text>
          <Text style={styles.currencyPickerArrow}>{showCurrencyPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showCurrencyPicker && (
          <View style={styles.currencyList}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.currencyOption,
                  c.code === currencyCode && styles.currencyOptionSelected,
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
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.currencyHint}>{t('messages.currencyHint')}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('profile.languageLabel', 'Language')}</Text>
        <TouchableOpacity
          style={styles.currencyPicker}
          onPress={() => setShowLanguagePicker(!showLanguagePicker)}
        >
          <Text style={styles.currencyPickerText}>
            {LANGUAGES.find((l) => l.code === language)?.name || 'English'}
          </Text>
          <Text style={styles.currencyPickerArrow}>{showLanguagePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showLanguagePicker && (
          <View style={styles.currencyList}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.currencyOption,
                  l.code === language && styles.currencyOptionSelected,
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
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Venmo Username</Text>
        <TextInput
          style={styles.input}
          value={venmo}
          onChangeText={setVenmo}
          placeholder={t('placeholders.username')}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Cash App $Cashtag</Text>
        <TextInput
          style={styles.input}
          value={cashapp}
          onChangeText={setCashapp}
          placeholder={t('placeholders.cashtag')}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>PayPal Username</Text>
        <TextInput
          style={styles.input}
          value={paypal}
          onChangeText={setPaypal}
          placeholder={t('placeholders.username')}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? t('actions.saving') : t('actions.saveProfile')}
        </Text>
      </TouchableOpacity>

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
            <TouchableOpacity
              style={[styles.proButton, purchasing && styles.saveButtonDisabled]}
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
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 10, alignItems: 'center' }}
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
            </TouchableOpacity>
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
              {savedRabbits.map((rabbit) => (
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
                      {rabbit.venmo_username && (
                        <View style={styles.handleBadge}>
                          <Text style={styles.handleBadgeText}>Venmo</Text>
                        </View>
                      )}
                      {rabbit.cashapp_cashtag && (
                        <View style={[styles.handleBadge, styles.cashappBadge]}>
                          <Text style={[styles.handleBadgeText, styles.cashappBadgeText]}>Cash</Text>
                        </View>
                      )}
                      {rabbit.paypal_username && (
                        <View style={[styles.handleBadge, styles.paypalBadge]}>
                          <Text style={[styles.handleBadgeText, styles.paypalBadgeText]}>PayPal</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.savedRabbitActions}>
                      <TouchableOpacity onPress={() =>
                        editingRabbitId === rabbit.id
                          ? setEditingRabbitId(null)
                          : startEditingRabbit(rabbit)
                      }>
                        <Text style={styles.linkText}>
                          {editingRabbitId === rabbit.id ? t('actions.cancel') : t('actions.edit')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDeleteRabbit(rabbit)}>
                        <Text style={styles.deleteText}>{t('actions.delete')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {editingRabbitId === rabbit.id && (
                    <View style={styles.editFields}>
                      <TextInput
                        style={styles.input}
                        value={editVenmo}
                        onChangeText={setEditVenmo}
                        placeholder={t('placeholders.venmoUsername')}
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TextInput
                        style={styles.input}
                        value={editCashapp}
                        onChangeText={setEditCashapp}
                        placeholder={t('placeholders.cashAppCashtag')}
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TextInput
                        style={styles.input}
                        value={editPaypal}
                        onChangeText={setEditPaypal}
                        placeholder={t('placeholders.paypalUsername')}
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.saveEditButton}
                        onPress={() => saveRabbitEdit(rabbit.id)}
                      >
                        <Text style={styles.saveEditButtonText}>{t('actions.save')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
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
    borderColor: colors.accent,
  },
  handleBadgeText: {
    fontSize: 10,
    color: colors.accent,
    fontFamily: fonts.bodyBold,
  },
  cashappBadge: {
    borderColor: '#198754',
  },
  cashappBadgeText: {
    color: '#198754',
  },
  paypalBadge: {
    borderColor: '#0dcaf0',
  },
  paypalBadgeText: {
    color: '#0dcaf0',
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
