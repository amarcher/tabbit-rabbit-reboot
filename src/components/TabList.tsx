import React, { useState } from 'react';
import { Button, ListGroup, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import type { Tab } from '../types';

interface TabListProps {
  tabs: Tab[];
  loading: boolean;
  onCreate: (name: string) => Promise<Tab | null>;
  onDelete: (tabId: string) => Promise<void>;
}

export default function TabList({ tabs, loading, onCreate, onDelete }: TabListProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

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

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-4">
        <img src="/tblogo.png" alt="Tabbit" style={{ maxWidth: 250 }} className="mb-3" />
      </div>

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
          {tabs.map((tab) => (
            <ListGroup.Item
              key={tab.id}
              className="d-flex justify-content-between align-items-center"
            >
              <Link to={`/tabs/${tab.id}`} className="text-decoration-none flex-grow-1">
                <strong>{tab.name}</strong>
                <br />
                <small className="text-muted">
                  {new Date(tab.created_at).toLocaleDateString()}
                </small>
              </Link>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Delete "${tab.name}"?`)) {
                    onDelete(tab.id);
                  }
                }}
              >
                &times;
              </Button>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
}
