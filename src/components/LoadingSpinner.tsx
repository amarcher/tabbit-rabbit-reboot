import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  return (
    <div className={`tr-spinner tr-spinner--${size}`} role="status" aria-label={message || 'Loading'}>
      <div className="tr-spinner__dots" aria-hidden="true">
        <span className="tr-spinner__dot" />
        <span className="tr-spinner__dot" />
        <span className="tr-spinner__dot" />
      </div>
      {message && <span className="tr-spinner__message">{message}</span>}
    </div>
  );
}
