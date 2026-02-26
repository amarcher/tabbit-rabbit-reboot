import React, { useState } from 'react';
import { ListGroup, Form, InputGroup, Button } from 'react-bootstrap';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { parseDollars } from '../utils/currency';
import ItemRow from './ItemRow';

interface ItemListProps {
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  selectedRabbitId: string | null;
  onToggle: (itemId: string, rabbitId: string) => void;
  onAddItem: (description: string, priceCents: number) => void;
  onDeleteItem: (itemId: string) => void;
}

export default function ItemList({
  items,
  rabbits,
  assignments,
  selectedRabbitId,
  onToggle,
  onAddItem,
  onDeleteItem,
}: ItemListProps) {
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !price.trim()) return;
    onAddItem(desc.trim(), parseDollars(price));
    setDesc('');
    setPrice('');
  };

  return (
    <div>
      <ListGroup className={items.length > 0 ? 'mb-3' : ''}>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            rabbits={rabbits}
            assignments={assignments}
            selectedRabbitId={selectedRabbitId}
            onToggle={onToggle}
            onDelete={onDeleteItem}
          />
        ))}
      </ListGroup>

      <Form onSubmit={handleAdd}>
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Item name"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Form.Control
            type="text"
            placeholder="$0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ maxWidth: 100 }}
          />
          <Button variant="success" type="submit" disabled={!desc.trim() || !price.trim()}>
            Add
          </Button>
        </InputGroup>
      </Form>
    </div>
  );
}
