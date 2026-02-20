import React from 'react';
import { Container } from 'react-bootstrap';
import NavBar from './NavBar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <NavBar />
      <Container className="flex-grow-1 pt-4 pb-5">{children}</Container>
      <footer className="footer bg-light text-center py-3 mt-auto">
        <Container>
          <span className="text-muted">&copy; {new Date().getFullYear()} Tabbit</span>
        </Container>
      </footer>
    </div>
  );
}
