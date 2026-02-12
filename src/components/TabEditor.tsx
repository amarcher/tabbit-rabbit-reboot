import React, { useCallback, useMemo, useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useTab } from '../hooks/useTab';
import { useRealtime } from '../hooks/useRealtime';
import ItemList from './ItemList';
import RabbitBar from './RabbitBar';
import AddRabbitModal from './AddRabbitModal';
import ReceiptUpload from './ReceiptUpload';
import type { RabbitColor } from '../types';

export default function TabEditor() {
  const { tabId } = useParams<{ tabId: string }>();
  const {
    tab,
    items,
    rabbits,
    assignments,
    loading,
    fetchTab,
    updateTab,
    addItem,
    deleteItem,
    addRabbit,
    removeRabbit,
    toggleAssignment,
  } = useTab(tabId);

  const [selectedRabbitId, setSelectedRabbitId] = useState<string | null>(null);
  const [showAddRabbit, setShowAddRabbit] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tabName, setTabName] = useState('');

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

  const handleNameSave = async () => {
    if (tabName.trim() && tabName.trim() !== tab?.name) {
      await updateTab({ name: tabName.trim() });
    }
    setEditingName(false);
  };

  const handleReceiptItems = async (
    parsedItems: { description: string; price: number }[]
  ) => {
    for (const item of parsedItems) {
      await addItem(item.description, Math.round(item.price * 100));
    }
  };

  if (loading || !tab) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
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
            title="Click to edit"
          >
            {tab.name}
          </h4>
        )}
        <Link to={`/tabs/${tab.id}/totals`}>
          <Button variant="primary" size="sm">
            View Totals
          </Button>
        </Link>
      </div>

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

      <ReceiptUpload tabId={tab.id} onItemsParsed={handleReceiptItems} />

      <ItemList
        items={items}
        rabbits={rabbits}
        assignments={assignments}
        selectedRabbitId={selectedRabbitId}
        onToggle={toggleAssignment}
        onAddItem={addItem}
        onDeleteItem={deleteItem}
      />

      <AddRabbitModal
        show={showAddRabbit}
        onHide={() => setShowAddRabbit(false)}
        onAdd={(name, color) => addRabbit(name, color)}
        usedColors={rabbits.map((r) => r.color as RabbitColor)}
      />
    </div>
  );
}
