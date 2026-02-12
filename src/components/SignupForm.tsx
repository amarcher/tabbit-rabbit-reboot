import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

interface SignupFormProps {
  onSignUp: (email: string, password: string, username: string) => Promise<unknown>;
}

export default function SignupForm({ onSignUp }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSignUp(email, password, username);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
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
          <h4 className="text-center mb-3">Sign Up</h4>
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
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                minLength={6}
              />
            </Form.Group>
            <Button
              variant="warning"
              type="submit"
              className="w-100"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </Form>
          <div className="text-center mt-3">
            <Link to="/login">Already have an account? Sign in</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
