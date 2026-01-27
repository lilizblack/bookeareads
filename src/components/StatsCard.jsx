import React from 'react';
import { Book, BookOpen, Heart, Plus } from 'lucide-react';

const StatsCard = ({ label, count, colorClass, onClick }) => {
    // Map label to icon
    const getIcon = () => {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('reading')) return <BookOpen size={20} />;
        if (lowerLabel.includes('read')) return <Book size={20} />;
        if (lowerLabel.includes('tbr') || lowerLabel.includes('want')) return <Heart size={20} />;
        if (lowerLabel.includes('added')) return <Plus size={20} />;
        return <Book size={20} />;
    };

    // Map colorClass to design system colors
    const getColorStyles = () => {
        if (colorClass.includes('blue')) {
            return {
                bg: 'bg-blue-50 dark:bg-blue-900/20',
                border: 'border-blue-100 dark:border-blue-800/30',
                icon: 'text-blue-500 dark:text-blue-400',
                number: 'text-blue-600 dark:text-blue-400',
                shadow: 'shadow-soft-md hover:shadow-blue-500/20',
            };
        }
        if (colorClass.includes('green') || colorClass.includes('emerald')) {
            return {
                bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                border: 'border-emerald-100 dark:border-emerald-800/30',
                icon: 'text-emerald-500 dark:text-emerald-400',
                number: 'text-emerald-600 dark:text-emerald-400',
                shadow: 'shadow-soft-md hover:shadow-emerald-500/20',
            };
        }
        if (colorClass.includes('pink') || colorClass.includes('fuchsia')) {
            return {
                bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
                border: 'border-fuchsia-100 dark:border-fuchsia-800/30',
                icon: 'text-fuchsia-500 dark:text-fuchsia-400',
                number: 'text-fuchsia-600 dark:text-fuchsia-400',
                shadow: 'shadow-soft-md hover:shadow-fuchsia-500/20',
            };
        }
        if (colorClass.includes('orange') || colorClass.includes('amber')) {
            return {
                bg: 'bg-amber-50 dark:bg-amber-900/20',
                border: 'border-amber-100 dark:border-amber-800/30',
                icon: 'text-amber-500 dark:text-amber-400',
                number: 'text-amber-600 dark:text-amber-400',
                shadow: 'shadow-soft-md hover:shadow-amber-500/20',
            };
        }
        // Default
        return {
            bg: 'bg-slate-50 dark:bg-slate-800/50',
            border: 'border-slate-100 dark:border-slate-700/30',
            icon: 'text-slate-500 dark:text-slate-400',
            number: 'text-slate-600 dark:text-slate-300',
            shadow: 'shadow-soft-md hover:shadow-soft-lg',
        };
    };

    const colors = getColorStyles();

    return (
        <button
            onClick={onClick}
            className={`
                w-full min-h-touch-comfortable
                rounded-xl p-4
                ${colors.bg} ${colors.shadow}
                border ${colors.border}
                flex flex-col items-center justify-center gap-2
                transition-all duration-base
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:scale-95
                cursor-pointer no-select touch-feedback
                outline-none focus:ring-2 focus:ring-violet-500/50
            `}
            style={{
                willChange: 'transform, box-shadow',
            }}
        >
            {/* Icon */}
            <div className={`${colors.icon} transition-transform duration-base group-hover:scale-110`}>
                {getIcon()}
            </div>

            {/* Count */}
            <span className={`font-ui text-3xl font-black ${colors.number} tabular-nums`}>
                {count}
            </span>

            {/* Label */}
            <span className="font-ui text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {label}
            </span>
        </button>
    );
};

export default StatsCard;
