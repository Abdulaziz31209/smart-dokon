'use client';

import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true);
      return;
    }

    // Check if user has already dismissed the prompt
    const hasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (hasDismissed) {
      return;
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if prompt is dismissed or no install capability
  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-2xl p-4 border border-gray-100">
        {/* Header with green text */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-green-600 font-bold text-lg">
            Ilovani o'rnatish
          </h3>
          <button 
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Yopish"
          >
            ×
          </button>
        </div>
        
        {/* Description with white background */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-gray-700 text-sm leading-relaxed">
            Ilovani kompyuteringizga o'rnating va saytga tez va oson kirish imkoniyatiga ega bo'ling. Chrome orqali emas, to'g'ridan-to'g'ri desktop orqali tezroq ishga tushiring!
          </p>
        </div>
        
        {/* Install button - green */}
        <button
          onClick={handleInstall}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Ilovani o'rnatish
        </button>
      </div>
    </div>
  );
}

