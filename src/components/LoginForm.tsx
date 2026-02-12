import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

interface LoginFormProps {
  onSignIn: (email: string, password: string) => Promise<unknown>;
}

export default function LoginForm({ onSignIn }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSignIn(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center" style={{ paddingTop: '80px' }}>
      <Card style={{ maxWidth: 400, width: '100%' }}>
        <Card.Body>
          <div className="text-center mb-4">
            <img src="/tblogo.png" alt="Tabbit" style={{ maxWidth: 200 }} />
          </div>
          <h4 className="text-center mb-3">Sign In</h4>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Control
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Button
              variant="success"
              type="submit"
              className="w-100"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form>
          <div className="text-center mt-3">
            <Link to="/signup">Don't have an account? Sign up</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
