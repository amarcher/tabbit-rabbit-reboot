import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useAuth } from '@/src/hooks/useAuth';
import { getStoredApiKey, setStoredApiKey, removeStoredApiKey } from '@/src/utils/anthropic';
import { remainingFreeScans, FREE_SCAN_LIMIT } from '@/src/utils/scanCounter';

export default function ProfileScreen() {
  const { profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [saving, setSaving] = useState(false);

  // BYOK state
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [storedKeyPreview, setStoredKeyPreview] = useState('');
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
    getStoredApiKey().then((key) => {
      if (key) {
        setHasStoredKey(true);
        setStoredKeyPreview(`...${key.slice(-4)}`);
      }
    });
    remainingFreeScans().then(setFreeScansLeft);
  }, []);

  const stripPrefix = (val: string) => val.replace(/^[@$]/, '');

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

  const handleSaveApiKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    await setStoredApiKey(trimmed);
    setHasStoredKey(true);
    setStoredKeyPreview(`...${trimmed.slice(-4)}`);
    setApiKey('');
    Alert.alert('Saved', 'API key stored securely on device.');
  };

  const handleRemoveApiKey = () => {
    Alert.alert('Remove API Key', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeStoredApiKey();
          setHasStoredKey(false);
          setStoredKeyPreview('');
        },
      },
    ]);
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
          placeholderTextColor="#999"
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
          placeholderTextColor="#999"
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
          placeholderTextColor="#999"
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
          placeholderTextColor="#999"
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

      {/* Advanced Section */}
      <View style={styles.advancedSection}>
        <Text style={styles.advancedTitle}>Advanced</Text>
        <Text style={styles.advancedHint}>
          {freeScansLeft} of {FREE_SCAN_LIMIT} free receipt scans remaining this month.
        </Text>

        {hasStoredKey ? (
          <View>
            <Text style={styles.label}>Anthropic API Key</Text>
            <View style={styles.keyRow}>
              <Text style={styles.keyPreview}>{storedKeyPreview}</Text>
              <TouchableOpacity onPress={handleRemoveApiKey}>
                <Text style={styles.removeKeyText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.advancedHint}>
              Using your own key — unlimited scans.
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Anthropic API Key</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-ant-..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.advancedHint}>
              Use your own API key for unlimited scans. Stored on-device only.
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, { marginTop: 8 }, !apiKey.trim() && styles.saveButtonDisabled]}
              onPress={handleSaveApiKey}
              disabled={!apiKey.trim()}
            >
              <Text style={styles.saveButtonText}>Save API Key</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 8 }}
              onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}
            >
              <Text style={styles.linkText}>Get a key at console.anthropic.com</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#0d6efd',
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
  advancedSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  advancedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  advancedHint: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  keyPreview: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'SpaceMono',
  },
  removeKeyText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
  },
  linkText: {
    color: '#0d6efd',
    fontSize: 14,
  },
});
