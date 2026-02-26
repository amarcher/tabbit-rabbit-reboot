import React, { useState, useCallback } from 'react';
import { ButtonGroup, Button, Dropdown } from 'react-bootstrap';
import { motion } from 'framer-motion';
import type { Rabbit } from '../types';
import { COLOR_HEX } from '../types';
import { formatCents } from '../utils/currency';
import './RabbitBar.css';

interface RabbitBarProps {
  rabbits: Rabbit[];
  selectedRabbitId: string | null;
  subtotals: Record<string, number>;
  onSelect: (rabbitId: string) => void;
  onRemove: (rabbitId: string) => void;
  onAddClick: () => void;
}

interface PingState {
  id: string;
  key: number;
  color: string;
}

export default function RabbitBar({
  rabbits,
  selectedRabbitId,
  subtotals,
  onSelect,
  onRemove,
  onAddClick,
}: RabbitBarProps) {
  const [activePing, setActivePing] = useState<PingState | null>(null);

  const handleSelect = useCallback(
    (rabbitId: string, color: string) => {
      // Only ping when selecting (not deselecting)
      if (selectedRabbitId !== rabbitId) {
        setActivePing({ id: rabbitId, key: Date.now(), color });
      }
      onSelect(rabbitId);
    },
    [selectedRabbitId, onSelect]
  );

  return (
    <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
      {rabbits.map((rabbit) => {
        const isSelected = selectedRabbitId === rabbit.id;
        const hex = COLOR_HEX[rabbit.color];

        return (
          <Dropdown as={ButtonGroup} key={rabbit.id} drop="up">
            {/* Wrapper holds the ping ring + the motion button */}
            <div className="tr-rabbit-btn-wrapper" style={{ position: 'relative' }}>
              {/* Sonar ping ring (CSS animation, no exit needed) */}
              {activePing?.id === rabbit.id && (
                <span
                  key={activePing.key}
                  className="tr-rabbit-ping"
                  style={{ backgroundColor: hex }}
                />
              )}

              {/* Spring-animated button wrapper */}
              <motion.div
                animate={isSelected ? 'selected' : 'idle'}
                whileTap={{ scale: 0.92 }}
                variants={{
                  idle: { scale: 1 },
                  selected: {
                    scale: [1, 0.9, 1.06, 1],
                    transition: {
                      duration: 0.35,
                      times: [0, 0.2, 0.6, 1],
                      ease: 'easeOut',
                    },
                  },
                }}
                style={{ display: 'inline-flex', position: 'relative', zIndex: 1 }}
              >
                <Button
                  variant={isSelected ? rabbit.color : `outline-${rabbit.color}`}
                  onClick={() => handleSelect(rabbit.id, hex)}
                  style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                >
                  {rabbit.name}{' '}
                  <span className="ms-1 badge bg-light text-dark tr-mono">
                    {formatCents(subtotals[rabbit.id] || 0)}
                  </span>
                </Button>
              </motion.div>
            </div>

            <Dropdown.Toggle
              split
              variant={isSelected ? rabbit.color : `outline-${rabbit.color}`}
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
        );
      })}
      <Button variant="outline-secondary" onClick={onAddClick}>
        + Add Someone
      </Button>
    </div>
  );
}
