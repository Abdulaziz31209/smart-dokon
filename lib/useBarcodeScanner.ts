import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export interface ScannerResult {
  barcode: string;
  source: 'camera' | 'usb';
}

interface UseBarcodeScannerProps {
  onScan: (result: ScannerResult) => void;
}

export function useBarcodeScanner({ onScan }: UseBarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const keyBufferRef = useRef('');

  // Global USB scanner (keydown listener)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return; // Skip if focused input
      }

      const char = e.key;
      if (/[0-9]/.test(char)) {
        keyBufferRef.current += char;
        if (keyBufferRef.current.length > 20) keyBufferRef.current = keyBufferRef.current.slice(-20);
      } else if (e.key === 'Enter' && keyBufferRef.current) {
        e.preventDefault();
        const barcode = keyBufferRef.current;
        keyBufferRef.current = '';
        onScan({ barcode, source: 'usb' });
      } else {
        keyBufferRef.current = ''; // Reset on non-digit
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);

  // Camera scanner
  const startCamera = useCallback(async () => {
    if (scannerRef.current || !isScanning) return;

    try {
      scannerRef.current = new Html5QrcodeScanner(
        'scanner-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScan({ barcode: decodedText, source: 'camera' });
          stopCamera();
        },
        (error) => {
          console.warn('Scan error:', error);
        }
      );
      setScannerActive(true);
    } catch (err) {
      console.error('Camera start failed:', err);
    }
  }, [isScanning, onScan]);

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScannerActive(false);
  }, []);

  const toggleScanner = () => {
    if (scannerActive) {
      stopCamera();
    } else {
      startCamera();
    }
    setIsScanning(!scannerActive);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopCamera();
      }
    };
  }, []);

  return {
    isScanning,
    scannerActive,
    toggleScanner,
    stopCamera
  };
}

