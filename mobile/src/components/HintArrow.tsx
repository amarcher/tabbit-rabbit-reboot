import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/src/utils/theme';

interface HintArrowProps {
  text: string;
}

/** Muted hint text prefixed with a curved arrow pointing down-left. */
export default function HintArrow({ text }: HintArrowProps) {
  return (
    <Text style={styles.container}>
      <Text style={styles.arrow}>{'\u2935'}</Text>
      {'  '}
      <Text style={styles.text}>{text}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    // Nested <Text> renders inline naturally; no flexbox needed
  },
  arrow: {
    fontSize: 16,
    color: colors.muted,
  },
  text: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
    fontStyle: 'italic',
  },
});
