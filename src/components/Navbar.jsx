import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Library, PlusCircle, Calendar, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
    const { t } = useTranslation();

    const navItems = [
        { to: '/', icon: Home, label: t('nav.dashboard'), size: 22 },
        { to: '/library', icon: Library, label: t('nav.library'), size: 22 },
        { to: '/add', icon: PlusCircle, label: t('nav.addBook'), isSpecial: true, size: 28 },
        { to: '/calendar', icon: Calendar, label: t('nav.calendar'), size: 22 },
        { to: '/favorites', icon: Heart, label: t('nav.favorites'), size: 22 },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50 shadow-soft-lg">
            {/* Safe area padding for devices with home indicators */}
            <div className="pb-safe-bottom">
                <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `
                                    relative flex flex-col items-center justify-center 
                                    min-w-touch min-h-touch-large
                                    flex-1 gap-1
                                    transition-all duration-base
                                    no-select touch-feedback
                                    group
                                    ${isActive
                                        ? 'text-violet-600 dark:text-violet-400'
                                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                    }
                                    ${item.isSpecial ? 'scale-110' : ''}
                                `}
                            >
                                {({ isActive }) => (
                                    <>
                                        {/* Active indicator background */}
                                        {isActive && !item.isSpecial && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-14 h-10 bg-violet-50 dark:bg-violet-900/20 rounded-xl animate-scale-in" />
                                            </div>
                                        )}

                                        {/* Special button (Add Book) */}
                                        {item.isSpecial ? (
                                            <div className={`
                                                relative flex flex-col items-center justify-center gap-1
                                                transition-all duration-base
                                                ${isActive ? 'scale-110' : 'hover:scale-105 active:scale-95'}
                                            `}>
                                                <div className={`
                                                    p-2 rounded-full
                                                    ${isActive
                                                        ? 'bg-violet-600 dark:bg-violet-500 shadow-violet'
                                                        : 'bg-slate-100 dark:bg-slate-800 shadow-soft-md hover:shadow-soft-lg'
                                                    }
                                                    transition-all duration-base
                                                `}>
                                                    <Icon
                                                        size={item.size}
                                                        className={isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300'}
                                                        strokeWidth={2.5}
                                                    />
                                                </div>
                                                <span className="font-ui text-[9px] font-semibold uppercase tracking-wider">
                                                    {item.label}
                                                </span>
                                            </div>
                                        ) : (
                                            /* Regular nav items */
                                            <>
                                                <div className={`
                                                    relative z-10
                                                    transition-all duration-base
                                                    ${isActive ? 'scale-110' : 'group-hover:scale-105 group-active:scale-95'}
                                                `}>
                                                    <Icon
                                                        size={item.size}
                                                        strokeWidth={isActive ? 2.5 : 2}
                                                        className="transition-all duration-base"
                                                    />
                                                </div>
                                                <span className={`
                                                    relative z-10 font-ui text-[10px] font-semibold
                                                    transition-all duration-base
                                                    ${isActive ? 'opacity-100 translate-y-0' : 'opacity-70 group-hover:opacity-100'}
                                                `}>
                                                    {item.label}
                                                </span>

                                                {/* Active indicator dot */}
                                                {isActive && (
                                                    <div className="absolute bottom-0 w-1 h-1 bg-violet-600 dark:bg-violet-400 rounded-full animate-scale-in" />
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
