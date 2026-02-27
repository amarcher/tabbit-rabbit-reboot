import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Badge } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RABBIT_COLORS, RabbitColor, COLOR_HEX } from '../types';
import type { SavedRabbit, Profile } from '../types';

interface AddRabbitModalProps {
  show: boolean;
  onHide: () => void;
  onAdd: (name: string, color: RabbitColor, profile?: Profile) => void;
  usedColors: RabbitColor[];
  savedRabbits?: SavedRabbit[];
  onAddSavedRabbit?: (saved: SavedRabbit) => void;
  onRemoveSavedRabbit?: (id: string) => void;
}

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.22, ease: 'easeOut' as const },
  }),
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.045,
      duration: 0.25,
      ease: [0.34, 1.56, 0.64, 1] as const,
    },
  }),
};

export default function AddRabbitModal({
  show,
  onHide,
  onAdd,
  usedColors,
  savedRabbits = [],
  onAddSavedRabbit,
  onRemoveSavedRabbit,
}: AddRabbitModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [showPaymentFields, setShowPaymentFields] = useState(false);
  const [swatchSpin, setSwatchSpin] = useState(false);
  const prevColorRef = useRef<RabbitColor | null>(null);

  const nextColor =
    RABBIT_COLORS.find((c) => !usedColors.includes(c)) || RABBIT_COLORS[0];

  // Spin swatch whenever color changes
  useEffect(() => {
    if (prevColorRef.current !== null && prevColorRef.current !== nextColor) {
      setSwatchSpin(true);
      const t = setTimeout(() => setSwatchSpin(false), 380);
      return () => clearTimeout(t);
    }
    prevColorRef.current = nextColor;
  }, [nextColor]);

  const stripPrefix = (val: string) => val.replace(/^[@$]/, '');

  const resetForm = () => {
    setName('');
    setVenmo('');
    setCashapp('');
    setPaypal('');
    setShowPaymentFields(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const venmoClean = stripPrefix(venmo.trim()) || null;
    const cashappClean = stripPrefix(cashapp.trim()) || null;
    const paypalClean = stripPrefix(paypal.trim()) || null;
    const hasPayment = venmoClean || cashappClean || paypalClean;

    let profile: Profile | undefined;
    if (hasPayment) {
      profile = {
        id: crypto.randomUUID(),
        username: name.trim().toLowerCase().replace(/\s+/g, '-'),
        display_name: name.trim(),
        venmo_username: venmoClean,
        cashapp_cashtag: cashappClean,
        paypal_username: paypalClean,
        currency_code: 'USD',
        created_at: new Date().toISOString(),
      };

      onAddSavedRabbit?.({
        id: crypto.randomUUID(),
        name: name.trim(),
        color: nextColor,
        venmo_username: venmoClean,
        cashapp_cashtag: cashappClean,
        paypal_username: paypalClean,
      });
    }

    onAdd(name.trim(), nextColor, profile);
    resetForm();
    onHide();
  };

  const handleQuickAdd = (saved: SavedRabbit) => {
    const profile: Profile = {
      id: crypto.randomUUID(),
      username: saved.name.toLowerCase().replace(/\s+/g, '-'),
      display_name: saved.name,
      venmo_username: saved.venmo_username,
      cashapp_cashtag: saved.cashapp_cashtag,
      paypal_username: saved.paypal_username,
      currency_code: 'USD',
      created_at: new Date().toISOString(),
    };

    const color = usedColors.includes(saved.color) ? nextColor : saved.color;
    onAdd(saved.name, color, profile);
    resetForm();
    onHide();
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      {/* Inner motion wrapper for spring entrance — wraps actual modal content */}
      <motion.div
        key={show ? 'open' : 'closed'}
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('addRabbitModal.title')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Saved Rabbits — stagger-in badges */}
            {savedRabbits.length > 0 && (
              <>
                <motion.div
                  className="mb-2"
                  custom={0}
                  variants={fieldVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <small className="text-muted fw-semibold">{t('addRabbitModal.savedRabbits')}</small>
                </motion.div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {savedRabbits.map((saved, i) => (
                    <motion.div
                      key={saved.id}
                      custom={i}
                      variants={badgeVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Badge
                        pill
                        role="button"
                        style={{
                          backgroundColor: COLOR_HEX[saved.color],
                          color: '#333',
                          fontWeight: 600,
                          fontSize: '0.85em',
                          cursor: 'pointer',
                          border: '1.5px solid rgba(0,0,0,0.1)',
                        }}
                        onClick={() => handleQuickAdd(saved)}
                        title={`Click to add ${saved.name}`}
                      >
                        {saved.name}
                        {(saved.venmo_username || saved.cashapp_cashtag || saved.paypal_username) && (
                          <span className="ms-1 text-success fw-bold">$</span>
                        )}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <hr className="flex-grow-1 m-0" />
                  <small className="text-muted">{t('addRabbitModal.orAddNew')}</small>
                  <hr className="flex-grow-1 m-0" />
                </div>
              </>
            )}

            <motion.div
              className="mb-3"
              custom={savedRabbits.length > 0 ? 2 : 0}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
            >
              <Form.Group>
                <Form.Label>{t('addRabbitModal.nameLabel')}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t('addRabbitModal.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </Form.Group>
            </motion.div>

            <motion.div
              className="d-flex align-items-center gap-2 mb-3"
              custom={savedRabbits.length > 0 ? 3 : 1}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
            >
              <span>{t('addRabbitModal.colorLabel')}</span>
              <span
                className={`tr-color-swatch${swatchSpin ? ' tr-swatch-spin' : ''}`}
                style={{
                  display: 'inline-block',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: COLOR_HEX[nextColor],
                  border: '1px solid rgba(0,0,0,0.15)',
                }}
              />
            </motion.div>

            {/* Payment Fields */}
            <motion.div
              custom={savedRabbits.length > 0 ? 4 : 2}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
            >
              {!showPaymentFields ? (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 mb-2"
                  onClick={() => setShowPaymentFields(true)}
                >
                  {t('addRabbitModal.addPaymentInfo')}
                </Button>
              ) : (
                <div>
                  <small className="text-muted fw-semibold d-block mb-2">{t('addRabbitModal.paymentInfoLabel')}</small>
                  <AnimatePresence>
                    {[
                      { placeholder: t('addRabbitModal.venmoPlaeholder'), value: venmo, onChange: setVenmo },
                      { placeholder: t('addRabbitModal.cashappPlaceholder'), value: cashapp, onChange: setCashapp },
                      { placeholder: t('addRabbitModal.paypalPlaceholder'), value: paypal, onChange: setPaypal },
                    ].map((field, idx) => (
                      <motion.div
                        key={field.placeholder}
                        className="mb-2"
                        custom={idx}
                        variants={fieldVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <Form.Group>
                          <Form.Control
                            type="text"
                            placeholder={field.placeholder}
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            autoComplete="off"
                          />
                        </Form.Group>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <small className="text-muted">
                    {t('addRabbitModal.paymentHintSave')}
                  </small>
                </div>
              )}
            </motion.div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              {t('addRabbitModal.cancel')}
            </Button>
            <Button variant="primary" type="submit" disabled={!name.trim()}>
              {t('addRabbitModal.add')}
            </Button>
          </Modal.Footer>
        </Form>
      </motion.div>
    </Modal>
  );
}
