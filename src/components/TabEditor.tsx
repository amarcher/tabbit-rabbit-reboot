import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useTab } from '../hooks/useTab';
import { useAuth } from '../hooks/useAuth';
import { useSavedRabbits } from '../hooks/useSavedRabbits';
import { shareBill } from '../utils/billEncoder';
import { canScanFree, incrementScanCount, FREE_SCAN_LIMIT } from '../utils/scanCounter';
import { scanReceiptDirect, getStoredApiKey } from '../utils/anthropic';
import type { ReceiptResult } from '../utils/anthropic';
import { receiptValueToPercent } from '../utils/anthropic';
import ItemList from './ItemList';
import RabbitBar from './RabbitBar';
import AddRabbitModal from './AddRabbitModal';
import TotalsView from './TotalsView';
import LoadingSpinner from './LoadingSpinner';
import Confetti from './Confetti';
import HintArrow from './HintArrow';
import { useNux } from '../contexts/NuxContext';
import { isZeroDecimalCurrency } from '../utils/currency';
import type { RabbitColor, Tab } from '../types';

export default function TabEditor() {
  const { t } = useTranslation();
  const { tabId } = useParams<{ tabId: string }>();
  const { profile } = useAuth();
  const { active: nuxActive, completeAction } = useNux();
  const { savedRabbits, addSaved, removeSaved } = useSavedRabbits();
  const {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    updateTab,
    addItem,
    addItems,
    deleteItem,
    addRabbit,
    removeRabbit,
    toggleAssignment,
  } = useTab(tabId);

  const [selectedRabbitId, setSelectedRabbitId] = useState<string | null>(null);
  const [showAddRabbit, setShowAddRabbit] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tabName, setTabName] = useState('');

  // Receipt upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  // Share bill state
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Confetti state
  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0, y: 0 });
  const shareBtnRef = useRef<HTMLButtonElement>(null);

  const subtotals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const rabbit of rabbits) {
      const rabbitItemIds = assignments
        .filter((a) => a.rabbit_id === rabbit.id)
        .map((a) => a.item_id);

      let total = 0;
      for (const itemId of rabbitItemIds) {
        const item = items.find((i) => i.id === itemId);
        if (!item) continue;
        const splitCount = assignments.filter(
          (a) => a.item_id === itemId
        ).length;
        total += item.price_cents / splitCount;
      }
      result[rabbit.id] = Math.round(total);
    }
    return result;
  }, [rabbits, items, assignments]);

  const handleNameSave = () => {
    if (tabName.trim() && tabName.trim() !== tab?.name) {
      updateTab({ name: tabName.trim() });
    }
    setEditingName(false);
  };

  const handleReceiptParsed = (result: ReceiptResult) => {
    const tabCurrency = tab?.currency_code || 'USD';
    const zeroDec = isZeroDecimalCurrency(tabCurrency);
    const batchItems = result.items.map((item) => ({
      description: item.description,
      price_cents: zeroDec ? Math.round(item.price) : Math.round(item.price * 100),
    }));
    addItems(batchItems);
    completeAction('add-items');

    const taxPercent = receiptValueToPercent(result.tax, result.tax_unit, result.subtotal);
    const tipPercent = receiptValueToPercent(result.tip, result.tip_unit, result.subtotal);
    const updates: Partial<Tab> = {};
    if (taxPercent !== null) updates.tax_percent = taxPercent;
    if (tipPercent !== null) updates.tip_percent = tipPercent;
    if (Object.keys(updates).length) updateTab(updates);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tab) return;

    const byokKey = getStoredApiKey();
    if (!byokKey && !canScanFree()) {
      setScanError(t('tabEditor.scanError.scanLimitReached', { limit: FREE_SCAN_LIMIT }));
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setScanError('');
    setScanning(true);

    try {
      const image_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const media_type = file.type || 'image/jpeg';
      let result: ReceiptResult;

      if (byokKey) {
        result = await scanReceiptDirect(byokKey, image_base64, media_type, tab.currency_code || 'USD');
      } else {
        const res = await fetch('/api/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64, media_type, currency_code: tab.currency_code || 'USD' }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`OCR failed (${res.status}): ${errBody}`);
        }
        result = await res.json();
        incrementScanCount();
      }

      if (result?.items?.length) {
        handleReceiptParsed(result);
        if (result.currency_code && result.currency_code !== (tab.currency_code || 'USD')) {
          setScanError(t('tabEditor.scanError.currencyMismatch', {
            detected: result.currency_code,
            expected: tab.currency_code || 'USD',
          }));
        }
      } else {
        setScanError(t('tabEditor.scanError.noItemsFound'));
      }
    } catch (err: any) {
      setScanError(err.message || t('tabEditor.scanError.failedToProcess'));
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleShareBill = async () => {
    if (!tab) return;
    setSharing(true);

    // Capture button position for confetti origin
    if (shareBtnRef.current) {
      const rect = shareBtnRef.current.getBoundingClientRect();
      setConfettiOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }

    try {
      const token = await shareBill({
        tab,
        items,
        rabbits,
        assignments,
        ownerProfile: {
          display_name: profile?.display_name || null,
          venmo_username: profile?.venmo_username || null,
          cashapp_cashtag: profile?.cashapp_cashtag || null,
          paypal_username: profile?.paypal_username || null,
        },
      });
      const url = `${window.location.origin}/bill/${token}`;
      if (navigator.share) {
        await navigator.share({ title: tab.name, url });
        setConfettiActive(true);
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setConfettiActive(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    } finally {
      setSharing(false);
    }
  };

  if (loading || !tab) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <LoadingSpinner size="md" message={t('tabEditor.loadingTab')} />
      </div>
    );
  }

  const currencyCode = tab.currency_code || 'USD';

  const hasItems = items.length > 0;
  const hasRabbits = rabbits.length > 0;
  const isFirstTab = (() => {
    try {
      const raw = localStorage.getItem('tabbitrabbit:tabs');
      const list = raw ? JSON.parse(raw) : [];
      return list.length <= 1;
    } catch { return true; }
  })();

  const actionBar = (
    <div className="my-3">
      {!hasItems && isFirstTab && !nuxActive && (
        <div className="mb-2">
          <HintArrow>{t('tabEditor.hintScan')}</HintArrow>
        </div>
      )}
      <div className="d-flex gap-2">
        <Button
          data-nux="scan-receipt-btn"
          variant={hasItems ? 'outline-info' : 'info'}
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ms-1">{t('tabEditor.scanning')}</span>
            </>
          ) : (
            t('tabEditor.scanReceipt')
          )}
        </Button>
        {hasItems && hasRabbits && (
          <Button
            ref={shareBtnRef}
            variant="outline-success"
            size="sm"
            onClick={handleShareBill}
            disabled={sharing}
          >
            {sharing ? t('tabEditor.sharing') : copied ? t('tabEditor.copied') : t('tabEditor.shareBill')}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Confetti burst on share */}
      <Confetti
        active={confettiActive}
        originX={confettiOrigin.x}
        originY={confettiOrigin.y}
        onDone={() => setConfettiActive(false)}
      />

      <div className="tr-editor-layout">
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            {editingName ? (
              <Form
                className="d-flex gap-2 flex-grow-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleNameSave();
                }}
              >
                <Form.Control
                  type="text"
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  autoFocus
                  onBlur={handleNameSave}
                />
              </Form>
            ) : (
              <h4
                className="mb-0"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setTabName(tab.name);
                  setEditingName(true);
                }}
                title={t('tabEditor.clickToEdit')}
              >
                {tab.name}
              </h4>
            )}
          </div>

          {actionBar}

          {scanError && (
            <Alert variant="warning" className="py-2 small" dismissible onClose={() => setScanError('')}>
              {scanError}
            </Alert>
          )}

          <RabbitBar
            rabbits={rabbits}
            selectedRabbitId={selectedRabbitId}
            subtotals={subtotals}
            currencyCode={currencyCode}
            onSelect={(id) =>
              setSelectedRabbitId(id === selectedRabbitId ? null : id)
            }
            onRemove={removeRabbit}
            onAddClick={() => setShowAddRabbit(true)}
          />

          {selectedRabbitId && (
            <p className="text-muted small mb-2">
              <Trans
                i18nKey="tabEditor.assignHint"
                values={{ name: rabbits.find((r) => r.id === selectedRabbitId)?.name }}
                components={{ strong: <strong /> }}
              />
            </p>
          )}

          {!hasItems && isFirstTab && !nuxActive && (
            <div style={{ marginBottom: 4 }}>
              <HintArrow>{t('tabEditor.hintManual')}</HintArrow>
            </div>
          )}
          <ItemList
            items={items}
            rabbits={rabbits}
            assignments={assignments}
            selectedRabbitId={selectedRabbitId}
            currencyCode={currencyCode}
            onToggle={toggleAssignment}
            onAddItem={(desc, cents) => { addItem(desc, cents); completeAction('add-items'); }}
            onDeleteItem={deleteItem}
          />
        </div>

        <div className="tr-sticky-col">
          <TotalsView
            tab={tab}
            items={items}
            rabbits={rabbits}
            assignments={assignments}
            onUpdateTab={updateTab}
            currentUserProfile={profile}
          />
        </div>
      </div>

      <AddRabbitModal
        show={showAddRabbit}
        onHide={() => setShowAddRabbit(false)}
        onAdd={(name, color, profile) => { addRabbit(name, color, profile); completeAction('add-rabbit'); }}
        usedColors={rabbits.map((r) => r.color as RabbitColor)}
        savedRabbits={savedRabbits}
        onAddSavedRabbit={addSaved}
        onRemoveSavedRabbit={removeSaved}
        currencyCode={tab?.currency_code || 'USD'}
      />
    </div>
  );
}
