import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Library, PlusCircle, Calendar, Heart } from 'lucide-react';

const Navbar = () => {
    const navItems = [
        { to: '/', icon: <Home size={24} />, label: 'Home' },
        { to: '/library', icon: <Library size={24} />, label: 'Shelf' },
        { to: '/add', icon: <PlusCircle size={32} className="text-slate-900 dark:text-white" />, label: 'Add', isSpecial: true },
        { to: '/calendar', icon: <Calendar size={24} />, label: 'Calendar' },
        { to: '/favorites', icon: <Heart size={24} />, label: 'Favs' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 pb-safe safe-area-inset-bottom z-50">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `
              flex flex-col items-center justify-center w-full h-full space-y-1
              ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
              transition-colors duration-200
            `}
                    >
                        {item.icon}
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default Navbar;
