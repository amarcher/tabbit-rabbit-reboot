import React, { useEffect, useState } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  /** The numeric value to display, in cents */
  value: number;
  /** Prefix shown before the number (default "$") */
  prefix?: string;
  /** Pass-through style for the text */
  style?: StyleProp<TextStyle>;
  /** Animation duration in milliseconds (default 400) */
  duration?: number;
}

function formatCentsValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Smoothly animates between numeric currency values using react-native-reanimated.
 * Displays cents as a formatted dollar string (e.g. 1250 -> "12.50").
 */
export default function AnimatedNumber({
  value,
  prefix = '$',
  style,
  duration = 400,
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(value);
  const [displayText, setDisplayText] = useState(formatCentsValue(value));

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  useAnimatedReaction(
    () => animatedValue.value,
    (current) => {
      runOnJS(setDisplayText)(formatCentsValue(current));
    }
  );

  return (
    <Text style={style} accessibilityLabel={`${prefix}${formatCentsValue(value)}`}>
      {prefix}{displayText}
    </Text>
  );
}
