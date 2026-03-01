import React from 'react';
import { ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { formatAmount } from '../utils/currency';
import { getGradientStyle } from '../utils/gradients';

interface ItemRowProps {
  item: Item;
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  selectedRabbitId: string | null;
  currencyCode: string;
  onToggle: (itemId: string, rabbitId: string) => void;
  onDelete: (itemId: string) => void;
}

export default function ItemRow({
  item,
  rabbits,
  assignments,
  selectedRabbitId,
  currencyCode,
  onToggle,
  onDelete,
}: ItemRowProps) {
  const { t } = useTranslation();
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
        <strong className="tr-mono">{formatAmount(item.price_cents, currencyCode)}</strong>
        <button
          type="button"
          className="tr-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          aria-label={t('itemRow.deleteAriaLabel')}
        >
          &times;
        </button>
      </span>
    </ListGroup.Item>
  );
}
