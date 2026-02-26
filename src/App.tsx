import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { NuxProvider } from './contexts/NuxContext';
import Layout from './components/Layout';
import ProfileSettings from './components/ProfileSettings';
import Dashboard from './pages/Dashboard';
import TabPage from './pages/TabPage';
import SharedBillPage from './pages/SharedBillPage';
import './App.css';

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

const routeOrder = ['/', '/profile'];

function getDirection(from: string, to: string): number {
  const fromIndex = routeOrder.indexOf(from);
  const toIndex = routeOrder.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return 1;
  return toIndex >= fromIndex ? 1 : -1;
}

interface AnimatedRoutesProps {
  profile: ReturnType<typeof useAuth>['profile'];
  updateProfile: ReturnType<typeof useAuth>['updateProfile'];
}

function AnimatedRoutes({ profile, updateProfile }: AnimatedRoutesProps) {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const direction = getDirection(prevPathRef.current, location.pathname);

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  const focusRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // After route change, move focus to top of new page for screen readers
    focusRef.current?.focus();
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      >
        <div ref={focusRef} tabIndex={-1} style={{ outline: 'none' }} />
        <Routes location={location}>
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
      </motion.div>
    </AnimatePresence>
  );
}

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
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <NuxProvider>
          <Layout>
            <AnimatedRoutes profile={profile} updateProfile={updateProfile} />
          </Layout>
        </NuxProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}

export default App;
