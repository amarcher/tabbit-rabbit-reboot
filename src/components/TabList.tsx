import React, { forwardRef, useEffect, useRef, useMemo, useState } from 'react';
import { Badge, Button, Dropdown, ListGroup, Form, InputGroup, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tab, Item, Rabbit, ItemRabbit } from '../types';
import { COLOR_HEX } from '../types';
import { formatCents } from '../utils/currency';
import { shareBill } from '../utils/billEncoder';
import { useAuth } from '../hooks/useAuth';
import { TabListSkeleton } from './Skeleton';

interface TabListProps {
  tabs: Tab[];
  loading: boolean;
  onCreate: (name: string) => Promise<Tab | null>;
  onDelete: (tabId: string) => Promise<void>;
}

interface TabSummary {
  total: number;
  rabbits: Rabbit[];
}

function getTabSummary(tabId: string): TabSummary | null {
  try {
    const raw = localStorage.getItem('tabbitrabbit:tab:' + tabId);
    if (!raw) return null;
    const data: { items: Item[]; rabbits: Rabbit[]; assignments: ItemRabbit[] } = JSON.parse(raw);
    const total = data.items.reduce((sum, item) => sum + item.price_cents, 0);
    return { total, rabbits: data.rabbits || [] };
  } catch {
    return null;
  }
}

function getTabData(tabId: string) {
  try {
    const raw = localStorage.getItem('tabbitrabbit:tab:' + tabId);
    if (!raw) return null;
    return JSON.parse(raw) as {
      tab: Tab;
      items: Item[];
      rabbits: Rabbit[];
      assignments: ItemRabbit[];
    };
  } catch {
    return null;
  }
}

const MoreToggle = forwardRef<HTMLButtonElement, { onClick: (e: React.MouseEvent) => void }>(
  ({ onClick }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        backgroundColor: '#e9ecef',
        border: 'none',
        color: '#6c757d',
        fontSize: '1.1rem',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
      aria-label="More options"
    >
      &#8942;
    </button>
  )
);

// Animated toast with countdown progress bar
interface ToastData {
  message: string;
  variant: 'success' | 'danger';
}

const TOAST_DURATION = 3000;

function AnimatedToast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const [progress, setProgress] = useState(100);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        onCloseRef.current();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const bgColor = toast.variant === 'success' ? '#198754' : '#dc3545';

  return (
    <motion.div
      initial={{ x: 80, opacity: 0, scale: 0.92 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 80, opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        position: 'relative',
        background: bgColor,
        color: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        minWidth: 220,
        maxWidth: 320,
        boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={onClose}
      role="alert"
      aria-live="polite"
    >
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
      {/* Progress bar */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '0 0 0 8px',
          width: `${progress}%`,
          transformOrigin: 'left',
        }}
        transition={{ duration: 0.05 }}
      />
    </motion.div>
  );
}

export default function TabList({ tabs, loading, onCreate, onDelete }: TabListProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tab | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const { profile } = useAuth();

  const summaries = useMemo(() => {
    const map: Record<string, TabSummary | null> = {};
    for (const tab of tabs) {
      map[tab.id] = getTabSummary(tab.id);
    }
    return map;
  }, [tabs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreate(newName.trim());
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  const handleShare = async (tabId: string) => {
    const data = getTabData(tabId);
    if (!data) return;
    setSharingId(tabId);
    try {
      const token = await shareBill({
        tab: data.tab,
        items: data.items,
        rabbits: data.rabbits,
        assignments: data.assignments,
        ownerProfile: {
          display_name: profile?.display_name || null,
          venmo_username: profile?.venmo_username || null,
          cashapp_cashtag: profile?.cashapp_cashtag || null,
          paypal_username: profile?.paypal_username || null,
        },
      });
      const url = `${window.location.origin}/bill/${token}`;
      if (navigator.share) {
        await navigator.share({ title: data.tab.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast({ message: 'Share link copied to clipboard!', variant: 'success' });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setToast({ message: 'Failed to share bill. Please try again.', variant: 'danger' });
    } finally {
      setSharingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="tr-home-layout">
        <div className="text-center text-md-start">
          <img src="/tblogo.png" alt="Tabbit Rabbit" style={{ maxWidth: 220 }} className="mb-3" />
          <p className="text-muted small">
            Split bills with friends. Add items, assign people, and send payment requests.
          </p>
        </div>
        <div>
          <h5 className="mb-3">My Tabs</h5>
          <TabListSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="tr-home-layout">
      <div className="text-center text-md-start">
        <img src="/tblogo.png" alt="Tabbit Rabbit" style={{ maxWidth: 220 }} className="mb-3" />
        <p className="text-muted small">
          Split bills with friends. Add items, assign people, and send payment requests.
        </p>
      </div>

      <div>
        <h5 className="mb-3">My Tabs</h5>

        <Form onSubmit={handleCreate} className="mb-4">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="New tab name (e.g. Friday Dinner)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button variant="warning" type="submit" disabled={creating || !newName.trim()}>
              {creating ? 'Creating...' : 'New Tab'}
            </Button>
          </InputGroup>
        </Form>

        {tabs.length === 0 ? (
          <motion.div
            className="text-center py-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="tr-empty-bounce" style={{ fontSize: '3rem', marginBottom: 12 }}>
              🐰
            </div>
            <p className="text-muted mb-1" style={{ fontWeight: 600 }}>
              Start your first tab!
            </p>
            <p className="text-muted small">
              Type a name above and hit New Tab to get started.
            </p>
          </motion.div>
        ) : (
          <ListGroup>
            <AnimatePresence initial={false}>
              {tabs.map((tab, idx) => {
                const summary = summaries[tab.id];
                return (
                  <motion.div
                    key={tab.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: idx * 0.03,
                      ease: 'easeOut',
                    }}
                  >
                    <ListGroup.Item
                      className="d-flex justify-content-between align-items-start tr-tab-list-item"
                    >
                      <Link to={`/tabs/${tab.id}`} className="text-decoration-none flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex justify-content-between align-items-baseline">
                          <strong className="text-truncate">{tab.name}</strong>
                          {summary && (
                            <span className="text-muted small ms-2 flex-shrink-0">
                              {formatCents(summary.total)}
                            </span>
                          )}
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <div className="d-flex flex-wrap gap-1" style={{ minWidth: 0 }}>
                            {summary?.rabbits.map((r) => (
                              <Badge
                                key={r.id}
                                pill
                                style={{
                                  backgroundColor: COLOR_HEX[r.color],
                                  color: '#333',
                                  fontWeight: 500,
                                  fontSize: '0.72em',
                                }}
                              >
                                {r.name}
                              </Badge>
                            ))}
                          </div>
                          <small className="text-muted flex-shrink-0 ms-2">
                            {new Date(tab.created_at).toLocaleDateString()}
                          </small>
                        </div>
                      </Link>
                      <Dropdown align="end" className="ms-2 flex-shrink-0">
                        <Dropdown.Toggle as={MoreToggle} />
                        <Dropdown.Menu>
                          <Dropdown.Item
                            onClick={() => handleShare(tab.id)}
                            disabled={sharingId === tab.id}
                          >
                            {sharingId === tab.id ? 'Sharing...' : 'Share Bill'}
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item
                            className="text-danger"
                            onClick={() => setDeleteTarget(tab)}
                          >
                            Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </ListGroup.Item>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </ListGroup>
        )}
      </div>

      {/* Delete confirmation modal with spring animation */}
      <AnimatePresence>
        {deleteTarget && (
          <Modal show onHide={() => setDeleteTarget(null)} centered size="sm">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 14 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <Modal.Body className="text-center py-4">
                <p className="mb-1">Delete <strong>{deleteTarget?.name}</strong>?</p>
                <p className="text-muted small mb-0">This can't be undone.</p>
              </Modal.Body>
              <Modal.Footer className="justify-content-center border-0 pt-0">
                <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
                  Delete
                </Button>
              </Modal.Footer>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Animated toast — top-right corner */}
      <div
        style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 1060,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toast && (
            <div style={{ pointerEvents: 'all' }}>
              <AnimatedToast
                toast={toast}
                onClose={() => setToast(null)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
