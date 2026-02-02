import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Success animation component
 * @param {Object} props
 * @param {string} props.message - Success message
 * @param {Function} props.onComplete - Callback when animation finishes
 * @param {number} props.duration - Duration to show animation (ms)
 */
const SuccessAnimation = ({ message = "Success!", onComplete, duration = 2000 }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="flex flex-col items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 animate-success-pop">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Check size={40} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{message}</h3>
            </div>
        </div>
    );
};

export default SuccessAnimation;
