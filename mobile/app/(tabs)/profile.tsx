import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { useProStatus } from '@/src/hooks/useProStatus';
import { useSavedRabbits } from '@/src/hooks/useSavedRabbits';
import { remainingFreeScans, FREE_SCAN_LIMIT } from '@/src/utils/scanCounter';
import { BUTTON_COLORS } from '@/src/utils/colors';
import { colors } from '@/src/utils/theme';
import type { SavedRabbit } from '@/src/types';

export default function ProfileScreen() {
  const { profile, updateProfile } = useAuth();
  const { isPro, product, purchasing, purchasePro, restorePurchases } = useProStatus();
  const { savedRabbits, refresh: refreshSavedRabbits, removeSaved, updateSaved } = useSavedRabbits();

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
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [saving, setSaving] = useState(false);
  const [freeScansLeft, setFreeScansLeft] = useState(FREE_SCAN_LIMIT);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
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
      'Remove Saved Rabbit',
      `Remove ${rabbit.name} from your saved rabbits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSaved(rabbit.id) },
      ]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        venmo_username: stripPrefix(venmo.trim()) || null,
        cashapp_cashtag: stripPrefix(cashapp.trim()) || null,
        paypal_username: stripPrefix(paypal.trim()) || null,
      });
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.field}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Venmo Username</Text>
        <TextInput
          style={styles.input}
          value={venmo}
          onChangeText={setVenmo}
          placeholder="username"
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
          placeholder="cashtag"
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
          placeholder="username"
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
          {saving ? 'Saving...' : 'Save Profile'}
        </Text>
      </TouchableOpacity>

      {/* Tabbit Pro Section */}
      <View style={styles.proSection}>
        <Text style={styles.proTitle}>Tabbit Pro</Text>
        {isPro ? (
          <View style={styles.proBadgeRow}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.proBadgeLabel}>Unlimited receipt scans</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.proDescription}>
              Unlock unlimited receipt scans with a one-time purchase.
            </Text>
            <Text style={styles.scanCountHint}>
              {freeScansLeft} of {FREE_SCAN_LIMIT} free scans remaining this month.
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
                  Upgrade — {product?.displayPrice ?? '$4.99'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 10, alignItems: 'center' }}
              onPress={async () => {
                const restored = await restorePurchases();
                Alert.alert(
                  restored ? 'Restored' : 'Not Found',
                  restored
                    ? 'Tabbit Pro has been restored.'
                    : 'No previous purchase found.',
                );
              }}
              disabled={purchasing}
            >
              <Text style={styles.linkText}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Saved Rabbits Section (Pro only) */}
      {isPro && (
        <View style={styles.proSection}>
          <Text style={styles.proTitle}>Saved Rabbits</Text>
          {savedRabbits.length === 0 ? (
            <Text style={styles.proDescription}>
              Rabbits you add with payment info will appear here.
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
                          {editingRabbitId === rabbit.id ? 'Cancel' : 'Edit'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDeleteRabbit(rabbit)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {editingRabbitId === rabbit.id && (
                    <View style={styles.editFields}>
                      <TextInput
                        style={styles.input}
                        value={editVenmo}
                        onChangeText={setEditVenmo}
                        placeholder="Venmo username"
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TextInput
                        style={styles.input}
                        value={editCashapp}
                        onChangeText={setEditCashapp}
                        placeholder="Cash App $cashtag"
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TextInput
                        style={styles.input}
                        value={editPaypal}
                        onChangeText={setEditPaypal}
                        placeholder="PayPal username"
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.saveEditButton}
                        onPress={() => saveRabbitEdit(rabbit.id)}
                      >
                        <Text style={styles.saveEditButtonText}>Save</Text>
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
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
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
    fontWeight: '600',
  },
  proSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  proDescription: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  scanCountHint: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
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
    fontWeight: '700',
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
    fontWeight: '800',
  },
  proBadgeLabel: {
    fontSize: 14,
    color: colors.muted,
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
    fontWeight: '600',
    color: colors.text,
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
    fontWeight: '700',
    color: colors.accent,
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
    fontWeight: '600',
    fontSize: 14,
  },
});
