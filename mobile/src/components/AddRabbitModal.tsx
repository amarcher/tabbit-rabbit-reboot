import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { RABBIT_COLORS, RabbitColor } from '../types';
import type { SavedRabbit, Profile } from '../types';
import { BUTTON_COLORS } from '../utils/colors';

interface AddRabbitModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, color: RabbitColor, profile?: Profile) => void;
  usedColors: RabbitColor[];
  isPro?: boolean;
  savedRabbits?: SavedRabbit[];
  onAddSavedRabbit?: (saved: SavedRabbit) => void;
  onRemoveSavedRabbit?: (id: string) => void;
}

export default function AddRabbitModal({
  visible,
  onClose,
  onAdd,
  usedColors,
  isPro = false,
  savedRabbits = [],
  onAddSavedRabbit,
  onRemoveSavedRabbit,
}: AddRabbitModalProps) {
  const [name, setName] = useState('');
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [showPaymentFields, setShowPaymentFields] = useState(false);

  const nextColor =
    RABBIT_COLORS.find((c) => !usedColors.includes(c)) || RABBIT_COLORS[0];

  const stripPrefix = (val: string) => val.replace(/^[@$]/, '');

  const resetForm = () => {
    setName('');
    setVenmo('');
    setCashapp('');
    setPaypal('');
    setShowPaymentFields(false);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const venmoClean = stripPrefix(venmo.trim()) || null;
    const cashappClean = stripPrefix(cashapp.trim()) || null;
    const paypalClean = stripPrefix(paypal.trim()) || null;
    const hasPayment = venmoClean || cashappClean || paypalClean;

    // Build profile if payment handles exist
    let profile: Profile | undefined;
    if (isPro && hasPayment) {
      profile = {
        id: Crypto.randomUUID(),
        username: name.trim().toLowerCase().replace(/\s+/g, '-'),
        display_name: name.trim(),
        venmo_username: venmoClean,
        cashapp_cashtag: cashappClean,
        paypal_username: paypalClean,
        created_at: new Date().toISOString(),
      };

      // Auto-save to library
      onAddSavedRabbit?.({
        id: Crypto.randomUUID(),
        name: name.trim(),
        color: nextColor,
        venmo_username: venmoClean,
        cashapp_cashtag: cashappClean,
        paypal_username: paypalClean,
      });
    }

    onAdd(name.trim(), nextColor, profile);
    resetForm();
    onClose();
  };

  const handleQuickAdd = (saved: SavedRabbit) => {
    const profile: Profile = {
      id: Crypto.randomUUID(),
      username: saved.name.toLowerCase().replace(/\s+/g, '-'),
      display_name: saved.name,
      venmo_username: saved.venmo_username,
      cashapp_cashtag: saved.cashapp_cashtag,
      paypal_username: saved.paypal_username,
      created_at: new Date().toISOString(),
    };

    // Use saved color if available, otherwise next available
    const color = usedColors.includes(saved.color) ? nextColor : saved.color;
    onAdd(saved.name, color, profile);
    resetForm();
    onClose();
  };

  const handleLongPressSaved = (saved: SavedRabbit) => {
    Alert.alert(
      'Remove Saved Rabbit',
      `Remove ${saved.name} from your saved rabbits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveSavedRabbit?.(saved.id),
        },
      ]
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={styles.title}>Add Someone</Text>

            {/* Saved Rabbits (Pro only) */}
            {isPro && savedRabbits.length > 0 && (
              <View style={styles.savedSection}>
                <Text style={styles.savedLabel}>Saved Rabbits</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedRow}
                >
                  {savedRabbits.map((saved) => (
                    <TouchableOpacity
                      key={saved.id}
                      style={[
                        styles.savedChip,
                        { borderColor: BUTTON_COLORS[saved.color].bg },
                      ]}
                      onPress={() => handleQuickAdd(saved)}
                      onLongPress={() => handleLongPressSaved(saved)}
                    >
                      <View
                        style={[
                          styles.chipDot,
                          { backgroundColor: BUTTON_COLORS[saved.color].bg },
                        ]}
                      />
                      <Text style={styles.chipName}>{saved.name}</Text>
                      {(saved.venmo_username || saved.cashapp_cashtag || saved.paypal_username) && (
                        <Text style={styles.chipPayment}>$</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or add new</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>
            )}

            {/* Name Input */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType={isPro ? 'next' : 'done'}
              onSubmitEditing={isPro ? undefined : handleSubmit}
            />

            {/* Color Preview */}
            <View style={styles.colorRow}>
              <Text style={styles.colorLabel}>Color:</Text>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: BUTTON_COLORS[nextColor].bg },
                ]}
              />
            </View>

            {/* Payment Fields (Pro only) */}
            {isPro && (
              <>
                {!showPaymentFields ? (
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setShowPaymentFields(true)}
                  >
                    <Text style={styles.expandButtonText}>+ Add payment info</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.paymentFields}>
                    <Text style={styles.paymentLabel}>Payment Info (optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Venmo username"
                      placeholderTextColor="#999"
                      value={venmo}
                      onChangeText={setVenmo}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Cash App $cashtag"
                      placeholderTextColor="#999"
                      value={cashapp}
                      onChangeText={setCashapp}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="PayPal username"
                      placeholderTextColor="#999"
                      value={paypal}
                      onChangeText={setPaypal}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    <Text style={styles.paymentHint}>
                      Adding payment info saves this rabbit for future tabs.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, !name.trim() && styles.addButtonDisabled]}
                onPress={handleSubmit}
                disabled={!name.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  savedSection: {
    marginBottom: 8,
  },
  savedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  savedRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chipPayment: {
    fontSize: 12,
    fontWeight: '700',
    color: '#198754',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dee2e6',
  },
  dividerText: {
    fontSize: 12,
    color: '#999',
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
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  colorLabel: {
    fontSize: 14,
    color: '#666',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  expandButton: {
    marginBottom: 16,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#0d6efd',
    fontWeight: '600',
  },
  paymentFields: {
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  paymentHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#6c757d',
  },
  cancelText: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0d6efd',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
