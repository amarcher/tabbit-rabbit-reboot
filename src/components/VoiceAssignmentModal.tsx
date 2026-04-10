import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, ListGroup, Modal } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { COLOR_HEX } from '../types';
import { formatAmount } from '../utils/currency';
import { parseVoiceAssignmentDirect, parseVoiceAssignmentFree } from '../utils/voiceAssignment';
import { trackVoiceAssignment } from '../utils/analytics';
import type { VoiceAssignmentResult } from '../utils/voiceAssignment';
import { computeAssignmentFraction } from '@tabbit/shared';
import { getStoredApiKey } from '../utils/anthropic';
import { canScanFree, incrementScanCount, FREE_SCAN_LIMIT } from '../utils/scanCounter';
import LoadingSpinner from './LoadingSpinner';

interface VoiceAssignmentModalProps {
  show: boolean;
  onHide: () => void;
  transcript: string;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  currencyCode: string;
  onApply: (assignments: ItemRabbit[]) => void;
}

type Phase = 'processing' | 'confirm';

export default function VoiceAssignmentModal({
  show,
  onHide,
  transcript,
  items,
  rabbits,
  assignments,
  currencyCode,
  onApply,
}: VoiceAssignmentModalProps) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>('processing');
  const [error, setError] = useState('');
  const [result, setResult] = useState<VoiceAssignmentResult | null>(null);

  // Start processing when modal opens with a transcript
  useEffect(() => {
    if (!show || !transcript.trim()) return;

    setPhase('processing');
    setError('');
    setResult(null);

    const byokKey = getStoredApiKey();
    if (!byokKey && !canScanFree()) {
      setError(t('voiceAssignment.scanLimitReached', { limit: FREE_SCAN_LIMIT }));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        let parsed: VoiceAssignmentResult;
        if (byokKey) {
          parsed = await parseVoiceAssignmentDirect(byokKey, transcript, items, rabbits, assignments);
          trackVoiceAssignment('byok');
        } else {
          parsed = await parseVoiceAssignmentFree(transcript, items, rabbits, assignments);
          incrementScanCount();
          trackVoiceAssignment('free');
        }
        if (!cancelled) {
          setResult(parsed);
          setPhase('confirm');
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || t('voiceAssignment.processingFailed'));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [show, transcript, items, rabbits, assignments, t]);

  const handleApply = useCallback(() => {
    if (!result) return;
    onApply(result.assignments.map((a) => ({
      item_id: a.item_id,
      rabbit_id: a.rabbit_id,
      ...(a.share !== 1 ? { share: a.share } : {}),
    })));
    onHide();
  }, [result, onApply, onHide]);

  return (
    <AnimatePresence>
      {show && (
        <Modal show onHide={onHide} centered size="lg">
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          >
            <Modal.Header closeButton>
              <Modal.Title as="h6">
                {phase === 'confirm' ? t('voiceAssignment.reviewAssignments') : t('voiceAssignment.processing')}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {error && (
                <Alert variant="danger" className="py-2 small" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {phase === 'processing' && !error && (
                <div className="text-center py-4">
                  <LoadingSpinner size="md" message={t('voiceAssignment.processing')} />
                </div>
              )}

              {phase === 'confirm' && result && (
                <div>
                  {result.assignments.length > 0 ? (
                    <ListGroup className="mb-3">
                      {result.assignments.map((a, i) => {
                        const item = items.find((it) => it.id === a.item_id);
                        const rabbit = rabbits.find((r) => r.id === a.rabbit_id);
                        if (!item || !rabbit) return null;

                        const { fraction, isSplit, label: fractionLabel } = computeAssignmentFraction(
                          a,
                          result.assignments,
                          assignments,
                        );

                        return (
                          <ListGroup.Item
                            key={i}
                            style={{ backgroundColor: COLOR_HEX[rabbit.color] }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <span>
                                <strong>{rabbit.name}</strong>
                                {' \u2192 '}
                                {item.description}
                                {' '}
                                <span className="tr-mono">
                                  ({formatAmount(item.price_cents, currencyCode)})
                                </span>
                              </span>
                              {isSplit && (
                                <div className="d-flex align-items-center gap-1 ms-2">
                                  <div
                                    style={{
                                      width: 32,
                                      height: 8,
                                      borderRadius: 4,
                                      backgroundColor: 'rgba(0,0,0,0.15)',
                                      overflow: 'hidden',
                                      display: 'flex',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${fraction * 100}%`,
                                        height: '100%',
                                        borderRadius: 4,
                                        backgroundColor: COLOR_HEX[rabbit.color] || '#6c757d',
                                      }}
                                    />
                                  </div>
                                  <Badge bg="secondary" className="small">
                                    {fractionLabel}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </ListGroup.Item>
                        );
                      })}
                    </ListGroup>
                  ) : (
                    <Alert variant="info" className="py-2 small">
                      {t('voiceAssignment.noAssignmentsFound')}
                    </Alert>
                  )}
                  {result.warnings.length > 0 && (
                    <Alert variant="warning" className="py-2 small">
                      {result.warnings.map((w, i) => (
                        <div key={i}>{w}</div>
                      ))}
                    </Alert>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              {phase === 'confirm' && result && result.assignments.length > 0 && (
                <>
                  <Button variant="outline-secondary" size="sm" onClick={onHide}>
                    {t('voiceAssignment.tryAgain')}
                  </Button>
                  <Button variant="success" size="sm" onClick={handleApply}>
                    {t('voiceAssignment.apply', { count: result.assignments.length })}
                  </Button>
                </>
              )}
              {phase === 'confirm' && result && result.assignments.length === 0 && (
                <Button variant="outline-secondary" size="sm" onClick={onHide}>
                  {t('voiceAssignment.tryAgain')}
                </Button>
              )}
              {error && (
                <Button variant="outline-secondary" size="sm" onClick={onHide}>
                  {t('voiceAssignment.cancel')}
                </Button>
              )}
            </Modal.Footer>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
}
