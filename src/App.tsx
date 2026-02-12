import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './pages/Dashboard';
import TabPage from './pages/TabPage';
import TotalsPage from './pages/TotalsPage';
import './App.css';

function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth();

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
              user ? <Navigate to="/" /> : <LoginForm onSignIn={signIn} />
            }
          />
          <Route
            path="/signup"
            element={
              user ? <Navigate to="/" /> : <SignupForm onSignUp={signUp} />
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
          <Route
            path="/tabs/:tabId/totals"
            element={user ? <TotalsPage /> : <Navigate to="/login" />}
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
