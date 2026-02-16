import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { RABBIT_COLORS, RabbitColor, COLOR_HEX } from '../types';

interface AddRabbitModalProps {
  show: boolean;
  onHide: () => void;
  onAdd: (name: string, color: RabbitColor) => void;
  usedColors: RabbitColor[];
}

export default function AddRabbitModal({
  show,
  onHide,
  onAdd,
  usedColors,
}: AddRabbitModalProps) {
  const [name, setName] = useState('');

  const nextColor =
    RABBIT_COLORS.find((c) => !usedColors.includes(c)) || RABBIT_COLORS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), nextColor);
    setName('');
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Someone</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
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
          <div className="d-flex align-items-center gap-2">
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
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
