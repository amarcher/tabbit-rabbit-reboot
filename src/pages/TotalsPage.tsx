import React from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useTab } from '../hooks/useTab';
import TotalsView from '../components/TotalsView';

export default function TotalsPage() {
  const { tabId } = useParams<{ tabId: string }>();
  const { tab, items, rabbits, assignments, loading } = useTab(tabId);

  if (loading || !tab) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <TotalsView
      tab={tab}
      items={items}
      rabbits={rabbits}
      assignments={assignments}
    />
  );
}
