import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Form, ListGroup, Modal } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Item, Rabbit, ItemRabbit } from '../types';
import { COLOR_HEX } from '../types';
import { formatAmount } from '../utils/currency';
import { isSpeechRecognitionSupported, startSpeechRecognition } from '../utils/speechRecognition';
import { parseVoiceAssignmentDirect, parseVoiceAssignmentFree } from '../utils/voiceAssignment';
import type { VoiceAssignmentResult } from '../utils/voiceAssignment';
import { computeAssignmentFraction } from '@tabbit/shared';
import { getStoredApiKey } from '../utils/anthropic';
import { canScanFree, incrementScanCount, FREE_SCAN_LIMIT } from '../utils/scanCounter';
import LoadingSpinner from './LoadingSpinner';

interface VoiceAssignmentModalProps {
  show: boolean;
  onHide: () => void;
  items: Item[];
  rabbits: Rabbit[];
  assignments: ItemRabbit[];
  currencyCode: string;
  onApply: (assignments: ItemRabbit[]) => void;
}

type Phase = 'input' | 'processing' | 'confirm';

export default function VoiceAssignmentModal({
  show,
  onHide,
  items,
  rabbits,
  assignments,
  currencyCode,
  onApply,
}: VoiceAssignmentModalProps) {
  const { t, i18n } = useTranslation();
  const speechSupported = isSpeechRecognitionSupported();

  const [phase, setPhase] = useState<Phase>('input');
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<VoiceAssignmentResult | null>(null);

  const sessionRef = useRef<{ stop: () => void } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setPhase('input');
      setRecording(false);
      setTranscript('');
      setInterimText('');
      setTextInput('');
      setError('');
      setResult(null);
    }
  }, [show]);

  // Cleanup speech session on unmount
  useEffect(() => {
    return () => { sessionRef.current?.stop(); };
  }, []);

  const startRecording = useCallback(() => {
    setError('');
    setTranscript('');
    setInterimText('');
    setRecording(true);

    const SPEECH_LANG_MAP: Record<string, string> = {
      en: 'en-US', es: 'es-ES', hi: 'hi-IN', pt: 'pt-BR',
      ko: 'ko-KR', ja: 'ja-JP', zh: 'zh-CN', de: 'de-DE',
      ru: 'ru-RU', fr: 'fr-FR', it: 'it-IT', vi: 'vi-VN',
    };

    sessionRef.current = startSpeechRecognition({
      lang: SPEECH_LANG_MAP[i18n.language] || 'en-US',
      onInterimResult: (text) => setInterimText(text),
      onFinalResult: (text) => {
        setTranscript(text);
        setRecording(false);
      },
      onError: (err) => {
        setError(err);
        setRecording(false);
      },
      onEnd: () => setRecording(false),
    });
  }, [i18n.language]);

  const stopRecording = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
  }, []);

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const byokKey = getStoredApiKey();
    if (!byokKey && !canScanFree()) {
      setError(t('voiceAssignment.scanLimitReached', { limit: FREE_SCAN_LIMIT }));
      return;
    }

    setPhase('processing');
    setError('');

    try {
      let parsed: VoiceAssignmentResult;
      if (byokKey) {
        parsed = await parseVoiceAssignmentDirect(byokKey, text, items, rabbits, assignments);
      } else {
        parsed = await parseVoiceAssignmentFree(text, items, rabbits, assignments);
        incrementScanCount();
      }
      setResult(parsed);
      setPhase('confirm');
    } catch (err: any) {
      setError(err.message || t('voiceAssignment.processingFailed'));
      setPhase('input');
    }
  }, [items, rabbits, assignments, t]);

  const handleSubmitText = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    processTranscript(textInput);
  }, [textInput, processTranscript]);

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
              <Modal.Title as="h6">{t('voiceAssignment.title')}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {error && (
                <Alert variant="danger" className="py-2 small" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {phase === 'input' && (
                <div>
                  <p className="text-muted small mb-3">{t('voiceAssignment.instructions')}</p>

                  {/* Speech recognition */}
                  {speechSupported && (
                    <div className="text-center mb-3">
                      <Button
                        variant={recording ? 'danger' : 'outline-primary'}
                        size="lg"
                        className="rounded-circle"
                        style={{ width: 64, height: 64 }}
                        onClick={recording ? stopRecording : startRecording}
                      >
                        {recording ? (
                          <span className="fs-5">&#9632;</span>
                        ) : (
                          <span className="fs-5">&#127908;</span>
                        )}
                      </Button>
                      <div className="mt-2 small text-muted">
                        {recording ? t('voiceAssignment.listening') : t('voiceAssignment.tapToSpeak')}
                      </div>
                      {(interimText || transcript) && (
                        <div className="mt-2 p-2 bg-light rounded small">
                          {recording ? interimText : transcript}
                        </div>
                      )}
                      {transcript && !recording && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="mt-2"
                          onClick={() => processTranscript(transcript)}
                        >
                          {t('voiceAssignment.processTranscript')}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  {speechSupported && (
                    <div className="d-flex align-items-center my-3">
                      <hr className="flex-grow-1" />
                      <span className="px-2 text-muted small">{t('voiceAssignment.or')}</span>
                      <hr className="flex-grow-1" />
                    </div>
                  )}

                  {/* Text fallback */}
                  <Form onSubmit={handleSubmitText}>
                    <Form.Group>
                      <Form.Label className="small text-muted">
                        {speechSupported
                          ? t('voiceAssignment.textFallbackLabel')
                          : t('voiceAssignment.textInputLabel')}
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder={t('voiceAssignment.textPlaceholder')}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                      />
                    </Form.Group>
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      className="mt-2"
                      disabled={!textInput.trim()}
                    >
                      {t('voiceAssignment.processText')}
                    </Button>
                  </Form>
                </div>
              )}

              {phase === 'processing' && (
                <div className="text-center py-4">
                  <LoadingSpinner size="md" message={t('voiceAssignment.processing')} />
                </div>
              )}

              {phase === 'confirm' && result && (
                <div>
                  <p className="text-muted small mb-2">{t('voiceAssignment.reviewAssignments')}</p>
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
                  <Button variant="outline-secondary" size="sm" onClick={() => setPhase('input')}>
                    {t('voiceAssignment.tryAgain')}
                  </Button>
                  <Button variant="success" size="sm" onClick={handleApply}>
                    {t('voiceAssignment.apply', { count: result.assignments.length })}
                  </Button>
                </>
              )}
              {phase === 'confirm' && result && result.assignments.length === 0 && (
                <Button variant="outline-secondary" size="sm" onClick={() => setPhase('input')}>
                  {t('voiceAssignment.tryAgain')}
                </Button>
              )}
              {phase === 'input' && (
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
