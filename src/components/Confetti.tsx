import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Vivid confetti colors inspired by rabbit palette
const CONFETTI_COLORS = [
  '#4CAF50', // green (success)
  '#00BCD4', // cyan (info)
  '#FF9800', // orange (warning/amber accent)
  '#F44336', // red (danger)
  '#2196F3', // blue (primary)
  '#9C27B0', // purple (secondary remix)
  '#FFEB3B', // yellow
  '#E91E63', // pink
];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  shape: 'rect' | 'circle' | 'strip';
}

interface ConfettiProps {
  /** Whether the confetti burst is active */
  active: boolean;
  /** x position of the burst origin (px from left of viewport) */
  originX: number;
  /** y position of the burst origin (px from top of viewport) */
  originY: number;
  /** Called when animation is done */
  onDone?: () => void;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 320,
    y: -(Math.random() * 260 + 60),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotation: Math.random() * 720 - 360,
    scale: 0.5 + Math.random() * 0.7,
    shape: (['rect', 'circle', 'strip'] as const)[Math.floor(Math.random() * 3)],
  }));
}

const PARTICLE_COUNT = 48;

export default function Confetti({ active, originX, originY, onDone }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>(() => generateParticles(PARTICLE_COUNT));

  useEffect(() => {
    if (!active) return;
    setParticles(generateParticles(PARTICLE_COUNT));
    const timer = setTimeout(() => {
      onDone?.();
    }, 1600);
    return () => clearTimeout(timer);
  }, [active, onDone]);

  return (
    <AnimatePresence>
      {active && (
        <div
          style={{
            position: 'fixed',
            left: originX,
            top: originY,
            width: 0,
            height: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            overflow: 'visible',
          }}
          aria-hidden="true"
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                rotate: 0,
                scale: 0,
              }}
              animate={{
                x: p.x,
                y: p.y,
                opacity: [1, 1, 0],
                rotate: p.rotation,
                scale: [0, p.scale, p.scale * 0.8],
              }}
              transition={{
                duration: 1.4,
                ease: [0.2, 0.8, 0.4, 1],
                opacity: { times: [0, 0.5, 1], duration: 1.4 },
                scale: { times: [0, 0.2, 1], duration: 1.4 },
              }}
              style={{
                position: 'absolute',
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'strip' ? '2px' : '2px',
                width: p.shape === 'strip' ? 4 : p.shape === 'circle' ? 8 : 10,
                height: p.shape === 'strip' ? 14 : p.shape === 'circle' ? 8 : 7,
                left: -4,
                top: -4,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
