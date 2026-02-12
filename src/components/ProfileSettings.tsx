import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Container, Spinner } from 'react-bootstrap';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import type { Profile } from '../types';

interface ProfileSettingsProps {
  user: User;
  profile: Profile | null;
  fetchProfile: (userId: string) => Promise<void>;
}

export default function ProfileSettings({ user, profile, fetchProfile }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [cashappCashtag, setCashappCashtag] = useState('');
  const [paypalUsername, setPaypalUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setVenmoUsername(profile.venmo_username || '');
      setCashappCashtag(profile.cashapp_cashtag || '');
      setPaypalUsername(profile.paypal_username || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        venmo_username: venmoUsername.trim() || null,
        cashapp_cashtag: cashappCashtag.trim() || null,
        paypal_username: paypalUsername.trim() || null,
      })
      .eq('id', user.id);

    if (error) {
      setMessage({ type: 'danger', text: error.message });
    } else {
      await fetchProfile(user.id);
      setMessage({ type: 'success', text: 'Profile saved!' });
    }
    setSaving(false);
  };

  if (!profile) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="d-flex justify-content-center" style={{ paddingTop: '20px' }}>
      <Card style={{ maxWidth: 500, width: '100%' }}>
        <Card.Body>
          <h4 className="mb-3">Profile Settings</h4>
          {message && <Alert variant={message.type}>{message.text}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Display Name</Form.Label>
              <Form.Control
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </Form.Group>

            <hr />
            <p className="text-muted small mb-3">
              Set your payment usernames so people can pay you when you share a bill.
            </p>

            <Form.Group className="mb-3">
              <Form.Label>Venmo Username</Form.Label>
              <Form.Control
                type="text"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                placeholder="e.g. john-doe-42"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Cash App $Cashtag</Form.Label>
              <Form.Control
                type="text"
                value={cashappCashtag}
                onChange={(e) => setCashappCashtag(e.target.value)}
                placeholder="e.g. johndoe"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>PayPal Username</Form.Label>
              <Form.Control
                type="text"
                value={paypalUsername}
                onChange={(e) => setPaypalUsername(e.target.value)}
                placeholder="e.g. johndoe"
              />
            </Form.Group>

            <Button variant="success" type="submit" className="w-100" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
