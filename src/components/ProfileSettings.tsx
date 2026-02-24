import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Badge, Container } from 'react-bootstrap';
import type { LocalProfile } from '../hooks/useAuth';
import { useSavedRabbits } from '../hooks/useSavedRabbits';
import { getStoredApiKey, setStoredApiKey, removeStoredApiKey } from '../utils/anthropic';
import { remainingFreeScans, FREE_SCAN_LIMIT } from '../utils/scanCounter';
import { COLOR_HEX, RABBIT_COLORS } from '../types';
import type { SavedRabbit, RabbitColor } from '../types';

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

  // Saved rabbits
  const { savedRabbits, removeSaved, updateSaved } = useSavedRabbits();
  const [editingRabbitId, setEditingRabbitId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavedRabbit>>({});

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

          {/* Saved Rabbits */}
          <hr className="mt-4" />
          <h6>Saved Rabbits</h6>
          {savedRabbits.length === 0 ? (
            <p className="text-muted small">
              No saved rabbits yet. Add payment info when adding someone to a tab and they'll appear here.
            </p>
          ) : (
            <div className="mb-2">
              {savedRabbits.map((saved) => (
                <div
                  key={saved.id}
                  className="d-flex align-items-center gap-2 py-2 border-bottom"
                >
                  {editingRabbitId === saved.id ? (
                    <div className="flex-grow-1">
                      <Form.Control
                        type="text"
                        size="sm"
                        className="mb-1"
                        placeholder="Name"
                        value={editForm.name ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        className="mb-1"
                        placeholder="Venmo"
                        value={editForm.venmo_username ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, venmo_username: e.target.value }))}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        className="mb-1"
                        placeholder="Cash App"
                        value={editForm.cashapp_cashtag ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, cashapp_cashtag: e.target.value }))}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        className="mb-1"
                        placeholder="PayPal"
                        value={editForm.paypal_username ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, paypal_username: e.target.value }))}
                      />
                      <div className="d-flex gap-1">
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => {
                            const stripPrefix = (v: string) => v.replace(/^[@$]/, '');
                            updateSaved(saved.id, {
                              name: (editForm.name || '').trim() || saved.name,
                              venmo_username: stripPrefix((editForm.venmo_username || '').trim()) || null,
                              cashapp_cashtag: stripPrefix((editForm.cashapp_cashtag || '').trim()) || null,
                              paypal_username: stripPrefix((editForm.paypal_username || '').trim()) || null,
                            });
                            setEditingRabbitId(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setEditingRabbitId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: COLOR_HEX[saved.color],
                          border: '1px solid rgba(0,0,0,0.15)',
                          flexShrink: 0,
                        }}
                      />
                      <span className="fw-semibold flex-grow-1">{saved.name}</span>
                      <div className="d-flex gap-1">
                        {saved.venmo_username && (
                          <Badge bg="info" className="fw-normal" style={{ fontSize: '0.7em' }}>V</Badge>
                        )}
                        {saved.cashapp_cashtag && (
                          <Badge bg="success" className="fw-normal" style={{ fontSize: '0.7em' }}>C</Badge>
                        )}
                        {saved.paypal_username && (
                          <Badge bg="primary" className="fw-normal" style={{ fontSize: '0.7em' }}>P</Badge>
                        )}
                      </div>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          setEditingRabbitId(saved.id);
                          setEditForm({
                            name: saved.name,
                            venmo_username: saved.venmo_username || '',
                            cashapp_cashtag: saved.cashapp_cashtag || '',
                            paypal_username: saved.paypal_username || '',
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Remove ${saved.name} from saved rabbits?`)) {
                            removeSaved(saved.id);
                          }
                        }}
                      >
                        &times;
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

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
