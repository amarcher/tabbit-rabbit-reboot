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
  FadeIn,
  FadeOut,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadow2, radii, spacing } from '@/src/utils/theme';

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

const ACCENT_COLORS: Record<ToastType, string> = {
  success: colors.accent,
  error: colors.danger,
  info: colors.sky,
};

// ---------------------------------------------------------------------------
// Individual Toast
// ---------------------------------------------------------------------------

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const accentColor = ACCENT_COLORS[item.type];

  // Progress bar animation: starts at 1 (full width) and animates to 0.
  const progress = useSharedValue(1);

  const dismiss = useCallback(() => {
    onDismiss(item.id);
  }, [item.id, onDismiss]);

  // Start the countdown once the component mounts.
  React.useEffect(() => {
    progress.value = withTiming(0, {
      duration: TOAST_DURATION_MS,
      easing: Easing.linear,
    }, (finished) => {
      if (finished) {
        runOnJS(dismiss)();
      }
    });
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Animated.View
      entering={SlideInUp.duration(250).springify().damping(18).stiffness(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.card, { borderTopColor: accentColor }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={styles.message}>{item.message}</Text>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressBar,
            { backgroundColor: accentColor },
            progressStyle,
          ]}
        />
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
      style={[styles.container, { top: insets.top + spacing.sm }]}
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
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    overflow: 'hidden',
    ...shadow2,
  },
  message: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
});
