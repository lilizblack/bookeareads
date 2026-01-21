import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const InstallPrompt = () => {
    const { t } = useTranslation();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e);
            // Show our custom install prompt
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        // Clear the deferredPrompt for next time
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Store dismissal in localStorage to not show again for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Check if user dismissed recently
    useEffect(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedTime < sevenDays) {
                setShowPrompt(false);
            }
        }
    }, []);

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg shadow-2xl p-4 text-white">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
                    aria-label="Dismiss"
                >
                    <X size={20} />
                </button>

                <div className="flex items-start gap-3 pr-6">
                    <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                        <Download size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{t('pwa.installTitle')}</h3>
                        <p className="text-white/90 text-sm mb-3">
                            {t('pwa.installMessage')}
                        </p>
                        <button
                            onClick={handleInstallClick}
                            className="bg-white text-violet-600 px-4 py-2 rounded-lg font-medium hover:bg-violet-50 transition-colors w-full"
                        >
                            {t('pwa.installButton')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
