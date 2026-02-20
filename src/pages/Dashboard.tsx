import React from 'react';
import { useTabs } from '../hooks/useTab';
import TabList from '../components/TabList';

export default function Dashboard() {
  const { tabs, loading, createTab, deleteTab } = useTabs();

  return (
    <TabList
      tabs={tabs}
      loading={loading}
      onCreate={createTab}
      onDelete={deleteTab}
    />
  );
}
