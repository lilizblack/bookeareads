import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Check, X } from 'lucide-react';

const LanguageSwitcher = () => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    const languages = [
        { code: 'en', name: 'English', label: 'EN' },
        { code: 'es', name: 'Español', label: 'ES' }
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        localStorage.setItem('language', code);
        setIsOpen(false);
    };

    const dropdownContent = (
        <div className="custom-select-portal-wrapper">
            <div
                className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={() => setIsOpen(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[320px] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[9999] animate-scale-in">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('common.language')}</h3>
                        <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    changeLanguage(lang.code);
                                }}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${i18n.language === lang.code
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`px-2 py-1 rounded text-[10px] font-black tracking-wider ${i18n.language === lang.code ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                        {lang.label}
                                    </div>
                                    <span className="font-bold text-base">{lang.name}</span>
                                </div>
                                {i18n.language === lang.code && (
                                    <Check size={20} className="stroke-[3px]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative inline-block text-right">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                <div className="flex items-center gap-1.5 font-bold text-violet-600 text-xs tracking-wider">
                    {currentLanguage.label}
                </div>
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{currentLanguage.name}</span>
            </button>

            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default LanguageSwitcher;
