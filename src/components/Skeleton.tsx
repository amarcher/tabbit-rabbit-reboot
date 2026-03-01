import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circle' | 'rect';
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height, variant = 'text', className = '', style }: SkeletonProps) {
  const variantClass =
    variant === 'circle'
      ? 'skeleton--circle'
      : variant === 'rect'
      ? 'skeleton--rect'
      : '';

  const defaultHeight = variant === 'text' ? '1em' : variant === 'circle' ? width : '1.5rem';

  return (
    <span
      className={`skeleton ${variantClass} ${className}`}
      style={{
        width,
        height: height ?? defaultHeight,
        display: 'block',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

/* Skeleton rows for the tab list */
export function TabListSkeleton() {
  const { t } = useTranslation();
  const rows = [
    { nameWidth: '55%', dateWidth: '15%', delay: 0 },
    { nameWidth: '40%', dateWidth: '15%', delay: 0.06 },
    { nameWidth: '65%', dateWidth: '15%', delay: 0.12 },
    { nameWidth: '48%', dateWidth: '15%', delay: 0.18 },
  ];

  return (
    <div className="list-group" role="status" aria-label={t('common.loadingTabs')}>
      {rows.map((row, i) => (
        <motion.div
          key={i}
          className="skeleton-tab-row"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: row.delay, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="skeleton-tab-row__content">
            <Skeleton width={row.nameWidth} height="0.9rem" />
            <Skeleton width="30%" height="0.75rem" />
          </div>
          <Skeleton width={row.dateWidth} height="0.75rem" style={{ flexShrink: 0 }} />
        </motion.div>
      ))}
    </div>
  );
}

/* Skeleton rows for the item list in TabEditor */
export function ItemListSkeleton() {
  const { t } = useTranslation();
  const rows = [
    { nameWidth: '60%', delay: 0 },
    { nameWidth: '45%', delay: 0.05 },
    { nameWidth: '70%', delay: 0.1 },
    { nameWidth: '52%', delay: 0.15 },
  ];

  return (
    <div className="list-group" role="status" aria-label={t('common.loadingItems')}>
      {rows.map((row, i) => (
        <motion.div
          key={i}
          className="skeleton-item-row"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: row.delay, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Skeleton width={row.nameWidth} height="0.85rem" />
          <Skeleton width="3rem" height="0.85rem" style={{ flexShrink: 0 }} />
        </motion.div>
      ))}
    </div>
  );
}

/* Skeleton for the TotalsView panel */
export function TotalsSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      aria-hidden="true"
    >
      <Skeleton width="30%" height="1rem" className="mb-3" />
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height="0.75rem" className="mb-2" />
          <Skeleton width="100%" height="0.5rem" className="mb-1" />
          <Skeleton width="80%" height="0.75rem" />
        </div>
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height="0.75rem" className="mb-2" />
          <Skeleton width="100%" height="0.5rem" className="mb-1" />
          <Skeleton width="80%" height="0.75rem" />
        </div>
      </div>
      <Skeleton width="100%" height="5rem" variant="rect" />
    </motion.div>
  );
}
