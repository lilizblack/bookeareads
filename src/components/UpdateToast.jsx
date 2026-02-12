import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, X } from 'lucide-react';

const UpdateToast = () => {
    const { t } = useTranslation();
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needUpdate: [needUpdate, setNeedUpdate],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered');
        },
        onRegisterError(error) {
            console.error('SW Error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedUpdate(false);
    };

    if (!offlineReady && !needUpdate) return null;

    return (
        <div className="fixed bottom-24 right-4 z-[100] max-w-[320px] animate-slide-up">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 overflow-hidden relative">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
                        <RefreshCw size={20} className={needUpdate ? "animate-spin-slow" : ""} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                            {needUpdate ? t('pwa.updateAvailableTitle', { defaultValue: 'New Version Available!' }) : t('pwa.offlineReadyTitle', { defaultValue: 'Ready to use Offline' })}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            {needUpdate
                                ? t('pwa.updateAvailableMessage', { defaultValue: 'A new version of Bookea is available! Update now to get the latest features.' })
                                : t('pwa.offlineReadyMessage', { defaultValue: 'App is ready to work offline!' })
                            }
                        </p>

                        <div className="flex gap-2 mt-4">
                            {needUpdate && (
                                <button
                                    onClick={() => updateServiceWorker(true)}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                                >
                                    <RefreshCw size={12} />
                                    {t('actions.updateNow', { defaultValue: 'Update Now' })}
                                </button>
                            )}
                            <button
                                onClick={close}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                            >
                                {t('actions.dismiss', { defaultValue: 'Dismiss' })}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateToast;
