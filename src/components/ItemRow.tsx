import React from 'react';
import { ListGroup, Button } from 'react-bootstrap';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { formatCents } from '../utils/currency';
import { getGradientStyle } from '../utils/gradients';

interface ItemRowProps {
  item: Item;
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  selectedRabbitId: string | null;
  onToggle: (itemId: string, rabbitId: string) => void;
  onDelete: (itemId: string) => void;
}

export default function ItemRow({
  item,
  rabbits,
  assignments,
  selectedRabbitId,
  onToggle,
  onDelete,
}: ItemRowProps) {
  const itemRabbitIds = assignments
    .filter((a) => a.item_id === item.id)
    .map((a) => a.rabbit_id);

  const assignedRabbits = rabbits.filter((r) => itemRabbitIds.includes(r.id));
  const colors = assignedRabbits.map((r) => r.color);
  const gradientStyle = getGradientStyle(colors);

  const isSelectedRabbitAssigned =
    selectedRabbitId != null && itemRabbitIds.includes(selectedRabbitId);

  return (
    <ListGroup.Item
      action={selectedRabbitId != null}
      onClick={() => {
        if (selectedRabbitId) {
          onToggle(item.id, selectedRabbitId);
        }
      }}
      style={{
        ...gradientStyle,
        cursor: selectedRabbitId ? 'pointer' : 'default',
        boxShadow:
          selectedRabbitId && isSelectedRabbitAssigned
            ? '0 0 10px #EDD29E'
            : undefined,
      }}
      className="d-flex justify-content-between align-items-center"
    >
      <span>{item.description}</span>
      <span className="d-flex align-items-center gap-2">
        <strong>{formatCents(item.price_cents)}</strong>
        <Button
          variant="outline-danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
        >
          &times;
        </Button>
      </span>
    </ListGroup.Item>
  );
}
