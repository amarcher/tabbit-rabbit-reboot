import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import type { PaymentHandle } from '../types';
import { profileToHandles, getProviderById } from '../utils/paymentProviders';

interface OwnerPaymentLinksProps {
  ownerProfile: {
    display_name?: string | null;
    payment_handles?: PaymentHandle[];
    venmo_username: string | null;
    cashapp_cashtag: string | null;
    paypal_username: string | null;
  };
  amount: number;
  note: string;
}

export default function OwnerPaymentLinks({ ownerProfile, amount, note }: OwnerPaymentLinksProps) {
  const handles = profileToHandles(ownerProfile);
  if (handles.length === 0) return null;

  return (
    <ButtonGroup size="sm">
      {handles.map(({ provider, username }) => {
        const config = getProviderById(provider);
        if (!config) return null;
        const href = config.buildPayUrl(username, amount, note);
        return (
          <Button
            key={provider}
            variant={`outline-${config.variant}`}
            href={href}
            target="_blank"
            rel="noopener"
          >
            Pay with {config.name}
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
