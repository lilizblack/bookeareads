import React from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOffline } from '../hooks/useOffline';

const OfflineBanner = () => {
    const isOffline = useOffline();
    const { t } = useTranslation();

    if (!isOffline) return null;

    return (
        <div className="fixed top-0 left-0 w-full z-[100] animate-slide-down">
            <div className="bg-amber-500 text-white py-1.5 px-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest shadow-lg">
                <WifiOff size={14} />
                <span>{t('common.offlineMode', { defaultValue: 'Offline Mode: Some features may be limited.' })}</span>
            </div>
        </div>
    );
};

export default OfflineBanner;
