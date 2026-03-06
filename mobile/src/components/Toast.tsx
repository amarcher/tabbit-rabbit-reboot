import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadow3, radii, spacing } from '@/src/utils/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOAST_DURATION_MS = 3000;

const TOAST_ICONS: Record<ToastType, string> = {
  success: '\u2713',
  error: '!',
  info: 'i',
};

const CARD_COLORS: Record<ToastType, { bg: string; icon: string; iconBg: string }> = {
  success: { bg: '#e8f5e9', icon: '#2e7d32', iconBg: '#c8e6c9' },
  error: { bg: '#fce4ec', icon: colors.danger, iconBg: '#f8bbd0' },
  info: { bg: '#e3f2fd', icon: colors.sky, iconBg: '#bbdefb' },
};

// ---------------------------------------------------------------------------
// Individual Toast
// ---------------------------------------------------------------------------

const FADE_OUT_MS = 400;

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const palette = CARD_COLORS[item.type];
  const opacity = useSharedValue(1);

  const dismiss = useCallback(() => {
    onDismiss(item.id);
  }, [item.id, onDismiss]);

  // Hold at full opacity, then fade out, then dismiss.
  React.useEffect(() => {
    opacity.value = withDelay(
      TOAST_DURATION_MS,
      withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
        if (finished) runOnJS(dismiss)();
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      style={[styles.card, { backgroundColor: palette.bg }, animatedStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: palette.iconBg }]}>
          <Text style={[styles.iconText, { color: palette.icon }]}>
            {TOAST_ICONS[item.type]}
          </Text>
        </View>
        <Text style={styles.message}>{item.message}</Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Container (renders all active toasts)
// ---------------------------------------------------------------------------

function ToastContainer({ toasts, onDismiss }: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + spacing.lg }]}
      pointerEvents="box-none"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    gap: spacing.sm,
    alignItems: 'center',
  },
  card: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
    ...shadow3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 20,
  },
  message: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
});
