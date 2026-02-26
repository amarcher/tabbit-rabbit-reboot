import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from './NavBar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <NavBar />
      <Container className="flex-grow-1 pt-4 pb-5">{children}</Container>
      <footer className="footer text-center py-3 mt-auto">
        <Container>
          <span className="text-muted">&copy; {new Date().getFullYear()} Tabbit</span>
        </Container>
      </footer>

      {/* Scroll-to-top floating button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            className="tr-scroll-top-btn"
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0.6, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            aria-label="Scroll to top"
            title="Back to top"
          >
            &#8593;
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
