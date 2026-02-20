import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import ProfileSettings from './components/ProfileSettings';
import Dashboard from './pages/Dashboard';
import TabPage from './pages/TabPage';
import SharedBillPage from './pages/SharedBillPage';
import './App.css';

function App() {
  const { profile, loading, updateProfile } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route
            path="/profile"
            element={
              <ProfileSettings profile={profile} updateProfile={updateProfile} />
            }
          />
          <Route path="/" element={<Dashboard />} />
          <Route path="/tabs/:tabId" element={<TabPage />} />
          <Route path="/bill/:shareToken" element={<SharedBillPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
