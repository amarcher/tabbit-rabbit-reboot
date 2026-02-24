import React, { useState } from 'react';
import { Modal, Form, Button, Badge } from 'react-bootstrap';
import { RABBIT_COLORS, RabbitColor, COLOR_HEX } from '../types';
import type { SavedRabbit, Profile } from '../types';

interface AddRabbitModalProps {
  show: boolean;
  onHide: () => void;
  onAdd: (name: string, color: RabbitColor, profile?: Profile) => void;
  usedColors: RabbitColor[];
  savedRabbits?: SavedRabbit[];
  onAddSavedRabbit?: (saved: SavedRabbit) => void;
  onRemoveSavedRabbit?: (id: string) => void;
}

export default function AddRabbitModal({
  show,
  onHide,
  onAdd,
  usedColors,
  savedRabbits = [],
  onAddSavedRabbit,
  onRemoveSavedRabbit,
}: AddRabbitModalProps) {
  const [name, setName] = useState('');
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [showPaymentFields, setShowPaymentFields] = useState(false);

  const nextColor =
    RABBIT_COLORS.find((c) => !usedColors.includes(c)) || RABBIT_COLORS[0];

  const stripPrefix = (val: string) => val.replace(/^[@$]/, '');

  const resetForm = () => {
    setName('');
    setVenmo('');
    setCashapp('');
    setPaypal('');
    setShowPaymentFields(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const venmoClean = stripPrefix(venmo.trim()) || null;
    const cashappClean = stripPrefix(cashapp.trim()) || null;
    const paypalClean = stripPrefix(paypal.trim()) || null;
    const hasPayment = venmoClean || cashappClean || paypalClean;

    let profile: Profile | undefined;
    if (hasPayment) {
      profile = {
        id: crypto.randomUUID(),
        username: name.trim().toLowerCase().replace(/\s+/g, '-'),
        display_name: name.trim(),
        venmo_username: venmoClean,
        cashapp_cashtag: cashappClean,
        paypal_username: paypalClean,
        created_at: new Date().toISOString(),
      };

      // Auto-save to library
      onAddSavedRabbit?.({
        id: crypto.randomUUID(),
        name: name.trim(),
        color: nextColor,
        venmo_username: venmoClean,
        cashapp_cashtag: cashappClean,
        paypal_username: paypalClean,
      });
    }

    onAdd(name.trim(), nextColor, profile);
    resetForm();
    onHide();
  };

  const handleQuickAdd = (saved: SavedRabbit) => {
    const profile: Profile = {
      id: crypto.randomUUID(),
      username: saved.name.toLowerCase().replace(/\s+/g, '-'),
      display_name: saved.name,
      venmo_username: saved.venmo_username,
      cashapp_cashtag: saved.cashapp_cashtag,
      paypal_username: saved.paypal_username,
      created_at: new Date().toISOString(),
    };

    const color = usedColors.includes(saved.color) ? nextColor : saved.color;
    onAdd(saved.name, color, profile);
    resetForm();
    onHide();
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Someone</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Saved Rabbits */}
          {savedRabbits.length > 0 && (
            <>
              <div className="mb-2">
                <small className="text-muted fw-semibold">Saved Rabbits</small>
              </div>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {savedRabbits.map((saved) => (
                  <Badge
                    key={saved.id}
                    pill
                    role="button"
                    style={{
                      backgroundColor: COLOR_HEX[saved.color],
                      color: '#333',
                      fontWeight: 600,
                      fontSize: '0.85em',
                      cursor: 'pointer',
                      border: '1.5px solid rgba(0,0,0,0.1)',
                    }}
                    onClick={() => handleQuickAdd(saved)}
                    title={`Click to add ${saved.name}`}
                  >
                    {saved.name}
                    {(saved.venmo_username || saved.cashapp_cashtag || saved.paypal_username) && (
                      <span className="ms-1 text-success fw-bold">$</span>
                    )}
                  </Badge>
                ))}
              </div>
              <div className="d-flex align-items-center gap-2 mb-3">
                <hr className="flex-grow-1 m-0" />
                <small className="text-muted">or add new</small>
                <hr className="flex-grow-1 m-0" />
              </div>
            </>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </Form.Group>
          <div className="d-flex align-items-center gap-2 mb-3">
            <span>Color:</span>
            <span
              style={{
                display: 'inline-block',
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: COLOR_HEX[nextColor],
                border: '1px solid rgba(0,0,0,0.15)',
              }}
            />
          </div>

          {/* Payment Fields */}
          {!showPaymentFields ? (
            <Button
              variant="link"
              size="sm"
              className="p-0 mb-2"
              onClick={() => setShowPaymentFields(true)}
            >
              + Add payment info
            </Button>
          ) : (
            <div>
              <small className="text-muted fw-semibold d-block mb-2">Payment Info (optional)</small>
              <Form.Group className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="Venmo username"
                  value={venmo}
                  onChange={(e) => setVenmo(e.target.value)}
                  autoComplete="off"
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="Cash App $cashtag"
                  value={cashapp}
                  onChange={(e) => setCashapp(e.target.value)}
                  autoComplete="off"
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="PayPal username"
                  value={paypal}
                  onChange={(e) => setPaypal(e.target.value)}
                  autoComplete="off"
                />
              </Form.Group>
              <small className="text-muted">
                Adding payment info saves this rabbit for future tabs.
              </small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>
            Add
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
