import React, { useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import ProfileSettings from './components/ProfileSettings';
import Dashboard from './pages/Dashboard';
import TabPage from './pages/TabPage';
import SharedBillPage from './pages/SharedBillPage';
import LoadingSpinner from './components/LoadingSpinner';
import './App.css';

/* ── Route depth map for directional transitions ─── */
const ROUTE_DEPTH: Record<string, number> = {
  '/': 0,
  '/profile': 0,
  '/bill': 1,
  '/tabs': 2,
};

function getRouteDepth(pathname: string): number {
  if (pathname.startsWith('/tabs/')) return ROUTE_DEPTH['/tabs'];
  if (pathname.startsWith('/bill/')) return ROUTE_DEPTH['/bill'];
  if (pathname === '/profile') return ROUTE_DEPTH['/profile'];
  return ROUTE_DEPTH['/'];
}

/**
 * direction: 1 = going deeper (slide left), -1 = going back (slide right), 0 = fade
 * Using framer-motion's `custom` prop so that the EXIT animation of the
 * outgoing page always uses the CURRENT direction (not the stale one from
 * when that page was first rendered).
 */
const pageVariants = {
  enter: (direction: number) =>
    direction === 0
      ? { opacity: 0, scale: 0.98 }
      : { opacity: 0, x: direction * 32 },
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) =>
    direction === 0
      ? { opacity: 0, scale: 0.98 }
      : { opacity: 0, x: direction * -32 },
};

/* ── Animated routes — must be inside BrowserRouter ─ */
function AnimatedRoutes({ profile, updateProfile }: { profile: any; updateProfile: any }) {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const fromPath = prevPathRef.current;
  const toPath = location.pathname;

  // Determine direction
  const isProfileOrBill =
    toPath === '/profile' ||
    fromPath === '/profile' ||
    toPath.startsWith('/bill/') ||
    fromPath.startsWith('/bill/');

  const direction = isProfileOrBill
    ? 0
    : getRouteDepth(toPath) > getRouteDepth(fromPath)
      ? 1
      : -1;

  // Update ref after render so we always have the previous path
  React.useEffect(() => {
    prevPathRef.current = location.pathname;
  });

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Routes location={location}>
          <Route
            path="/profile"
            element={<ProfileSettings profile={profile} updateProfile={updateProfile} />}
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
        <LoadingSpinner size="lg" message="Loading Tabbit..." />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <AnimatedRoutes profile={profile} updateProfile={updateProfile} />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
