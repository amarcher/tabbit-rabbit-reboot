import React, { useEffect, useState } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { to: '/', label: 'My Tabs' },
  { to: '/profile', label: 'Profile' },
];

function isLinkActive(linkTo: string, pathname: string): boolean {
  if (linkTo === '/') return pathname === '/';
  return pathname.startsWith(linkTo);
}

export default function NavBar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll listener for backdrop-blur / opacity transition
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <Navbar
      variant="dark"
      expand="md"
      fixed="top"
      expanded={menuOpen}
      onToggle={setMenuOpen}
      style={{
        backgroundColor: scrolled
          ? 'rgba(45, 42, 38, 0.97)'
          : 'rgba(45, 42, 38, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.18)' : 'none',
      }}
    >
      <Container>
        {/* Brand with scale-in animation on mount */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Navbar.Brand as={Link} to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img
              src="/tbicon.png"
              alt="Tabbit Rabbit"
              width="24"
              height="24"
              style={{ display: 'inline-block', verticalAlign: 'top' }}
            />
            Tabbit Rabbit
          </Navbar.Brand>
        </motion.div>

        <Navbar.Toggle aria-controls="main-nav" />

        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            {/* Desktop nav links with animated underline indicator */}
            <div className="d-none d-md-flex align-items-center" style={{ position: 'relative', gap: '0.5rem' }}>
              {NAV_LINKS.map(({ to, label }) => {
                const active = isLinkActive(to, location.pathname);
                return (
                  <div key={to} style={{ position: 'relative' }}>
                    <Nav.Link
                      as={Link}
                      to={to}
                      style={{
                        color: active ? '#ffffff' : 'rgba(255,255,255,0.7)',
                        fontWeight: active ? 600 : 400,
                        paddingBottom: '6px',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {label}
                    </Nav.Link>
                    {/* Shared layout animated underline */}
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          layoutId="nav-active-indicator"
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            left: '0.5rem',
                            right: '0.5rem',
                            height: 2,
                            borderRadius: 2,
                            backgroundColor: '#e8a838',
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Mobile nav links — stagger in when menu opens */}
            <div className="d-md-none">
              <AnimatePresence>
                {menuOpen && (
                  <>
                    {NAV_LINKS.map(({ to, label }, i) => {
                      const active = isLinkActive(to, location.pathname);
                      return (
                        <motion.div
                          key={to}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{
                            duration: 0.2,
                            delay: i * 0.05,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        >
                          <Nav.Link
                            as={Link}
                            to={to}
                            style={{
                              color: active ? '#ffffff' : 'rgba(255,255,255,0.75)',
                              fontWeight: active ? 600 : 400,
                              borderLeft: active ? '3px solid #e8a838' : '3px solid transparent',
                              paddingLeft: '0.75rem',
                              transition: 'border-color 0.2s, color 0.2s',
                            }}
                          >
                            {label}
                          </Nav.Link>
                        </motion.div>
                      );
                    })}
                  </>
                )}
              </AnimatePresence>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
