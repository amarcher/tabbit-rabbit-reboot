import React, { forwardRef, useMemo, useState } from 'react';
import { Badge, Button, Dropdown, ListGroup, Form, InputGroup, Modal, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import type { Tab, Item, Rabbit, ItemRabbit } from '../types';
import { COLOR_HEX } from '../types';
import { formatCents } from '../utils/currency';
import { shareBill } from '../utils/billEncoder';
import { useAuth } from '../hooks/useAuth';

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

export default function TabList({ tabs, loading, onCreate, onDelete }: TabListProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tab | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'danger' } | null>(null);
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
      <div className="text-center py-5">
        <Spinner animation="border" />
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
          <p className="text-muted text-center">
            No tabs yet. Create one to start splitting a bill!
          </p>
        ) : (
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

      <ToastContainer position="bottom-center" className="mb-3">
        <Toast
          show={!!toast}
          onClose={() => setToast(null)}
          autohide
          delay={3000}
          bg={toast?.variant}
        >
          <Toast.Body className="text-white">
            {toast?.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
