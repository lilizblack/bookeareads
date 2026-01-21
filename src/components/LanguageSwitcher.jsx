import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
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

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[60]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[70] min-w-[160px] animate-slide-up transform origin-top-right">
                        <div className="py-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        changeLanguage(lang.code);
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${i18n.language === lang.code ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                            {lang.label}
                                        </div>
                                        <span className={`font-medium ${i18n.language === lang.code ? 'text-violet-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {lang.name}
                                        </span>
                                    </div>
                                    {i18n.language === lang.code && (
                                        <Check size={18} className="text-violet-600 stroke-[3px]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LanguageSwitcher;
