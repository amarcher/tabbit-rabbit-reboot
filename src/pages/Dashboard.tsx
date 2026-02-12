import React from 'react';
import { useTabs } from '../hooks/useTab';
import TabList from '../components/TabList';

interface DashboardProps {
  userId: string;
}

export default function Dashboard({ userId }: DashboardProps) {
  const { tabs, loading, createTab, deleteTab } = useTabs(userId);

  return (
    <TabList
      tabs={tabs}
      loading={loading}
      onCreate={createTab}
      onDelete={deleteTab}
    />
  );
}
