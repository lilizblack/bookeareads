import React from 'react';

const StatsCard = ({ label, count, colorClass, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full rounded-2xl p-4 flex flex-col items-center justify-center ${colorClass} transition-all active:scale-95 hover:brightness-95 cursor-pointer border-none outline-none`}
        >
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{count}</span>
            <span className="text-[10px] font-bold text-slate-600/70 dark:text-slate-300/70 uppercase tracking-widest mt-1">{label}</span>
        </button>
    );
};

export default StatsCard;
