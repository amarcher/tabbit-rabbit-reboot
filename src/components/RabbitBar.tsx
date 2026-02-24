import React from 'react';
import { ButtonGroup, Button, Dropdown } from 'react-bootstrap';
import type { Rabbit } from '../types';
import { formatCents } from '../utils/currency';

interface RabbitBarProps {
  rabbits: Rabbit[];
  selectedRabbitId: string | null;
  subtotals: Record<string, number>;
  onSelect: (rabbitId: string) => void;
  onRemove: (rabbitId: string) => void;
  onAddClick: () => void;
}

export default function RabbitBar({
  rabbits,
  selectedRabbitId,
  subtotals,
  onSelect,
  onRemove,
  onAddClick,
}: RabbitBarProps) {
  return (
    <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
      {rabbits.map((rabbit) => (
        <Dropdown as={ButtonGroup} key={rabbit.id} drop="up">
          <Button
            variant={
              selectedRabbitId === rabbit.id
                ? rabbit.color
                : `outline-${rabbit.color}`
            }
            onClick={() => onSelect(rabbit.id)}
          >
            {rabbit.name}{' '}
            <span className="ms-1 badge bg-light text-dark tr-mono">
              {formatCents(subtotals[rabbit.id] || 0)}
            </span>
          </Button>
          <Dropdown.Toggle
            split
            variant={
              selectedRabbitId === rabbit.id
                ? rabbit.color
                : `outline-${rabbit.color}`
            }
          />
          <Dropdown.Menu>
            <Dropdown.Item
              onClick={() => {
                if (window.confirm(`Remove ${rabbit.name}?`)) {
                  onRemove(rabbit.id);
                }
              }}
            >
              Remove
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      ))}
      <Button variant="outline-secondary" onClick={onAddClick}>
        + Add Someone
      </Button>
    </div>
  );
}
