'use client'

import { useState } from 'react';
import { Camera, X, Zap, Target } from 'lucide-react';
import { useBarcodeScanner } from '@/lib/useBarcodeScanner';

interface BarcodeScannerProps {
  onScan: (barcode: string, source: 'camera' | 'usb') => void;
  className?: string;
}

export default function BarcodeScanner({ 
  onScan, 
  className = '' 
}: BarcodeScannerProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const { isScanning, scannerActive, toggleScanner, stopCamera } = useBarcodeScanner({
    onScan: ({ barcode, source }) => {
      onScan(barcode, source);
      setShowOverlay(false);
      stopCamera();
    }
  });

  return (
    <>
      <button
        onClick={() => setShowOverlay(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all"
      >
        <Zap className="w-4 h-4" />
        Shtrix-kod skaner
      </button>

      {showOverlay && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-8 animate-in fade-in duration-200">
          <div className="text-center mb-8 max-w-md">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/30">
              <Target className="w-12 h-12 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Shtrix-kodni ushbu ramkaga joylashtiring</h2>
            <p className="text-slate-400 text-sm mb-4">USB skaner yoki kamera ishlatishingiz mumkin</p>
            <div className="relative">
              <div 
                id="scanner-reader" 
                className="w-80 h-64 bg-slate-900 border-4 border-dashed border-emerald-500 rounded-2xl shadow-2xl mx-auto relative overflow-hidden"
              />
              {scannerActive && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-2xl pointer-events-none">
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 h-48 border-4 border-emerald-400 rounded-xl animate-pulse" />
                </div>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-xs text-slate-400">
                HTTPS kerak | Permission bering
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={toggleScanner}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${
                scannerActive
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20 text-white'
              }`}
            >
              {scannerActive ? (
                <>
                  <X className="w-5 h-5" />
                  To\'xtatish
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Kamerani yoqish
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowOverlay(false);
                stopCamera();
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Yopish
            </button>
          </div>
        </div>
      )}
    </>
  );
}

