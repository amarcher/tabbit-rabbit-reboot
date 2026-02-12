import React, { useMemo, useState } from 'react';
import { Card, Form, ListGroup, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import type { Item, Rabbit, ItemRabbit, Tab } from '../types';
import { formatCents } from '../utils/currency';
import { COLOR_HEX } from '../types';
import PaymentLinks from './PaymentLinks';

interface TotalsViewProps {
  tab: Tab;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
}

interface RabbitTotal {
  rabbit: Rabbit;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export default function TotalsView({ tab, items, rabbits, assignments }: TotalsViewProps) {
  const [taxPercent, setTaxPercent] = useState(tab.tax_percent || 8.75);
  const [tipPercent, setTipPercent] = useState(tab.tip_percent || 18);

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

  const grandSubtotal = totals.reduce((s, t) => s + t.subtotal, 0);
  const grandTotal = totals.reduce((s, t) => s + t.total, 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">{tab.name} &mdash; Totals</h4>
        <Link to={`/tabs/${tab.id}`}>
          <Button variant="outline-secondary" size="sm">
            Back to Tab
          </Button>
        </Link>
      </div>

      <Row className="mb-4">
        <Col sm={6}>
          <Form.Group>
            <Form.Label>Tax %</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={taxPercent}
              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
            />
          </Form.Group>
        </Col>
        <Col sm={6}>
          <Form.Group>
            <Form.Label>Tip %</Form.Label>
            <Form.Range
              min={0}
              max={30}
              step={1}
              value={tipPercent}
              onChange={(e) => setTipPercent(parseFloat(e.target.value))}
            />
            <div className="d-flex justify-content-between">
              <span>{tipPercent}%</span>
              <span>{formatCents(Math.round(grandSubtotal * (tipPercent / 100)))}</span>
            </div>
          </Form.Group>
        </Col>
      </Row>

      <ListGroup className="mb-4">
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
                  Subtotal: {formatCents(subtotal)} + Tax: {formatCents(tax)} + Tip:{' '}
                  {formatCents(tip)}
                </small>
              </div>
              <div className="text-end">
                <strong className="fs-5">{formatCents(total)}</strong>
                <div className="mt-1">
                  <PaymentLinks
                    rabbit={rabbit}
                    amount={total / 100}
                    tabName={tab.name}
                  />
                </div>
              </div>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Card>
        <Card.Body className="d-flex justify-content-between">
          <span>Grand Total</span>
          <strong className="fs-5">{formatCents(grandTotal)}</strong>
        </Card.Body>
      </Card>
    </div>
  );
}
