import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { useTab } from '../hooks/useTab';
import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { supabase } from '../supabaseClient';
import ItemList from './ItemList';
import RabbitBar from './RabbitBar';
import AddRabbitModal from './AddRabbitModal';
import TotalsView from './TotalsView';
import type { ReceiptResult } from './ReceiptUpload';
import type { RabbitColor } from '../types';

export default function TabEditor() {
  const { tabId } = useParams<{ tabId: string }>();
  const { profile } = useAuth();
  const {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    saving,
    isDirty,
    fetchTab,
    updateTab,
    addItem,
    addItems,
    deleteItem,
    addRabbit,
    removeRabbit,
    toggleAssignment,
    saveChanges,
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

  useRealtime(tabId, useCallback(() => fetchTab(), [fetchTab]));

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
    const batchItems = result.items.map((item) => ({
      description: item.description,
      price_cents: Math.round(item.price * 100),
    }));
    addItems(batchItems);

    if (result.tax && result.subtotal && result.subtotal > 0) {
      const taxPercent = Math.round((result.tax / result.subtotal) * 10000) / 100;
      updateTab({ tax_percent: taxPercent });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tab) return;

    setScanError('');
    setScanning(true);

    try {
      const filePath = `receipts/${tab.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('receipts').getPublicUrl(filePath);

      const { data, error: fnError } = await supabase.functions.invoke(
        'parse-receipt',
        { body: { image_url: publicUrl } }
      );

      if (fnError) throw fnError;

      if (data?.items?.length) {
        handleReceiptParsed(data as ReceiptResult);
      } else {
        setScanError('No items found in receipt. Try a clearer photo.');
      }
    } catch (err: any) {
      setScanError(err.message || 'Failed to process receipt');
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleShareBill = () => {
    if (!tab?.share_token) return;
    const url = `${window.location.origin}/bill/${tab.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading || !tab) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const actionBar = (
    <div className="d-flex gap-2 mt-3 mb-3">
      <Button
        variant="outline-info"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={scanning}
      >
        {scanning ? (
          <>
            <Spinner animation="border" size="sm" className="me-1" />
            Scanning...
          </>
        ) : (
          'Scan Receipt'
        )}
      </Button>
      {tab.share_token && (
        <Button variant="outline-success" size="sm" onClick={handleShareBill}>
          {copied ? 'Copied!' : 'Share Bill'}
        </Button>
      )}
      {isDirty && !saving && (
        <Button variant="outline-success" size="sm" onClick={saveChanges}>
          Save
        </Button>
      )}
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
            title="Click to edit"
          >
            {tab.name}
          </h4>
        )}
        {saving && (
          <small className="text-muted">
            <Spinner animation="border" size="sm" className="me-1" />
            Saving...
          </small>
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
        onSelect={(id) =>
          setSelectedRabbitId(id === selectedRabbitId ? null : id)
        }
        onRemove={removeRabbit}
        onAddClick={() => setShowAddRabbit(true)}
      />

      {selectedRabbitId && (
        <p className="text-muted small mb-2">
          Tap items to assign them to{' '}
          <strong>
            {rabbits.find((r) => r.id === selectedRabbitId)?.name}
          </strong>
        </p>
      )}

      <ItemList
        items={items}
        rabbits={rabbits}
        assignments={assignments}
        selectedRabbitId={selectedRabbitId}
        onToggle={toggleAssignment}
        onAddItem={addItem}
        onDeleteItem={deleteItem}
      />

      <TotalsView
        tab={tab}
        items={items}
        rabbits={rabbits}
        assignments={assignments}
        onUpdateTab={updateTab}
        currentUserProfile={profile}
      />

      {actionBar}

      <AddRabbitModal
        show={showAddRabbit}
        onHide={() => setShowAddRabbit(false)}
        onAdd={(name, color) => addRabbit(name, color)}
        usedColors={rabbits.map((r) => r.color as RabbitColor)}
      />
    </div>
  );
}
