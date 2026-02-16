import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Form, ListGroup, Row, Col } from 'react-bootstrap';
import type { Item, Rabbit, ItemRabbit, Tab, Profile } from '../types';
import { formatCents } from '../utils/currency';
import { buildPaymentNote, venmoChargeLink, buildChargeNote } from '../utils/payments';
import { COLOR_HEX } from '../types';
import PaymentLinks from './PaymentLinks';

interface TotalsViewProps {
  tab: Tab;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  onUpdateTab: (updates: Partial<Tab>) => void;
  shareToken?: string;
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
  shareToken,
  currentUserProfile,
}: TotalsViewProps) {
  const [taxPercent, setTaxPercent] = useState(tab.tax_percent || 8.75);
  const [tipPercent, setTipPercent] = useState(tab.tip_percent || 18);
  const [copied, setCopied] = useState(false);

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

  const handleTaxChange = (val: number) => {
    setTaxPercent(val);
    onUpdateTab({ tax_percent: val });
  };

  const handleTipChange = (val: number) => {
    setTipPercent(val);
    onUpdateTab({ tip_percent: val });
  };

  if (items.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-top">
      <h5 className="mb-3">Totals</h5>

      <Row className="mb-3">
        <Col xs={6}>
          <Form.Group>
            <Form.Label className="small text-muted mb-1">Tax %</Form.Label>
            <Form.Control
              type="number"
              size="sm"
              step="0.01"
              value={taxPercent}
              onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
            />
          </Form.Group>
        </Col>
        <Col xs={6}>
          <Form.Group>
            <Form.Label className="small text-muted mb-1">Tip %</Form.Label>
            <Form.Range
              min={0}
              max={30}
              step={1}
              value={tipPercent}
              onChange={(e) => handleTipChange(parseFloat(e.target.value))}
            />
            <div className="d-flex justify-content-between small">
              <span>{tipPercent}%</span>
              <span>{formatCents(tipAmount)}</span>
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
                  <small className="text-muted">
                    {formatCents(subtotal)} + {formatCents(tax)} tax + {formatCents(tip)} tip
                  </small>
                </div>
                <div className="text-end">
                  <strong className="fs-5">{formatCents(total)}</strong>
                  <div className="mt-1">
                    <PaymentLinks
                      rabbit={rabbit}
                      amount={total / 100}
                      note={buildPaymentNote(tab.name, rabbit.name,
                        assignments
                          .filter((a) => a.rabbit_id === rabbit.id)
                          .map((a) => ({
                            description: items.find((i) => i.id === a.item_id)?.description || '',
                            splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
                          }))
                      )}
                    />
                  </div>
                  {currentUserProfile?.venmo_username && total > 0 && (
                    <div className="mt-1">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        href={venmoChargeLink(total / 100, buildChargeNote(tab.name, rabbit.name,
                          assignments
                            .filter((a) => a.rabbit_id === rabbit.id)
                            .map((a) => ({
                              description: items.find((i) => i.id === a.item_id)?.description || '',
                              splitCount: assignments.filter((x) => x.item_id === a.item_id).length,
                            }))
                        ))}
                      >
                        Request via Venmo
                      </Button>
                    </div>
                  )}
                </div>
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
            <span>{formatCents(itemsSubtotal)}</span>
          </div>
          <div className="d-flex justify-content-between small">
            <span>Tax ({taxPercent}%)</span>
            <span>{formatCents(taxAmount)}</span>
          </div>
          <div className="d-flex justify-content-between small mb-1">
            <span>Tip ({tipPercent}%)</span>
            <span>{formatCents(tipAmount)}</span>
          </div>
          <hr className="my-1" />
          <div className="d-flex justify-content-between">
            <strong>Grand Total</strong>
            <strong>{formatCents(grandTotal)}</strong>
          </div>
        </Card.Body>
      </Card>

      {shareToken && (
        <div className="mt-3 text-center">
          <Button
            variant="outline-success"
            onClick={() => {
              const url = `${window.location.origin}/bill/${shareToken}`;
              navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? 'Copied!' : 'Share Bill'}
          </Button>
        </div>
      )}
    </div>
  );
}
