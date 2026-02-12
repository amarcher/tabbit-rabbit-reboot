import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import type { Rabbit } from '../types';
import { venmoLink, cashAppLink, paypalLink } from '../utils/payments';

interface PaymentLinksProps {
  rabbit: Rabbit;
  amount: number;
  tabName: string;
}

export default function PaymentLinks({ rabbit, amount, tabName }: PaymentLinksProps) {
  const profile = rabbit.profile;
  if (!profile) return null;

  const note = `${tabName} - ${rabbit.name}'s share`;
  const hasAny =
    profile.venmo_username || profile.cashapp_cashtag || profile.paypal_username;

  if (!hasAny) return null;

  return (
    <ButtonGroup size="sm">
      {profile.venmo_username && (
        <Button
          variant="outline-primary"
          href={venmoLink(profile.venmo_username, amount, note)}
        >
          Venmo
        </Button>
      )}
      {profile.cashapp_cashtag && (
        <Button
          variant="outline-success"
          href={cashAppLink(profile.cashapp_cashtag, amount)}
        >
          Cash App
        </Button>
      )}
      {profile.paypal_username && (
        <Button
          variant="outline-info"
          href={paypalLink(profile.paypal_username, amount)}
        >
          PayPal
        </Button>
      )}
    </ButtonGroup>
  );
}
