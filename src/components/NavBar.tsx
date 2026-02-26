import React, { useEffect, useState } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import '../styles/navbar.css';

const NAV_LINKS = [
  { to: '/', label: 'My Tabs' },
  { to: '/profile', label: 'Profile' },
];

export default function NavBar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Navbar
      variant="dark"
      expand="md"
      fixed="top"
      expanded={menuOpen}
      onToggle={setMenuOpen}
      className={`tr-navbar ${scrolled ? 'tr-navbar--scrolled' : 'tr-navbar--default'}`}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" className="tr-navbar-brand">
          <img
            src="/tblogo.png"
            alt="Tabbit Rabbit"
            width="24"
            height="24"
          />
          Tabbit Rabbit
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" />

        <Navbar.Collapse id="main-nav">
          {/* Desktop nav */}
          <Nav className="me-auto d-none d-md-flex align-items-center tr-nav-links">
            {NAV_LINKS.map(({ to, label }) => {
              const active = location.pathname === to;
              return (
                <div key={to} style={{ position: 'relative' }}>
                  <Nav.Link
                    as={Link}
                    to={to}
                    className={`tr-nav-link ${active ? 'tr-nav-link--active' : 'tr-nav-link--inactive'}`}
                  >
                    {label}
                  </Nav.Link>
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="tr-nav-indicator"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </Nav>

          {/* Mobile nav */}
          <Nav className="d-md-none">
            {NAV_LINKS.map(({ to, label }) => {
              const active = location.pathname === to;
              return (
                <Nav.Link
                  key={to}
                  as={Link}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`tr-mobile-nav-link ${active ? 'tr-mobile-nav-link--active' : 'tr-mobile-nav-link--inactive'}`}
                >
                  {label}
                </Nav.Link>
              );
            })}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
