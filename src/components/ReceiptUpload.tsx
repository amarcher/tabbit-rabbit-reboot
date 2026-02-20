import React, { useRef, useState } from 'react';
import { Button, Spinner, Alert } from 'react-bootstrap';
import { canScanFree, incrementScanCount, FREE_SCAN_LIMIT } from '../utils/scanCounter';
import { scanReceiptDirect, getStoredApiKey } from '../utils/anthropic';
import type { ReceiptResult } from '../utils/anthropic';

export type { ReceiptResult };

interface ReceiptUploadProps {
  tabId: string;
  onReceiptParsed: (result: ReceiptResult) => void;
}

export default function ReceiptUpload({ tabId, onReceiptParsed }: ReceiptUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const byokKey = getStoredApiKey();
    if (!byokKey && !canScanFree()) {
      setError(`You've used all ${FREE_SCAN_LIMIT} free scans this month. Add your own API key in Profile for unlimited scans.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setError('');
    setUploading(true);

    try {
      const image_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const media_type = file.type || 'image/jpeg';
      let result: ReceiptResult;

      if (byokKey) {
        result = await scanReceiptDirect(byokKey, image_base64, media_type);
      } else {
        const res = await fetch('/api/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64, media_type }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`OCR failed (${res.status}): ${errBody}`);
        }
        result = await res.json();
        incrementScanCount();
      }

      if (result?.items?.length) {
        onReceiptParsed(result);
      } else {
        setError('No items found in receipt. Try a clearer photo.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process receipt');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mb-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />
      <Button
        variant="outline-info"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Scanning receipt...
          </>
        ) : (
          'Scan Receipt'
        )}
      </Button>
      {error && (
        <Alert variant="warning" className="mt-2" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
    </div>
  );
}
