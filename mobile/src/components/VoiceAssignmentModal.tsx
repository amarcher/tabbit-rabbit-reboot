import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { COLOR_HEX } from '../types';
import { formatAmount } from '../utils/currency';
import {
  parseVoiceAssignmentDirect,
  parseVoiceAssignmentFree,
} from '../utils/voiceAssignment';
import type { VoiceAssignmentResult } from '../utils/voiceAssignment';
import { computeAssignmentFraction } from '@tabbit/shared';
import { canScanFree, incrementScanCount, FREE_SCAN_LIMIT } from '../utils/scanCounter';
import { colors, fonts, radii } from '../utils/theme';

// BYOK key stored in expo-secure-store
import * as SecureStore from 'expo-secure-store';
const BYOK_KEY = 'tabbitrabbit:anthropicKey';

async function getStoredApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(BYOK_KEY);
  } catch {
    return null;
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTranscript: string;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  currencyCode: string;
  onApply: (assignments: ItemRabbit[]) => void;
}

type Phase = 'review' | 'processing' | 'confirm';

const PRESSED_STYLE = { opacity: 0.7 } as const;

export default function VoiceAssignmentModal({
  visible,
  onClose,
  initialTranscript,
  items,
  rabbits,
  assignments,
  currencyCode,
  onApply,
}: Props) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>('review');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<VoiceAssignmentResult | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPhase('review');
      setTranscript(initialTranscript);
      setError('');
      setResult(null);
    }
  }, [visible, initialTranscript]);

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const byokKey = await getStoredApiKey();
    if (!byokKey && !(await canScanFree())) {
      setError(t('voiceAssignment.scanLimitReached', { limit: FREE_SCAN_LIMIT }));
      return;
    }

    setPhase('processing');
    setError('');

    try {
      let parsed: VoiceAssignmentResult;
      if (byokKey) {
        parsed = await parseVoiceAssignmentDirect(byokKey, text, items, rabbits, assignments);
      } else {
        parsed = await parseVoiceAssignmentFree(text, items, rabbits, assignments);
        await incrementScanCount();
      }
      setResult(parsed);
      setPhase('confirm');
    } catch (err: any) {
      setError(err.message || t('voiceAssignment.processingFailed'));
      setPhase('review');
    }
  }, [items, rabbits, assignments, t]);

  const handleApply = useCallback(() => {
    if (!result) return;
    onApply(result.assignments.map((a) => ({
      item_id: a.item_id,
      rabbit_id: a.rabbit_id,
      ...(a.share !== 1 ? { share: a.share } : {}),
    })));
    onClose();
  }, [result, onApply, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('voiceAssignment.title')}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [pressed && PRESSED_STYLE]}>
              <Text style={styles.closeBtn}>{'\u2715'}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {phase === 'review' && (
              <View>
                <Text style={styles.reviewTitle}>{t('voiceAssignment.reviewTitle')}</Text>
                <Text style={styles.instructions}>{t('voiceAssignment.instructions')}</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={t('voiceAssignment.inputPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={transcript}
                  onChangeText={setTranscript}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {phase === 'processing' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>{t('voiceAssignment.processing')}</Text>
              </View>
            )}

            {phase === 'confirm' && result && (
              <View>
                <Text style={styles.reviewLabel}>{t('voiceAssignment.reviewAssignments')}</Text>
                {result.assignments.length > 0 ? (
                  <View style={styles.assignmentList}>
                    {result.assignments.map((a, i) => {
                      const item = items.find((it) => it.id === a.item_id);
                      const rabbit = rabbits.find((r) => r.id === a.rabbit_id);
                      if (!item || !rabbit) return null;

                      const { fraction, isSplit, label: fractionLabel } = computeAssignmentFraction(
                        a,
                        result.assignments,
                        assignments,
                      );

                      return (
                        <View
                          key={i}
                          style={[
                            styles.assignmentRow,
                            { backgroundColor: COLOR_HEX[rabbit.color] || colors.surface },
                          ]}
                        >
                          <View style={styles.assignmentInfo}>
                            <Text style={styles.assignmentName}>{rabbit.name}</Text>
                            <Text style={styles.assignmentArrow}> {'\u2192'} </Text>
                            <Text style={styles.assignmentItem} numberOfLines={1}>
                              {item.description}
                            </Text>
                            <Text style={styles.assignmentPrice}>
                              {' '}({formatAmount(item.price_cents, currencyCode)})
                            </Text>
                          </View>
                          {isSplit && (
                            <View style={styles.fractionBadge}>
                              <View style={styles.fractionBarBg}>
                                <View style={[styles.fractionBarFill, { flex: fraction }, { backgroundColor: COLOR_HEX[rabbit.color] || colors.accent }]} />
                                <View style={{ flex: 1 - fraction }} />
                              </View>
                              <Text style={styles.fractionText}>
                                {fractionLabel}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>{t('voiceAssignment.noAssignmentsFound')}</Text>
                  </View>
                )}

                {result.warnings.length > 0 && (
                  <View style={styles.warningBox}>
                    {result.warnings.map((w, i) => (
                      <Text key={i} style={styles.warningText}>{w}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.footer}>
            {phase === 'review' && (
              <>
                <Pressable
                  style={({ pressed }) => [styles.footerBtnOutline, pressed && PRESSED_STYLE]}
                  onPress={onClose}
                >
                  <Text style={styles.footerBtnOutlineText}>{t('actions.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.footerBtnFilled,
                    !transcript.trim() && styles.footerBtnDisabled,
                    pressed && PRESSED_STYLE,
                  ]}
                  onPress={() => processTranscript(transcript)}
                  disabled={!transcript.trim()}
                >
                  <Text style={styles.footerBtnFilledText}>{t('voiceAssignment.commit')}</Text>
                </Pressable>
              </>
            )}
            {phase === 'confirm' && result && result.assignments.length > 0 && (
              <>
                <Pressable
                  style={({ pressed }) => [styles.footerBtnOutline, pressed && PRESSED_STYLE]}
                  onPress={() => setPhase('review')}
                >
                  <Text style={styles.footerBtnOutlineText}>{t('voiceAssignment.tryAgain')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.footerBtnFilled, pressed && PRESSED_STYLE]}
                  onPress={handleApply}
                >
                  <Text style={styles.footerBtnFilledText}>
                    {t('voiceAssignment.apply', { count: result.assignments.length })}
                  </Text>
                </Pressable>
              </>
            )}
            {phase === 'confirm' && result && result.assignments.length === 0 && (
              <Pressable
                style={({ pressed }) => [styles.footerBtnOutline, pressed && PRESSED_STYLE]}
                onPress={() => setPhase('review')}
              >
                <Text style={styles.footerBtnOutlineText}>{t('voiceAssignment.tryAgain')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  closeBtn: {
    fontSize: 18,
    color: colors.muted,
    padding: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  reviewTitle: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
    marginBottom: 4,
  },
  instructions: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 20,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.inputBg,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  reviewLabel: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  assignmentList: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  assignmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  assignmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assignmentName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  assignmentArrow: {
    fontSize: 14,
    color: colors.muted,
  },
  assignmentItem: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  assignmentPrice: {
    fontSize: 12,
    color: colors.muted,
  },
  fractionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 4,
  },
  fractionBarBg: {
    width: 32,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fractionBarFill: {
    height: '100%',
  },
  fractionText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    minWidth: 16,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
  },
  warningBox: {
    backgroundColor: colors.warningBg,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: colors.warningText,
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#842029',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerBtnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.muted,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerBtnOutlineText: {
    color: colors.muted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  footerBtnFilled: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerBtnFilledText: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  footerBtnDisabled: {
    opacity: 0.4,
  },
});
