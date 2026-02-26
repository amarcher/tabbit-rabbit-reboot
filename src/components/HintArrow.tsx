import React from 'react';

interface HintArrowProps {
  children: React.ReactNode;
}

/** Muted hint text prefixed with a curved arrow pointing down-left. */
export default function HintArrow({ children }: HintArrowProps) {
  return (
    <span className="text-muted small">
      <span style={{ position: 'relative', top: 4 }}>&#10553;</span>{' '}
      {children}
    </span>
  );
}
