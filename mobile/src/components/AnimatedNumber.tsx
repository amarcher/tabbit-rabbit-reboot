import React, { useCallback, useEffect, useState } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { formatAmount } from '../utils/currency';

interface AnimatedNumberProps {
  /** The numeric value to display, in minor currency units (cents) */
  value: number;
  /** ISO 4217 currency code (default 'USD') */
  currencyCode?: string;
  /** Pass-through style for the text */
  style?: StyleProp<TextStyle>;
  /** Animation duration in milliseconds (default 400) */
  duration?: number;
}

/**
 * Smoothly animates between numeric currency values using react-native-reanimated.
 * Formats minor units (cents) into a locale-aware currency string.
 * Formatting runs on the JS thread via runOnJS — never inside the worklet.
 */
export default function AnimatedNumber({
  value,
  currencyCode = 'USD',
  style,
  duration = 400,
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(value);
  const [displayText, setDisplayText] = useState(formatAmount(value, currencyCode));

  // Format on JS thread — avoids calling toFixed() or Intl methods in the worklet context
  const updateDisplay = useCallback((minorUnits: number) => {
    setDisplayText(formatAmount(minorUnits, currencyCode));
  }, [currencyCode]);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  useAnimatedReaction(
    () => animatedValue.value,
    (current) => {
      runOnJS(updateDisplay)(current);
    }
  );

  return (
    <Text style={style} accessibilityLabel={formatAmount(value, currencyCode)}>
      {displayText}
    </Text>
  );
}
