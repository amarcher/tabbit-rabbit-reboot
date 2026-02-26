import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import type { Rabbit } from '../types';
import { venmoChargeLink, cashAppLink, paypalLink } from '../utils/payments';

interface PaymentLinksProps {
  rabbit: Rabbit;
  amount: number;
  note: string;
}

export default function PaymentLinks({ rabbit, amount, note }: PaymentLinksProps) {
  const profile = rabbit.profile;
  if (!profile) return null;

  const hasAny =
    profile.venmo_username || profile.cashapp_cashtag || profile.paypal_username;

  if (!hasAny) return null;

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {profile.venmo_username && (
        <TouchableOpacity
          style={[styles.button, styles.venmo]}
          onPress={() => openLink(venmoChargeLink(profile.venmo_username!, amount, note))}
        >
          <Text style={[styles.buttonText, styles.venmoText]}>Venmo</Text>
        </TouchableOpacity>
      )}
      {profile.cashapp_cashtag && (
        <TouchableOpacity
          style={[styles.button, styles.cashapp]}
          onPress={() => openLink(cashAppLink(profile.cashapp_cashtag!, amount))}
        >
          <Text style={[styles.buttonText, styles.cashappText]}>Cash App</Text>
        </TouchableOpacity>
      )}
      {profile.paypal_username && (
        <TouchableOpacity
          style={[styles.button, styles.paypal]}
          onPress={() => openLink(paypalLink(profile.paypal_username!, amount))}
        >
          <Text style={[styles.buttonText, styles.paypalText]}>PayPal</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  venmo: {
    borderColor: '#3d95ce',
  },
  venmoText: {
    color: '#3d95ce',
  },
  cashapp: {
    borderColor: '#198754',
  },
  cashappText: {
    color: '#198754',
  },
  paypal: {
    borderColor: '#0070ba',
  },
  paypalText: {
    color: '#0070ba',
  },
});
