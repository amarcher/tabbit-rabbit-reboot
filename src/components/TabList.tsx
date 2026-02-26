import React, { forwardRef, useEffect, useRef, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge, Button, Dropdown, ListGroup, Form, InputGroup, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import type { Tab, Item, Rabbit, ItemRabbit } from '../types';
import { COLOR_HEX } from '../types';
import { formatCents } from '../utils/currency';
import { shareBill } from '../utils/billEncoder';
import { useAuth } from '../hooks/useAuth';
import { TabListSkeleton } from './Skeleton';
import HintArrow from './HintArrow';
import './TabList.css';

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
      className="tr-more-toggle"
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      aria-label="More options"
    >
      &#8942;
    </button>
  )
);

interface ToastData {
  message: string;
  variant: 'success' | 'danger';
}

interface AnimatedToastProps {
  toast: ToastData;
  onClose: () => void;
  duration?: number;
}

function AnimatedToast({ toast, onClose, duration = 3000 }: AnimatedToastProps) {
  const [progress, setProgress] = useState(100);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onCloseRef.current();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <motion.div
      initial={{ x: 80, opacity: 0, scale: 0.92 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 80, opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={`tr-toast tr-toast--${toast.variant}`}
      onClick={onClose}
      role="alert"
      aria-live="polite"
    >
      <span className="tr-toast__message">{toast.message}</span>
      <div
        className="tr-toast__progress"
        style={{ width: `${progress}%` }}
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
  const navigate = useNavigate();

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
      const tab = await onCreate(newName.trim());
      setNewName('');
      if (tab) {
        navigate(`/tabs/${tab.id}`);
      }
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
      // User dismissing the share sheet throws AbortError — not a real failure
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
          <p className="text-muted small" style={{ maxWidth: 220 }}>
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
      </div>

      <div>
        <div className="d-flex align-items-baseline gap-3 mb-3">
          <h5 className="mb-0">My Tabs</h5>
          {tabs.length === 0 && (
            <HintArrow>Create a tab to start splitting a bill.</HintArrow>
          )}
        </div>

        <Form onSubmit={handleCreate} className="mb-4">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder={tabs.length === 0 ? 'Type a tab name to create one' : 'New tab name (e.g. Friday Dinner)'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button
              variant="warning"
              type="submit"
              disabled={creating || !newName.trim()}
              className={!newName.trim() ? 'tr-btn-disabled-muted' : ''}
            >
              {creating ? 'Creating...' : 'New Tab'}
            </Button>
          </InputGroup>
        </Form>

        {tabs.length > 0 && (
          <ListGroup>
            {tabs.map((tab) => {
              const summary = summaries[tab.id];
              return (
                <ListGroup.Item
                  key={tab.id}
                  className="d-flex justify-content-between align-items-start"
                >
                  <Link to={`/tabs/${tab.id}`} className="text-decoration-none flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex justify-content-between align-items-baseline">
                      <strong className="text-truncate">{tab.name}</strong>
                      {summary && (
                        <span className="text-muted small ms-2 flex-shrink-0 tr-mono">
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
                            bg=""
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
              );
            })}
          </ListGroup>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered size="sm">
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
      </Modal>

      <div className="tr-toast-container">
        <AnimatePresence>
          {toast && (
            <AnimatedToast
              key={toast.message}
              toast={toast}
              onClose={() => setToast(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
