import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'es', name: 'Español', flag: '🇪🇸' }
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        localStorage.setItem('language', code);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-auto"
            >
                <Globe size={18} className="text-violet-600 flex-shrink-0" />
                <span className="font-medium text-sm">{currentLanguage.flag} {currentLanguage.name}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20 min-w-[180px] origin-top-right">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b last:border-none border-slate-100 dark:border-slate-700"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="text-xl">{lang.flag}</span>
                                    <span className={`font-medium ${i18n.language === lang.code ? 'text-violet-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {lang.name}
                                    </span>
                                </span>
                                {i18n.language === lang.code && (
                                    <Check size={18} className="text-violet-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default LanguageSwitcher;
