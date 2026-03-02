import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { COLOR_HEX } from '../types';
import { formatAmount } from '../utils/currency';
import {
  parseVoiceAssignmentDirect,
  parseVoiceAssignmentFree,
} from '../utils/voiceAssignment';
import type { VoiceAssignmentResult } from '../utils/voiceAssignment';
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
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  currencyCode: string;
  onApply: (assignments: ItemRabbit[]) => void;
}

type Phase = 'input' | 'processing' | 'confirm';

const PRESSED_STYLE = { opacity: 0.7 } as const;

export default function VoiceAssignmentModal({
  visible,
  onClose,
  items,
  rabbits,
  assignments,
  currencyCode,
  onApply,
}: Props) {
  const { t, i18n } = useTranslation();

  const [phase, setPhase] = useState<Phase>('input');
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<VoiceAssignmentResult | null>(null);
  const recognizingRef = useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPhase('input');
      setRecording(false);
      setTranscript('');
      setTextInput('');
      setError('');
      setResult(null);
    }
  }, [visible]);

  // Speech recognition events
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setTranscript(text);
    if (event.isFinal) {
      setRecording(false);
      recognizingRef.current = false;
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error !== 'no-speech') {
      setError(event.error || 'Speech recognition error');
    }
    setRecording(false);
    recognizingRef.current = false;
  });

  useSpeechRecognitionEvent('end', () => {
    setRecording(false);
    recognizingRef.current = false;
  });

  const startRecording = useCallback(async () => {
    setError('');
    setTranscript('');

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError(t('voiceAssignment.permissionDenied'));
      return;
    }

    recognizingRef.current = true;
    setRecording(true);

    const speechLang = i18n.language === 'es' ? 'es-ES' : 'en-US';
    ExpoSpeechRecognitionModule.start({
      lang: speechLang,
      interimResults: true,
      continuous: true,
    });
  }, [t, i18n.language]);

  const stopRecording = useCallback(() => {
    if (recognizingRef.current) {
      ExpoSpeechRecognitionModule.stop();
    }
    recognizingRef.current = false;
    setRecording(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognizingRef.current) {
        ExpoSpeechRecognitionModule.stop();
      }
    };
  }, []);

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
      setPhase('input');
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

            {phase === 'input' && (
              <View>
                <Text style={styles.instructions}>{t('voiceAssignment.instructions')}</Text>

                {/* Mic button */}
                <View style={styles.micRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.micButton,
                      recording && styles.micButtonRecording,
                      pressed && PRESSED_STYLE,
                    ]}
                    onPress={recording ? stopRecording : startRecording}
                  >
                    <Text style={styles.micIcon}>{recording ? '\u25A0' : '\uD83C\uDFA4'}</Text>
                  </Pressable>
                  <Text style={styles.micLabel}>
                    {recording ? t('voiceAssignment.listening') : t('voiceAssignment.tapToSpeak')}
                  </Text>
                </View>

                {transcript ? (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptText}>{transcript}</Text>
                    {!recording && (
                      <Pressable
                        style={({ pressed }) => [styles.processButton, pressed && PRESSED_STYLE]}
                        onPress={() => processTranscript(transcript)}
                      >
                        <Text style={styles.processButtonText}>{t('voiceAssignment.processTranscript')}</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('voiceAssignment.or')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Text input */}
                <Text style={styles.textLabel}>{t('voiceAssignment.textInputLabel')}</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={t('voiceAssignment.textPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={textInput}
                  onChangeText={setTextInput}
                  multiline
                  numberOfLines={3}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.processButton,
                    !textInput.trim() && styles.processButtonDisabled,
                    pressed && PRESSED_STYLE,
                  ]}
                  onPress={() => processTranscript(textInput)}
                  disabled={!textInput.trim()}
                >
                  <Text style={styles.processButtonText}>{t('voiceAssignment.processText')}</Text>
                </Pressable>
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
                          {a.share !== 1 && (
                            <View style={styles.shareBadge}>
                              <Text style={styles.shareBadgeText}>
                                {t('voiceAssignment.shareLabel', { share: a.share })}
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
            {phase === 'confirm' && result && result.assignments.length > 0 && (
              <>
                <Pressable
                  style={({ pressed }) => [styles.footerBtnOutline, pressed && PRESSED_STYLE]}
                  onPress={() => setPhase('input')}
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
                onPress={() => setPhase('input')}
              >
                <Text style={styles.footerBtnOutlineText}>{t('voiceAssignment.tryAgain')}</Text>
              </Pressable>
            )}
            {phase === 'input' && (
              <Pressable
                style={({ pressed }) => [styles.footerBtnOutline, pressed && PRESSED_STYLE]}
                onPress={onClose}
              >
                <Text style={styles.footerBtnOutlineText}>{t('actions.cancel')}</Text>
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
  instructions: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  micRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  micButtonRecording: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  micIcon: {
    fontSize: 24,
  },
  micLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  transcriptBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
  },
  transcriptText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.muted,
    fontSize: 13,
  },
  textLabel: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 6,
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
  processButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  processButtonDisabled: {
    opacity: 0.4,
  },
  processButtonText: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
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
  shareBadge: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  shareBadgeText: {
    fontSize: 11,
    color: colors.text,
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
});
