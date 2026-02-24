import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
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

  return (
    <ButtonGroup size="sm">
      {profile.venmo_username && (
        <Button
          variant="outline-primary"
          href={venmoChargeLink(profile.venmo_username, amount, note)}
          target="_blank"
          rel="noopener"
        >
          Venmo
        </Button>
      )}
      {profile.cashapp_cashtag && (
        <Button
          variant="outline-success"
          href={cashAppLink(profile.cashapp_cashtag, amount)}
          target="_blank"
          rel="noopener"
        >
          Cash App
        </Button>
      )}
      {profile.paypal_username && (
        <Button
          variant="outline-info"
          href={paypalLink(profile.paypal_username, amount)}
          target="_blank"
          rel="noopener"
        >
          PayPal
        </Button>
      )}
    </ButtonGroup>
  );
}
