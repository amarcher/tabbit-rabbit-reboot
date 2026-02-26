import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, InputGroup, ListGroup, Modal, Row, Col } from 'react-bootstrap';
import type { Item, Rabbit, ItemRabbit, Tab, Profile } from '../types';
import { formatCents } from '../utils/currency';
import { venmoChargeLink, buildChargeNote } from '../utils/payments';
import { COLOR_HEX } from '../types';
import PaymentLinks from './PaymentLinks';

interface TotalsViewProps {
  tab: Tab;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  onUpdateTab: (updates: Partial<Tab>) => void;
  currentUserProfile?: Profile | null;
}

interface RabbitTotal {
  rabbit: Rabbit;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export default function TotalsView({
  tab,
  items,
  rabbits,
  assignments,
  onUpdateTab,
  currentUserProfile,
}: TotalsViewProps) {
  const [taxPercent, setTaxPercent] = useState(tab.tax_percent || 7);
  const [tipPercent, setTipPercent] = useState(tab.tip_percent || 18);

  // Sync local slider state when tab values change externally (e.g. receipt scan)
  useEffect(() => { setTaxPercent(tab.tax_percent || 7); }, [tab.tax_percent]);
  useEffect(() => { setTipPercent(tab.tip_percent || 18); }, [tab.tip_percent]);

  const [chargeTarget, setChargeTarget] = useState<{ rabbit: Rabbit; total: number } | null>(null);
  const [venmoHandle, setVenmoHandle] = useState('');

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price_cents, 0),
    [items]
  );

  const assignedItemIds = useMemo(
    () => new Set(assignments.map((a) => a.item_id)),
    [assignments]
  );

  const unassignedItems = useMemo(
    () => items.filter((item) => !assignedItemIds.has(item.id)),
    [items, assignedItemIds]
  );

  const totals = useMemo(() => {
    return rabbits.map((rabbit) => {
      const rabbitItemIds = assignments
        .filter((a) => a.rabbit_id === rabbit.id)
        .map((a) => a.item_id);

      let subtotal = 0;
      for (const itemId of rabbitItemIds) {
        const item = items.find((i) => i.id === itemId);
        if (!item) continue;
        const numSplitters = assignments.filter(
          (a) => a.item_id === itemId
        ).length;
        subtotal += item.price_cents / numSplitters;
      }

      const tax = subtotal * (taxPercent / 100);
      const tip = subtotal * (tipPercent / 100);

      return {
        rabbit,
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        tip: Math.round(tip),
        total: Math.round(subtotal + tax + tip),
      } as RabbitTotal;
    });
  }, [rabbits, items, assignments, taxPercent, tipPercent]);

  const taxAmount = Math.round(itemsSubtotal * (taxPercent / 100));
  const tipAmount = Math.round(itemsSubtotal * (tipPercent / 100));
  const grandTotal = itemsSubtotal + taxAmount + tipAmount;

  const handleTaxChange = useCallback(
    (val: number) => {
      setTaxPercent(val);
      onUpdateTab({ tax_percent: val });
    },
    [onUpdateTab]
  );

  const handleTipChange = useCallback(
    (val: number) => {
      setTipPercent(val);
      onUpdateTab({ tip_percent: val });
    },
    [onUpdateTab]
  );

  const openChargeModal = useCallback(
    (rabbit: Rabbit, total: number) => {
      setVenmoHandle('');
      setChargeTarget({ rabbit, total });
    },
    []
  );

  const submitCharge = useCallback(() => {
    if (!chargeTarget || !venmoHandle.trim()) return;
    const { rabbit, total } = chargeTarget;
    const url = venmoChargeLink(
      venmoHandle.trim().replace(/^@/, ''),
      total / 100,
      buildChargeNote(tab.name, rabbit.name,
        assignments
          .filter((a) => a.rabbit_id === rabbit.id)
          .map((a) => ({
            description: items.find((i) => i.id === a.item_id)?.description || '',
            splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
          }))
      )
    );
    setChargeTarget(null);
    window.open(url, '_blank', 'noopener');
  }, [chargeTarget, venmoHandle, tab.name, items, assignments]);

  if (items.length === 0) return null;

  return (
    <div>
      <h5 className="mb-3">Totals</h5>

      <Row className="mb-3">
        <Col xs={6}>
          <Form.Group>
            <Form.Label className="small text-muted mb-1">Tax %</Form.Label>
            <Form.Range
              min={0}
              max={15}
              step={0.05}
              value={taxPercent}
              onChange={(e) => handleTaxChange(parseFloat(e.target.value))}
            />
            <div className="d-flex justify-content-between small">
              <span>{taxPercent}%</span>
              <span className="tr-mono">{formatCents(taxAmount)}</span>
            </div>
          </Form.Group>
        </Col>
        <Col xs={6}>
          <Form.Group>
            <Form.Label className="small text-muted mb-1">Tip %</Form.Label>
            <Form.Range
              min={0}
              max={30}
              step={0.05}
              value={tipPercent}
              onChange={(e) => handleTipChange(parseFloat(e.target.value))}
            />
            <div className="d-flex justify-content-between small">
              <span>{tipPercent}%</span>
              <span className="tr-mono">{formatCents(tipAmount)}</span>
            </div>
          </Form.Group>
        </Col>
      </Row>

      {/* Per-rabbit breakdown */}
      {totals.length > 0 && (
        <ListGroup className="mb-3">
          {totals.map(({ rabbit, subtotal, tax, tip, total }) => (
            <ListGroup.Item
              key={rabbit.id}
              style={{ backgroundColor: COLOR_HEX[rabbit.color] }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>{rabbit.name}</strong>
                  <br />
                  <small className="text-muted tr-mono">
                    {formatCents(subtotal)} + {formatCents(tax)} tax + {formatCents(tip)} tip
                  </small>
                </div>
                <strong className="fs-5 tr-mono">{formatCents(total)}</strong>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-1">
                <PaymentLinks
                  rabbit={rabbit}
                  amount={total / 100}
                  note={buildChargeNote(tab.name, rabbit.name,
                    assignments
                      .filter((a) => a.rabbit_id === rabbit.id)
                      .map((a) => ({
                        description: items.find((i) => i.id === a.item_id)?.description || '',
                        splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
                      }))
                  )}
                />
                {currentUserProfile?.venmo_username && total > 0 && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => openChargeModal(rabbit, total)}
                  >
                    Request via Venmo
                  </Button>
                )}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      {unassignedItems.length > 0 && rabbits.length > 0 && (
        <Alert variant="warning" className="py-2 small mb-3">
          {unassignedItems.length} item{unassignedItems.length > 1 ? 's' : ''} not
          assigned to anyone yet.
        </Alert>
      )}

      <Card>
        <Card.Body className="py-2">
          <div className="d-flex justify-content-between small">
            <span>Subtotal</span>
            <span className="tr-mono">{formatCents(itemsSubtotal)}</span>
          </div>
          <div className="d-flex justify-content-between small">
            <span>Tax ({taxPercent}%)</span>
            <span className="tr-mono">{formatCents(taxAmount)}</span>
          </div>
          <div className="d-flex justify-content-between small mb-1">
            <span>Tip ({tipPercent}%)</span>
            <span className="tr-mono">{formatCents(tipAmount)}</span>
          </div>
          <hr className="my-1" />
          <div className="d-flex justify-content-between">
            <strong>Grand Total</strong>
            <strong className="tr-mono">{formatCents(grandTotal)}</strong>
          </div>
        </Card.Body>
      </Card>

      <Modal show={chargeTarget != null} onHide={() => setChargeTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h6">
            Request from {chargeTarget?.rabbit.name} via Venmo
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => { e.preventDefault(); submitCharge(); }}>
            <Form.Label className="small text-muted mb-1">Venmo username</Form.Label>
            <InputGroup>
              <InputGroup.Text>@</InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="username"
                value={venmoHandle}
                onChange={(e) => setVenmoHandle(e.target.value)}
                autoFocus
              />
            </InputGroup>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setChargeTarget(null)}>
            Cancel
          </Button>
          <Button variant="warning" size="sm" onClick={submitCharge} disabled={!venmoHandle.trim()}>
            Send Request
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
