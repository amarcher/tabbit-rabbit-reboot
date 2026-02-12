import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, ListGroup, Container, Spinner, Alert } from 'react-bootstrap';
import { useSharedTab } from '../hooks/useSharedTab';
import { formatCents } from '../utils/currency';
import { buildPaymentNote } from '../utils/payments';
import { getGradientStyle } from '../utils/gradients';
import { COLOR_HEX, RabbitColor } from '../types';
import OwnerPaymentLinks from '../components/OwnerPaymentLinks';

export default function SharedBillPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data, loading, error } = useSharedTab(shareToken);

  const totals = useMemo(() => {
    if (!data) return [];
    const { items, rabbits, assignments, tab } = data;

    return rabbits.map((rabbit) => {
      const rabbitItemIds = assignments
        .filter((a) => a.rabbit_id === rabbit.id)
        .map((a) => a.item_id);

      let subtotal = 0;
      for (const itemId of rabbitItemIds) {
        const item = items.find((i) => i.id === itemId);
        if (!item) continue;
        const numSplitters = assignments.filter((a) => a.item_id === itemId).length;
        subtotal += item.price_cents / numSplitters;
      }

      const tax = subtotal * (tab.tax_percent / 100);
      const tip = subtotal * (tab.tip_percent / 100);

      return {
        rabbit,
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        tip: Math.round(tip),
        total: Math.round(subtotal + tax + tip),
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Container className="d-flex justify-content-center" style={{ paddingTop: '80px' }}>
        <Card style={{ maxWidth: 500, width: '100%' }}>
          <Card.Body className="text-center">
            <img src="/tblogo.png" alt="Tabbit" style={{ maxWidth: 150 }} className="mb-3" />
            <Alert variant="warning">{error || 'Bill not found'}</Alert>
            <Link to="/login" className="btn btn-success">
              Sign in to Tabbit Rabbit
            </Link>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const { tab, items, rabbits, assignments, ownerProfile } = data;
  const itemsSubtotal = items.reduce((sum, item) => sum + item.price_cents, 0);
  const taxAmount = Math.round(itemsSubtotal * (tab.tax_percent / 100));
  const tipAmount = Math.round(itemsSubtotal * (tab.tip_percent / 100));
  const grandTotal = itemsSubtotal + taxAmount + tipAmount;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="text-center mb-4">
        <img src="/tblogo.png" alt="Tabbit" style={{ maxWidth: 120 }} className="mb-2" />
        <h3>{tab.name}</h3>
        {ownerProfile.display_name && (
          <p className="text-muted">Shared by {ownerProfile.display_name}</p>
        )}
      </div>

      {/* Items */}
      <ListGroup className="mb-3">
        {items.map((item) => {
          const itemRabbitColors = assignments
            .filter((a) => a.item_id === item.id)
            .map((a) => {
              const rabbit = rabbits.find((r) => r.id === a.rabbit_id);
              return rabbit?.color as RabbitColor;
            })
            .filter(Boolean);

          return (
            <ListGroup.Item
              key={item.id}
              style={getGradientStyle(itemRabbitColors)}
              className="d-flex justify-content-between"
            >
              <span>{item.description}</span>
              <strong>{formatCents(item.price_cents)}</strong>
            </ListGroup.Item>
          );
        })}
      </ListGroup>

      {/* Per-rabbit breakdown */}
      {totals.length > 0 && (
        <>
          <h5 className="mb-2">What each person owes</h5>
          <ListGroup className="mb-3">
            {totals.map(({ rabbit, subtotal, tax, tip, total }) => (
              <ListGroup.Item
                key={rabbit.id}
                style={{ backgroundColor: COLOR_HEX[rabbit.color as RabbitColor] || '#f8f9fa' }}
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
                      <OwnerPaymentLinks
                        ownerProfile={ownerProfile}
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
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}

      {/* Grand total */}
      <Card className="mb-4">
        <Card.Body className="py-2">
          <div className="d-flex justify-content-between small">
            <span>Subtotal</span>
            <span>{formatCents(itemsSubtotal)}</span>
          </div>
          <div className="d-flex justify-content-between small">
            <span>Tax ({tab.tax_percent}%)</span>
            <span>{formatCents(taxAmount)}</span>
          </div>
          <div className="d-flex justify-content-between small mb-1">
            <span>Tip ({tab.tip_percent}%)</span>
            <span>{formatCents(tipAmount)}</span>
          </div>
          <hr className="my-1" />
          <div className="d-flex justify-content-between">
            <strong>Grand Total</strong>
            <strong>{formatCents(grandTotal)}</strong>
          </div>
        </Card.Body>
      </Card>

      {/* CTA */}
      <Card className="text-center mb-4" bg="light">
        <Card.Body>
          <p className="mb-2">Split bills with friends</p>
          <Link to="/login" className="btn btn-success">
            Sign in to Tabbit Rabbit
          </Link>
        </Card.Body>
      </Card>
    </div>
  );
}
