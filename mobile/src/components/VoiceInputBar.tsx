import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { colors, fonts, radii, shadow2 } from '../utils/theme';

interface VoiceInputBarProps {
  visible: boolean;
  onClose: () => void;
  onProcess: (text: string) => void;
}

const PRESSED_STYLE = { opacity: 0.7 } as const;

export default function VoiceInputBar({ visible, onClose, onProcess }: VoiceInputBarProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  if (!visible) return null;

  const handleProcess = () => {
    if (!text.trim()) return;
    onProcess(text.trim());
    setText('');
  };

  const handleCancel = () => {
    setText('');
    onClose();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wrapper}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Animated.View
        entering={SlideInDown.duration(250)}
        exiting={SlideOutDown.duration(200)}
        style={styles.container}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={t('voiceAssignment.inputPlaceholder')}
          placeholderTextColor={colors.placeholder}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          autoFocus
        />
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && PRESSED_STYLE]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelText}>{t('actions.cancel')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.processButton,
              !text.trim() && styles.processButtonDisabled,
              pressed && PRESSED_STYLE,
            ]}
            onPress={handleProcess}
            disabled={!text.trim()}
          >
            <Text style={styles.processText}>{t('voiceAssignment.processText')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    ...shadow2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 10,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.inputBg,
    minHeight: 44,
    maxHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.muted,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  processButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  processButtonDisabled: {
    opacity: 0.4,
  },
  processText: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});
