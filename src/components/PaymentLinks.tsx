import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import type { Rabbit } from '../types';
import { profileToHandles, getProviderById } from '../utils/paymentProviders';

interface PaymentLinksProps {
  rabbit: Rabbit;
  amount: number;
  note: string;
}

export default function PaymentLinks({ rabbit, amount, note }: PaymentLinksProps) {
  const profile = rabbit.profile;
  if (!profile) return null;

  const handles = profileToHandles(profile);
  if (handles.length === 0) return null;

  return (
    <ButtonGroup size="sm">
      {handles.map(({ provider, username }) => {
        const config = getProviderById(provider);
        if (!config) return null;
        const href = config.buildChargeUrl
          ? config.buildChargeUrl(username, amount, note)
          : config.buildPayUrl(username, amount, note);
        return (
          <Button
            key={provider}
            variant={`outline-${config.variant}`}
            href={href}
            target="_blank"
            rel="noopener"
          >
            {config.name}
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
