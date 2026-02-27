import React, { useState } from 'react';
import { ListGroup, Form, InputGroup, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { parseAmount, getPricePlaceholder } from '../utils/currency';
import ItemRow from './ItemRow';

interface ItemListProps {
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  selectedRabbitId: string | null;
  currencyCode: string;
  onToggle: (itemId: string, rabbitId: string) => void;
  onAddItem: (description: string, priceCents: number) => void;
  onDeleteItem: (itemId: string) => void;
}

export default function ItemList({
  items,
  rabbits,
  assignments,
  selectedRabbitId,
  currencyCode,
  onToggle,
  onAddItem,
  onDeleteItem,
}: ItemListProps) {
  const { t } = useTranslation();
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !price.trim()) return;
    onAddItem(desc.trim(), parseAmount(price, currencyCode));
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
            currencyCode={currencyCode}
            onToggle={onToggle}
            onDelete={onDeleteItem}
          />
        ))}
      </ListGroup>

      <Form onSubmit={handleAdd} data-nux="add-item-form">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder={t('itemList.itemNamePlaceholder')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Form.Control
            type="text"
            placeholder={getPricePlaceholder(currencyCode)}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ maxWidth: 100 }}
          />
          <Button variant="success" type="submit" disabled={!desc.trim() || !price.trim()}>
            {t('itemList.addButton')}
          </Button>
        </InputGroup>
      </Form>
    </div>
  );
}
