import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { createPopper, Instance as PopperInstance } from '@popperjs/core';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface NuxBubbleProps {
  target: Element;
  message: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  stepIndex: number;
  totalSteps: number;
  showDismiss: boolean;
  onDismiss: () => void;
  onSkipAll: () => void;
}

function renderMessage(msg: string): React.ReactNode {
  // Convert **bold** to <strong>
  const parts = msg.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function NuxBubble({
  target,
  message,
  placement = 'bottom',
  stepIndex,
  totalSteps,
  showDismiss,
  onDismiss,
  onSkipAll,
}: NuxBubbleProps) {
  const { t } = useTranslation();
  const popperAnchorRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const popperRef = useRef<PopperInstance | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const anchorEl = popperAnchorRef.current;
    const arrowEl = arrowRef.current;
    if (!anchorEl || !arrowEl) return;

    popperRef.current = createPopper(target as Element, anchorEl, {
      placement,
      modifiers: [
        { name: 'arrow', options: { element: arrowEl, padding: 8 } },
        { name: 'offset', options: { offset: [0, 12] } },
        { name: 'preventOverflow', options: { padding: 12 } },
        { name: 'flip', options: { fallbackPlacements: ['top', 'bottom', 'left', 'right'] } },
      ],
    });

    // Let Popper compute position before revealing
    requestAnimationFrame(() => setReady(true));

    return () => {
      popperRef.current?.destroy();
      popperRef.current = null;
    };
  }, [target, placement]);

  useEffect(() => {
    popperRef.current?.update();
  }, [message, ready]);

  return ReactDOM.createPortal(
    // Outer div: positioned by Popper (uses transform). No framer-motion here.
    <div
      ref={popperAnchorRef}
      className="nux-bubble"
      style={{ visibility: ready ? 'visible' : 'hidden' }}
    >
      {/* Inner div: animated by framer-motion (opacity only, no transform conflict) */}
      <motion.div
        role="tooltip"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : { opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      >
        <div className="nux-bubble__message">{renderMessage(message)}</div>
        <div className="nux-bubble__footer">
          <span className="nux-bubble__step-counter">
            {t('nux.stepOf', { current: stepIndex + 1, total: totalSteps })}
          </span>
          <div className="nux-bubble__actions">
            <button type="button" className="nux-bubble__skip-link" onClick={onSkipAll}>
              {t('nux.skipTour')}
            </button>
            {showDismiss && (
              <button type="button" className="nux-bubble__dismiss-btn" onClick={onDismiss}>
                {t('nux.gotIt')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
      <div ref={arrowRef} className="nux-bubble__arrow" />
    </div>,
    document.body
  );
}
