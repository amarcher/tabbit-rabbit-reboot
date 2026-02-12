import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import ProfileSettings from './components/ProfileSettings';
import Dashboard from './pages/Dashboard';
import TabPage from './pages/TabPage';
import SharedBillPage from './pages/SharedBillPage';
import './App.css';

function App() {
  const { user, profile, loading, signInWithGoogle, signOut, fetchProfile } = useAuth();

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
      <Layout user={user} onSignOut={signOut}>
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/" />
              ) : (
                <LoginForm onSignInWithGoogle={signInWithGoogle} />
              )
            }
          />
          <Route
            path="/profile"
            element={
              user ? (
                <ProfileSettings user={user} profile={profile} fetchProfile={fetchProfile} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/"
            element={user ? <Dashboard userId={user.id} /> : <Navigate to="/login" />}
          />
          <Route
            path="/tabs/:tabId"
            element={user ? <TabPage /> : <Navigate to="/login" />}
          />
          <Route path="/bill/:shareToken" element={<SharedBillPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
