import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { venmoLink, cashAppLink, paypalLink } from '../utils/payments';

interface OwnerPaymentLinksProps {
  ownerProfile: {
    venmo_username: string | null;
    cashapp_cashtag: string | null;
    paypal_username: string | null;
  };
  amount: number;
  note: string;
}

export default function OwnerPaymentLinks({ ownerProfile, amount, note }: OwnerPaymentLinksProps) {
  const hasAny =
    ownerProfile.venmo_username || ownerProfile.cashapp_cashtag || ownerProfile.paypal_username;

  if (!hasAny) return null;

  return (
    <ButtonGroup size="sm">
      {ownerProfile.venmo_username && (
        <Button
          variant="outline-primary"
          href={venmoLink(ownerProfile.venmo_username, amount, note)}
        >
          Venmo
        </Button>
      )}
      {ownerProfile.cashapp_cashtag && (
        <Button
          variant="outline-success"
          href={cashAppLink(ownerProfile.cashapp_cashtag, amount)}
        >
          Cash App
        </Button>
      )}
      {ownerProfile.paypal_username && (
        <Button
          variant="outline-info"
          href={paypalLink(ownerProfile.paypal_username, amount)}
        >
          PayPal
        </Button>
      )}
    </ButtonGroup>
  );
}
