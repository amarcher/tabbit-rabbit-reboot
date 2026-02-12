import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

interface NavBarProps {
  user: { email?: string } | null;
  onSignOut: () => void;
}

export default function NavBar({ user, onSignOut }: NavBarProps) {
  const navigate = useNavigate();

  return (
    <Navbar bg="dark" variant="dark" expand="md" fixed="top">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <img
            src="/tbicon.png"
            alt="Tabbit"
            width="24"
            height="24"
            className="d-inline-block align-top me-2"
          />
          Tabbit
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          {user ? (
            <>
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/">
                  My Tabs
                </Nav.Link>
                <Nav.Link as={Link} to="/profile">
                  Profile
                </Nav.Link>
              </Nav>
              <Nav>
                <Navbar.Text className="me-3">{user.email}</Navbar.Text>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={() => {
                    onSignOut();
                    navigate('/login');
                  }}
                >
                  Sign Out
                </Button>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/login">
                Log In
              </Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
