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
import type { SavedRabbit, PaymentHandle } from '../types';
import {
  providersForRegion,
  regionFromCurrency,
  PAYMENT_PROVIDERS,
  handlesToLegacyFields,
  profileToHandles,
} from '../utils/paymentProviders';

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
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [showMoreProviders, setShowMoreProviders] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Saved rabbits
  const { savedRabbits, removeSaved, updateSaved } = useSavedRabbits();
  const [editingRabbitId, setEditingRabbitId] = useState<string | null>(null);
  const [editHandles, setEditHandles] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState('');

  // BYOK state
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [storedKeyPreview, setStoredKeyPreview] = useState('');
  const [freeScansLeft, setFreeScansLeft] = useState(FREE_SCAN_LIMIT);

  const region = regionFromCurrency(currencyCode);
  const regionProviders = providersForRegion(region);
  const extraProviders = PAYMENT_PROVIDERS.filter(
    (p) => !regionProviders.find((rp) => rp.id === p.id)
  );
  const displayedProviders = showMoreProviders ? PAYMENT_PROVIDERS : regionProviders;

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setCurrencyCode(profile.currency_code || 'USD');
      // Populate handles from payment_handles (or fall back to legacy fields)
      const existingHandles = profileToHandles(profile);
      const handlesMap: Record<string, string> = {};
      for (const h of existingHandles) {
        handlesMap[h.provider] = h.username;
      }
      setHandles(handlesMap);
      // Show more providers if any existing handles aren't in region providers
      const currentRegion = regionFromCurrency(profile.currency_code || 'USD');
      const currentRegionProviders = providersForRegion(currentRegion);
      const hasExtraHandles = existingHandles.some(
        (h) => !currentRegionProviders.find((rp) => rp.id === h.provider)
      );
      if (hasExtraHandles) setShowMoreProviders(true);
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = getStoredApiKey();
    if (key) {
      setHasStoredKey(true);
      setStoredKeyPreview(`...${key.slice(-4)}`);
    }
    setFreeScansLeft(remainingFreeScans());
  }, []);

  const stripPrefix = (val: string, prefix?: string) => {
    if (!prefix) return val;
    return val.replace(new RegExp(`^[${prefix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`), '');
  };

  const buildHandlesFromMap = (map: Record<string, string>): PaymentHandle[] => {
    return PAYMENT_PROVIDERS
      .filter((p) => map[p.id]?.trim())
      .map((p) => ({
        provider: p.id,
        username: stripPrefix(map[p.id].trim(), p.prefix),
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const paymentHandles = buildHandlesFromMap(handles);
      const legacyFields = handlesToLegacyFields(paymentHandles);

      await updateProfile({
        display_name: displayName.trim() || null,
        payment_handles: paymentHandles,
        venmo_username: legacyFields.venmo_username,
        cashapp_cashtag: legacyFields.cashapp_cashtag,
        paypal_username: legacyFields.paypal_username,
        currency_code: currencyCode || 'USD',
      });
      setMessage({ type: 'success', text: t('profile.savedSuccess') });
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || 'Failed to save.' });
    }
    setSaving(false);
  };

  const hasAnyHandle = (saved: SavedRabbit) =>
    (saved.payment_handles && saved.payment_handles.length > 0) ||
    saved.venmo_username ||
    saved.cashapp_cashtag ||
    saved.paypal_username;

  const getSavedRabbitHandles = (saved: SavedRabbit) => profileToHandles(saved);

  const startEditRabbit = (saved: SavedRabbit) => {
    setEditingRabbitId(saved.id);
    setEditName(saved.name);
    const existingHandles = getSavedRabbitHandles(saved);
    const map: Record<string, string> = {};
    for (const h of existingHandles) {
      map[h.provider] = h.username;
    }
    setEditHandles(map);
  };

  const saveEditRabbit = (saved: SavedRabbit) => {
    const paymentHandles = buildHandlesFromMap(editHandles);
    const legacyFields = handlesToLegacyFields(paymentHandles);
    updateSaved(saved.id, {
      name: editName.trim() || saved.name,
      payment_handles: paymentHandles,
      venmo_username: legacyFields.venmo_username,
      cashapp_cashtag: legacyFields.cashapp_cashtag,
      paypal_username: legacyFields.paypal_username,
    });
    setEditingRabbitId(null);
  };

  // Providers to show for rabbit edit: region providers + any that the rabbit already has handles for
  const getRabbitEditProviders = (saved: SavedRabbit) => {
    const existing = getSavedRabbitHandles(saved);
    const existingIds = new Set(existing.map((h) => h.provider));
    const all = [...regionProviders];
    for (const p of PAYMENT_PROVIDERS) {
      if (existingIds.has(p.id) && !all.find((rp) => rp.id === p.id)) {
        all.push(p);
      }
    }
    return all;
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
                <option value="de">Deutsch</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="vi">Tiếng Việt</option>
                <option value="ru">Русский</option>
                <option value="hi">हिन्दी</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </Form.Select>
            </Form.Group>

            <hr />
            <p className="text-muted small mb-3">
              {t('profile.paymentHint')}
            </p>

            {displayedProviders.map((provider) => (
              <Form.Group key={provider.id} className="mb-3">
                <Form.Label>{provider.name}</Form.Label>
                <Form.Control
                  type="text"
                  value={handles[provider.id] ?? ''}
                  onChange={(e) =>
                    setHandles((prev) => ({ ...prev, [provider.id]: e.target.value }))
                  }
                  placeholder={`${provider.prefix ?? ''}${provider.placeholder}`}
                />
              </Form.Group>
            ))}

            {!showMoreProviders && extraProviders.length > 0 && (
              <Button
                variant="link"
                size="sm"
                className="p-0 mb-3"
                onClick={() => setShowMoreProviders(true)}
              >
                {t('profile.morePaymentOptions', '+ More payment options')}
              </Button>
            )}

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
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      {getRabbitEditProviders(saved).map((provider) => (
                        <InputGroup key={provider.id} size="sm" className="mb-1">
                          <InputGroup.Text style={{ fontSize: '0.8em', width: 90, justifyContent: 'center' }}>
                            {provider.name}
                          </InputGroup.Text>
                          <Form.Control
                            type="text"
                            placeholder={`${provider.prefix ?? ''}${provider.placeholder}`}
                            value={editHandles[provider.id] ?? ''}
                            onChange={(e) =>
                              setEditHandles((prev) => ({ ...prev, [provider.id]: e.target.value }))
                            }
                          />
                        </InputGroup>
                      ))}
                      <div className="d-flex gap-1">
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => saveEditRabbit(saved)}
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
                        {hasAnyHandle(saved) && (
                          <div className="text-muted" style={{ fontSize: '0.75em' }}>
                            {getSavedRabbitHandles(saved)
                              .map((h) => {
                                const config = PAYMENT_PROVIDERS.find((p) => p.id === h.provider);
                                return config?.name ?? h.provider;
                              })
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                      <Dropdown align="end">
                        <Dropdown.Toggle as={MoreToggle} />
                        <Dropdown.Menu>
                          <Dropdown.Item
                            onClick={() => startEditRabbit(saved)}
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
