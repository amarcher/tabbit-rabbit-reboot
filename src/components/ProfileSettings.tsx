import React, { forwardRef, useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Container, Dropdown, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { LocalProfile } from '../hooks/useAuth';
import { useSavedRabbits } from '../hooks/useSavedRabbits';
import { getStoredApiKey, setStoredApiKey, removeStoredApiKey } from '../utils/anthropic';
import { remainingFreeScans, FREE_SCAN_LIMIT } from '../utils/scanCounter';
import { CURRENCIES } from '../utils/currency';
import i18n from '../i18n/i18n';
import { COLOR_HEX } from '../types';
import type { SavedRabbit } from '../types';

interface ProfileSettingsProps {
  profile: LocalProfile | null;
  updateProfile: (updates: Partial<LocalProfile>) => Promise<void>;
}

const MoreToggle = forwardRef<HTMLButtonElement, { onClick: (e: React.MouseEvent) => void }>(
  ({ onClick }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={(e) => { e.preventDefault(); onClick(e); }}
      style={{
        width: 28, height: 28, borderRadius: '50%',
        backgroundColor: '#e9ecef', border: 'none', color: '#6c757d',
        fontSize: '1.1rem', lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0,
      }}
      aria-label="More options"
    >
      &#8942;
    </button>
  )
);

export default function ProfileSettings({ profile, updateProfile }: ProfileSettingsProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [cashappCashtag, setCashappCashtag] = useState('');
  const [paypalUsername, setPaypalUsername] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [language, setLanguage] = useState(i18n.language || 'en');
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
      setCurrencyCode(profile.currency_code || 'USD');
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
        currency_code: currencyCode || 'USD',
      });
      setMessage({ type: 'success', text: t('profile.savedSuccess') });
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || 'Failed to save.' });
    }
    setSaving(false);
  };

  return (
    <Container className="d-flex justify-content-center" style={{ paddingTop: '20px' }}>
      <Card style={{ maxWidth: 500, width: '100%' }}>
        <Card.Body>
          <h4 className="mb-3">{t('profile.title')}</h4>
          {message && <Alert variant={message.type}>{message.text}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('profile.displayNameLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('profile.displayNamePlaceholder')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('profile.defaultCurrencyLabel', 'Default Currency')}</Form.Label>
              <Form.Select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.name} ({c.code})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                {t('profile.currencyHint', 'New tabs will use this currency by default.')}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('profile.languageLabel', 'Language')}</Form.Label>
              <Form.Select
                value={language}
                onChange={(e) => {
                  const lng = e.target.value;
                  setLanguage(lng);
                  i18n.changeLanguage(lng);
                  localStorage.setItem('tabbitrabbit:language', lng);
                }}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </Form.Select>
            </Form.Group>

            <hr />
            <p className="text-muted small mb-3">
              {t('profile.paymentHint')}
            </p>

            <Form.Group className="mb-3">
              <Form.Label>{t('profile.venmoLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                placeholder={t('profile.venmoPlaceholder')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('profile.cashappLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={cashappCashtag}
                onChange={(e) => setCashappCashtag(e.target.value)}
                placeholder={t('profile.cashappPlaceholder')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('profile.paypalLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={paypalUsername}
                onChange={(e) => setPaypalUsername(e.target.value)}
                placeholder={t('profile.paypalPlaceholder')}
              />
            </Form.Group>

            <Button variant="success" type="submit" className="w-100" disabled={saving}>
              {saving ? t('profile.saving') : t('profile.saveProfile')}
            </Button>
          </Form>

          {/* Saved Rabbits */}
          <hr className="mt-4" />
          <h6>{t('profile.savedRabbits.heading')}</h6>
          {savedRabbits.length === 0 ? (
            <p className="text-muted small">
              {t('profile.savedRabbits.empty')}
            </p>
          ) : (
            <div className="mb-2">
              {savedRabbits.map((saved, idx) => (
                <div
                  key={saved.id}
                  className={`d-flex align-items-center gap-2 py-2${editingRabbitId === saved.id || idx === savedRabbits.length - 1 ? '' : ' border-bottom'}`}
                >
                  {editingRabbitId === saved.id ? (
                    <div
                      className="flex-grow-1"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.03)',
                        borderRadius: 10,
                        padding: '10px 12px',
                      }}
                    >
                      <Form.Control
                        type="text"
                        size="sm"
                        className="mb-1"
                        placeholder={t('profile.savedRabbits.namePlaceholder')}
                        value={editForm.name ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <InputGroup size="sm" className="mb-1">
                        <InputGroup.Text style={{ fontSize: '0.8em', width: 76, justifyContent: 'center' }}>Venmo</InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder={t('profile.savedRabbits.venmoPlaceholder')}
                          value={editForm.venmo_username ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, venmo_username: e.target.value }))}
                        />
                      </InputGroup>
                      <InputGroup size="sm" className="mb-1">
                        <InputGroup.Text style={{ fontSize: '0.8em', width: 76, justifyContent: 'center' }}>Cash App</InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder={t('profile.savedRabbits.cashappPlaceholder')}
                          value={editForm.cashapp_cashtag ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, cashapp_cashtag: e.target.value }))}
                        />
                      </InputGroup>
                      <InputGroup size="sm" className="mb-1">
                        <InputGroup.Text style={{ fontSize: '0.8em', width: 76, justifyContent: 'center' }}>PayPal</InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder={t('profile.savedRabbits.paypalPlaceholder')}
                          value={editForm.paypal_username ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, paypal_username: e.target.value }))}
                        />
                      </InputGroup>
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
                          {t('profile.savedRabbits.save')}
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setEditingRabbitId(null)}
                        >
                          {t('profile.savedRabbits.cancel')}
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
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <span className="fw-semibold">{saved.name}</span>
                        {(saved.venmo_username || saved.cashapp_cashtag || saved.paypal_username) && (
                          <div className="text-muted" style={{ fontSize: '0.75em' }}>
                            {[
                              saved.venmo_username && `Venmo`,
                              saved.cashapp_cashtag && `Cash App`,
                              saved.paypal_username && `PayPal`,
                            ].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                      <Dropdown align="end">
                        <Dropdown.Toggle as={MoreToggle} />
                        <Dropdown.Menu>
                          <Dropdown.Item
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
                            {t('profile.savedRabbits.edit')}
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item
                            className="text-danger"
                            onClick={() => {
                              if (window.confirm(t('profile.savedRabbits.removeConfirm', { name: saved.name }))) {
                                removeSaved(saved.id);
                              }
                            }}
                          >
                            {t('profile.savedRabbits.remove')}
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <hr className="mt-4" />
          <h6>{t('profile.advanced.heading')}</h6>
          <p className="text-muted small">
            {t('profile.advanced.freeScansRemaining', { remaining: freeScansLeft, limit: FREE_SCAN_LIMIT })}
          </p>

          {hasStoredKey ? (
            <div>
              <Form.Label>{t('profile.advanced.apiKeyLabel')}</Form.Label>
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
                  {t('profile.advanced.removeKey')}
                </Button>
              </div>
              <p className="text-muted small">{t('profile.advanced.usingOwnKey')}</p>
            </div>
          ) : (
            <div>
              <Form.Group className="mb-2">
                <Form.Label>{t('profile.advanced.apiKeyLabel')}</Form.Label>
                <Form.Control
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('profile.advanced.apiKeyPlaceholder')}
                />
                <Form.Text className="text-muted">
                  {t('profile.advanced.apiKeyHint')}
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
                {t('profile.advanced.saveApiKey')}
              </Button>
              <br />
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="small"
              >
                {t('profile.advanced.getKeyLink')}
              </a>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
