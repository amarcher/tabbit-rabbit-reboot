import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { RABBIT_COLORS, RabbitColor } from '../types';

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
          <div className="d-flex gap-2">
            <span className="me-2 align-self-center">Color:</span>
            <Button variant={nextColor} size="sm" disabled>
              {nextColor}
            </Button>
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
