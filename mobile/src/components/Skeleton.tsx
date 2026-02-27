import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, radii } from '@/src/utils/theme';

// ---------------------------------------------------------------------------
// SkeletonBlock — base building block
// ---------------------------------------------------------------------------

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  /** Extra delay before animation starts (ms), useful for stagger */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({
  width,
  height = 16,
  borderRadius = radii.sm,
  delay = 0,
  style,
}: SkeletonBlockProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// TabListSkeleton — replaces ActivityIndicator on the home screen
// ---------------------------------------------------------------------------

const STAGGER_MS = 100;

function SkeletonTabRow({ index }: { index: number }) {
  const delay = index * STAGGER_MS;

  return (
    <View style={skeletonStyles.tabRow}>
      {/* Row 1: title + price */}
      <View style={skeletonStyles.tableRow}>
        <SkeletonBlock width="60%" height={18} delay={delay} />
        <SkeletonBlock width={60} height={16} delay={delay} />
      </View>

      {/* Row 2: rabbit chips + date */}
      <View style={skeletonStyles.tableRow}>
        <View style={skeletonStyles.chipRow}>
          <SkeletonBlock
            width={60}
            height={20}
            borderRadius={radii.pill}
            delay={delay}
          />
          <SkeletonBlock
            width={50}
            height={20}
            borderRadius={radii.pill}
            delay={delay}
          />
          <SkeletonBlock
            width={70}
            height={20}
            borderRadius={radii.pill}
            delay={delay}
          />
        </View>
        <SkeletonBlock width={70} height={14} delay={delay} />
      </View>
    </View>
  );
}

export function TabListSkeleton() {
  return (
    <View style={skeletonStyles.list}>
      <SkeletonTabRow index={0} />
      <SkeletonTabRow index={1} />
      <SkeletonTabRow index={2} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ItemListSkeleton — for the tab editor loading state
// ---------------------------------------------------------------------------

export function ItemListSkeleton() {
  return (
    <View style={skeletonStyles.itemList}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBlock
          key={i}
          width="100%"
          height={44}
          borderRadius={radii.md}
          delay={i * STAGGER_MS}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const skeletonStyles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 8,
  },
  tabRow: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 6,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  itemList: {
    padding: 16,
    gap: 8,
  },
});
