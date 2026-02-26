import React, { useEffect, useRef, useState } from 'react';
import { useMotionValue, animate } from 'framer-motion';

interface AnimatedNumberProps {
  /** The numeric value to display */
  value: number;
  /** Format function — receives the raw (potentially fractional) animated value */
  format?: (n: number) => string;
  /** Decimal places when no format fn is given */
  decimals?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Extra className */
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedNumber({
  value,
  format,
  decimals = 0,
  duration = 0.35,
  className,
  style,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(() =>
    format ? format(value) : value.toFixed(decimals)
  );
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;

    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplay(format ? format(latest) : latest.toFixed(decimals));
      },
    });

    return () => controls.stop();
  }, [value, duration, decimals, format, motionValue]);

  return (
    <>
      <span className={className} style={style} aria-hidden="true">
        {display}
      </span>
      <span className="visually-hidden" aria-live="polite">
        {format ? format(value) : value.toFixed(decimals)}
      </span>
    </>
  );
}
