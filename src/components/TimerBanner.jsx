import React, { useState, useEffect } from 'react';
import { Timer, ArrowRight, Square } from 'lucide-react';
import { useBooks } from '../context/BookContext';
import { useNavigate } from 'react-router-dom';

const TimerBanner = () => {
    const { activeTimer, books } = useBooks();
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState('');

    const activeBook = books.find(b => b.id === activeTimer?.bookId);

    useEffect(() => {
        if (!activeTimer) return;

        const updateElapsed = () => {
            const start = new Date(activeTimer.startTime);
            const now = new Date();
            const diffMs = now - start;

            const hours = Math.floor(diffMs / 3600000);
            const minutes = Math.floor((diffMs % 3600000) / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);

            let timeStr = '';
            if (hours > 0) timeStr += `${hours}h `;
            timeStr += `${minutes}m ${seconds}s`;
            setElapsed(timeStr);
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [activeTimer]);

    if (!activeTimer || !activeBook) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-600 to-rose-500 text-white py-3 px-4 shadow-lg animate-slide-down flex items-center justify-between backdrop-blur-md bg-opacity-90"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-white/20 p-1.5 rounded-lg animate-pulse">
                    <Timer size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase opacity-80 tracking-widest leading-none mb-1">Reading Now</p>
                    <p className="text-sm font-bold truncate leading-none">
                        {activeBook.title}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase opacity-80 tracking-widest leading-none mb-1">Elapsed</p>
                    <p className="text-sm font-mono font-bold leading-none">{elapsed}</p>
                </div>

                <div className="flex gap-1">
                    <button
                        onClick={() => navigate(`/book/${activeBook.id}`)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        title="View Book"
                    >
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimerBanner;
