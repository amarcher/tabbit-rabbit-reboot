import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Container } from 'react-bootstrap';
import type { LocalProfile } from '../hooks/useAuth';
import { getStoredApiKey, setStoredApiKey, removeStoredApiKey } from '../utils/anthropic';
import { remainingFreeScans, FREE_SCAN_LIMIT } from '../utils/scanCounter';

interface ProfileSettingsProps {
  profile: LocalProfile | null;
  updateProfile: (updates: Partial<LocalProfile>) => Promise<void>;
}

export default function ProfileSettings({ profile, updateProfile }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [cashappCashtag, setCashappCashtag] = useState('');
  const [paypalUsername, setPaypalUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // BYOK state
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [storedKeyPreview, setStoredKeyPreview] = useState('');
  const [freeScansLeft, setFreeScansLeft] = useState(FREE_SCAN_LIMIT);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setVenmoUsername(profile.venmo_username || '');
      setCashappCashtag(profile.cashapp_cashtag || '');
      setPaypalUsername(profile.paypal_username || '');
    }
  }, [profile]);

  useEffect(() => {
    const key = getStoredApiKey();
    if (key) {
      setHasStoredKey(true);
      setStoredKeyPreview(`...${key.slice(-4)}`);
    }
    setFreeScansLeft(remainingFreeScans());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        venmo_username: venmoUsername.trim().replace(/^@/, '') || null,
        cashapp_cashtag: cashappCashtag.trim().replace(/^\$/, '') || null,
        paypal_username: paypalUsername.trim().replace(/^@/, '') || null,
      });
      setMessage({ type: 'success', text: 'Profile saved!' });
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || 'Failed to save.' });
    }
    setSaving(false);
  };

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

          <hr className="mt-4" />
          <h6>Advanced</h6>
          <p className="text-muted small">
            {freeScansLeft} of {FREE_SCAN_LIMIT} free receipt scans remaining this month.
          </p>

          {hasStoredKey ? (
            <div>
              <Form.Label>Anthropic API Key</Form.Label>
              <div className="d-flex align-items-center gap-2 mb-1">
                <code>{storedKeyPreview}</code>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => {
                    removeStoredApiKey();
                    setHasStoredKey(false);
                    setStoredKeyPreview('');
                  }}
                >
                  Remove
                </Button>
              </div>
              <p className="text-muted small">Using your own key — unlimited scans.</p>
            </div>
          ) : (
            <div>
              <Form.Group className="mb-2">
                <Form.Label>Anthropic API Key</Form.Label>
                <Form.Control
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                />
                <Form.Text className="text-muted">
                  Use your own API key for unlimited scans. Stored in your browser only.
                </Form.Text>
              </Form.Group>
              <Button
                variant="outline-primary"
                size="sm"
                disabled={!apiKey.trim()}
                onClick={() => {
                  const trimmed = apiKey.trim();
                  setStoredApiKey(trimmed);
                  setHasStoredKey(true);
                  setStoredKeyPreview(`...${trimmed.slice(-4)}`);
                  setApiKey('');
                }}
              >
                Save API Key
              </Button>
              <br />
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="small"
              >
                Get a key at console.anthropic.com
              </a>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
