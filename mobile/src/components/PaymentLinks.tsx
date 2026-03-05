import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Rabbit } from '../types';
import { profileToHandles, getProviderById, openPaymentUrl } from '../utils/paymentProviders';
import { fonts } from '../utils/theme';

interface PaymentLinksProps {
  rabbit: Rabbit;
  amount: number;
  note: string;
}

const PRESSED_STYLE = { opacity: 0.7 } as const;

export default function PaymentLinks({ rabbit, amount, note }: PaymentLinksProps) {
  const profile = rabbit.profile;
  if (!profile) return null;

  const handles = profileToHandles(profile);
  if (handles.length === 0) return null;

  return (
    <View style={styles.container}>
      {handles.map((handle) => {
        const config = getProviderById(handle.provider);
        if (!config) return null;
        const url = config.buildChargeUrl
          ? config.buildChargeUrl(handle.username, amount, note)
          : config.buildPayUrl(handle.username, amount, note);
        return (
          <Pressable
            key={handle.provider}
            style={({ pressed }) => [
              styles.button,
              { borderColor: config.color },
              pressed && PRESSED_STYLE,
            ]}
            onPress={() => openPaymentUrl(url)}
          >
            <Text style={[styles.buttonText, { color: config.color }]}>{config.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
});
