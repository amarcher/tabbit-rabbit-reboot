import React, { useRef, useState } from 'react';
import { Button, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

interface ParsedItem {
  description: string;
  price: number;
}

export interface ReceiptResult {
  items: ParsedItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
}

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

    setError('');
    setUploading(true);

    try {
      const filePath = `receipts/${tabId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('receipts').getPublicUrl(filePath);

      const { data, error: fnError } = await supabase.functions.invoke(
        'parse-receipt',
        {
          body: { image_url: publicUrl },
        }
      );

      if (fnError) throw fnError;

      if (data?.items?.length) {
        onReceiptParsed(data as ReceiptResult);
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
