import React, { useState } from 'react';
import { useBooks } from '../context/BookContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { Check, X, Target, DollarSign, BookOpen, Clock, Library, PauseCircle, XCircle, Star, Heart, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import ChilliIcon from '../components/ChilliIcon';
import StatsCard from '../components/StatsCard';
import CoverImage from '../components/CoverImage';
import ChartCard from '../components/ChartCard';
import { formatCurrency } from '../utils/currency';
import Header from '../components/Header';

import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Calendar = () => {
    const { books, getYearlyStats, getStreak, readingGoal, setReadingGoal } = useBooks();
    const { themePreset } = useTheme();
    const stats = getYearlyStats();
    const streak = getStreak();
    const navigate = useNavigate();
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

    // Month navigation state
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handlePreviousMonth = () => {
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleToday = () => {
        setSelectedDate(new Date());
    };
    const [tempGoals, setTempGoals] = useState({ yearly: readingGoal.yearly, monthly: readingGoal.monthly });

    const openGoalModal = () => {
        setTempGoals({ yearly: readingGoal.yearly, monthly: readingGoal.monthly });
        setIsGoalModalOpen(true);
    };

    const handleGoalSave = (newGoal) => {
        setReadingGoal(newGoal);
        setIsGoalModalOpen(false);
    };

    const days = eachDayOfInterval({
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate)
    });

    // Aggregation for Monthly Charts
    const currentYear_num = selectedDate.getFullYear();
    const currentMonth_num = selectedDate.getMonth();

    const readBooksThisMonth = books.filter(b => {
        if (b.status !== 'read' || !b.finishedAt) return false;
        const finishedDate = new Date(b.finishedAt);
        return finishedDate.getFullYear() === currentYear_num && finishedDate.getMonth() === currentMonth_num;
    });

    // Worst Review Count (rating <= 2)
    const worstReviewCount = readBooksThisMonth.filter(b => b.rating > 0 && b.rating <= 2).length;

    // Favorites Added This Month
    const favoritesThisMonth = books.filter(b => {
        if (!b.isFavorite || !b.addedAt) return false;
        const addedDate = new Date(b.addedAt);
        return addedDate.getFullYear() === currentYear_num && addedDate.getMonth() === currentMonth_num;
    }).length;

    // Monthly Genre distribution
    const genreCounts = {};
    readBooksThisMonth.forEach(b => {
        (b.genres || []).forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
    });
    const monthlyTopGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    // Monthly Format distribution
    const formatCounts = {};
    readBooksThisMonth.forEach(b => {
        const f = b.format || 'Unknown';
        formatCounts[f] = (formatCounts[f] || 0) + 1;
    });
    const monthlyFormatData = Object.entries(formatCounts)
        .map(([name, value]) => ({ name, value }));

    // Monthly Purchase Location distribution (for owned books)
    const locationCounts = {};
    books.filter(b => {
        if (!b.isOwned || !b.purchaseLocation) return false;
        if (b.boughtDate) {
            const boughtDate = new Date(b.boughtDate);
            return boughtDate.getFullYear() === currentYear_num && boughtDate.getMonth() === currentMonth_num;
        }
        if (b.addedAt) {
            const addedDate = new Date(b.addedAt);
            return addedDate.getFullYear() === currentYear_num && addedDate.getMonth() === currentMonth_num;
        }
        return false;
    }).forEach(b => {
        const loc = b.purchaseLocation;
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const monthlyLocationData = Object.entries(locationCounts)
        .map(([name, value]) => ({ name, value }));

    // Monthly Spend Calculation
    const monthlySpent = readBooksThisMonth.reduce((acc, b) => acc + (b.isOwned ? (parseFloat(b.price) || 0) : 0), 0);

    // Monthly Pages Read Calculation (Sum of increments this month)
    const monthlyPagesRead = books.reduce((total, book) => {
        const logs = book.readingLogs || [];
        const thisMonthLogs = logs.filter(l => {
            const date = new Date(l.date);
            return date.getFullYear() === currentYear_num && date.getMonth() === currentMonth_num;
        });

        if (thisMonthLogs.length === 0) return total;

        const maxThisMonth = Math.max(...thisMonthLogs.map(l => l.pagesRead || 0));

        const prevMonthLogs = logs.filter(l => {
            const date = new Date(l.date);
            return date < new Date(currentYear_num, currentMonth_num, 1);
        });

        const maxBeforeMonth = prevMonthLogs.length > 0
            ? Math.max(...prevMonthLogs.map(l => l.pagesRead || 0))
            : 0;

        return total + Math.max(0, maxThisMonth - maxBeforeMonth);
    }, 0);

    // Monthly Reading Time Calculation
    const monthlyTimeRead = books.reduce((total, book) => {
        const logs = book.readingLogs || [];
        const thisMonthLogs = logs.filter(l => {
            const date = new Date(l.date);
            return date.getFullYear() === currentYear_num && date.getMonth() === currentMonth_num;
        });

        const monthTotal = thisMonthLogs.reduce((acc, l) => acc + (l.minutesRead || 0), 0);
        return total + monthTotal;
    }, 0);

    const formatTime = (minutes) => {
        if (!minutes) return '0m';
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // Monthly Library Growth Stats
    const booksAddedThisMonth = books.filter(b => {
        if (!b.addedAt) return false;
        const addedDate = new Date(b.addedAt);
        return addedDate.getFullYear() === currentYear_num && addedDate.getMonth() === currentMonth_num;
    }).length;

    const tbrAddedThisMonth = books.filter(b => {
        if (!b.addedAt || b.status !== 'want-to-read') return false;
        const addedDate = new Date(b.addedAt);
        return addedDate.getFullYear() === currentYear_num && addedDate.getMonth() === currentMonth_num;
    }).length;

    const totalTBRRemaining = books.filter(b => b.status === 'want-to-read').length;

    // Monthly Spicy Books
    const spicyBooksReadThisMonth = readBooksThisMonth.filter(b => b.hasSpice).length;

    // Helper to find cover for a day
    const getUpdateForDay = (date) => {
        // Find a book logged on this day
        const log = books.find(b =>
            b.readingLogs?.some(l => isSameDay(new Date(l.date), date))
        );
        // Or finished on this day
        const finished = books.find(b =>
            b.finishedAt && isSameDay(new Date(b.finishedAt), date)
        );
        return finished || log;
    };

    return (
        <div className="pb-24 pt-4">
            {/* Goal Modal Overlay */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-fade-in scale-in flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                                <Target className="text-blue-500" /> Set Goals
                            </h3>
                            <button onClick={() => setIsGoalModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-8 mb-10">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 mb-3 block tracking-wider">Monthly Goal</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        className="flex-1 min-w-0 text-center text-3xl font-black bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-3 outline-none border-2 border-transparent focus:border-blue-500 transition-all dark:text-white"
                                        value={tempGoals.monthly}
                                        onChange={e => setTempGoals(prev => ({ ...prev, monthly: Number(e.target.value) }))}
                                    />
                                    <span className="text-slate-400 font-bold uppercase text-xs">Books / Mo</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 mb-3 block tracking-wider">Yearly Goal</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        className="flex-1 min-w-0 text-center text-3xl font-black bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-3 outline-none border-2 border-transparent focus:border-emerald-500 transition-all dark:text-white"
                                        value={tempGoals.yearly}
                                        onChange={e => setTempGoals(prev => ({ ...prev, yearly: Number(e.target.value) }))}
                                    />
                                    <span className="text-slate-400 font-bold uppercase text-xs">Books / Yr</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={saveGoals}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            Save Goals
                        </button>
                    </div>
                </div>
            )}

            <Header />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Calendar</h1>
                <button
                    onClick={() => navigate('/annual')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors text-xs font-black uppercase tracking-wider shadow-sm contrast-card"
                >
                    <TrendingUp size={14} />
                    Report
                </button>
            </div>

            {/* Top Section: Streak + Stats */}
            <div className="flex gap-4 mb-8">
                {/* Streak Card (Vertical Blue) */}
                <div className="w-1/4 bg-sky-200 dark:bg-sky-900 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm min-h-[120px] contrast-card">
                    <div className="mb-2 bg-slate-900 text-white p-2 rounded-full">
                        <Check size={20} />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-1">{streak}</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase leading-tight">Day<br />Streak</div>
                </div>

                {/* Stats Cards (Horizontal Row of Squares) */}
                <div className="flex-1 grid grid-cols-4 gap-2">
                    <StatsCard
                        label="Reading"
                        count={stats.reading}
                        colorClass="bg-[var(--color-pastel-blue)] dark:bg-blue-900/40"
                        onClick={() => navigate('/library', { state: { statusFilter: 'Reading' } })}
                    />
                    <StatsCard
                        label="Read"
                        count={stats.read}
                        colorClass="bg-[var(--color-pastel-green)] dark:bg-emerald-900/40"
                        onClick={() => navigate('/library', { state: { statusFilter: 'Read' } })}
                    />
                    <StatsCard
                        label="TBR"
                        count={stats.tbr}
                        colorClass="bg-[var(--color-pastel-pink)] dark:bg-fuchsia-900/40"
                        onClick={() => navigate('/library', { state: { statusFilter: 'Want to Read' } })}
                    />
                    <StatsCard
                        label="Added"
                        count={stats.addedThisMonth}
                        colorClass="bg-[var(--color-pastel-orange)] dark:bg-amber-900/40"
                        onClick={() => navigate('/library')}
                    />
                </div>
            </div>

            {/* Goals Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Goals This Month</h2>
                    <button onClick={openGoalModal} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors px-3 py-2 -mr-3 active:scale-95">
                        Set Goals →
                    </button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-5 relative overflow-hidden ring-1 ring-blue-100 dark:ring-blue-900/30 contrast-card">
                    {/* Monthly Progress Bar */}
                    <div className="absolute left-0 top-0 bottom-0 bg-blue-500/10 dark:bg-blue-500/20 transition-all duration-1000 ease-out" style={{ width: `${Math.min((stats.readThisMonth / readingGoal.monthly) * 100, 100)}%` }} />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{stats.readThisMonth}</span>
                            <span className="text-lg font-bold text-slate-400">/ {readingGoal.monthly}</span>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                <span className="block text-sm font-black text-slate-800 dark:text-slate-200">Books Read</span>
                                {stats.readThisMonth >= readingGoal.monthly && (
                                    <div className="bg-blue-500 text-white p-0.5 rounded-full shadow-lg shadow-blue-500/40 animate-scale-in">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-tighter">Monthly Target</span>
                        </div>
                    </div>
                </div>

                {/* Yearly Summary */}
                <div className="mt-3 bg-slate-100 dark:bg-white/5 rounded-xl py-3 px-4 flex items-center justify-between border border-slate-200 dark:border-white/10 contrast-card">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yearly Progress</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold dark:text-white">{stats.readThisYear}</span>
                        <span className="text-xs font-bold text-slate-400">/ {readingGoal.yearly}</span>
                    </div>
                </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Books this Month</h2>

            {/* Calendar Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 contrast-card">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {format(selectedDate, 'MMMM yyyy')}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousMonth}
                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="Previous Month"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={handleToday}
                                className="px-3 py-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors text-xs font-bold"
                            >
                                Today
                            </button>
                            <button
                                onClick={handleNextMonth}
                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="Next Month"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                    {/* Year Selector Stub */}
                    <div className="text-sm font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        {format(selectedDate, 'yyyy')} ▼
                    </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={`${d}-${i}`} className="text-xs font-bold text-slate-400">{d}</div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Add empty cells for days before the 1st */}
                    {Array.from({ length: days[0].getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[8rem]"></div>
                    ))}

                    {days.map(day => {
                        // Find ALL books with ACTIVITY (logs, start, or finish) on this day
                        let booksForDay = books.filter(b => {
                            const hasLog = b.readingLogs?.some(log => isSameDay(new Date(log.date), day));
                            const isStarted = b.startedAt && isSameDay(new Date(b.startedAt), day);
                            const isFinished = b.finishedAt && isSameDay(new Date(b.finishedAt), day);

                            return hasLog || isStarted || isFinished;
                        });

                        // Sort by time (Earliest activity first)
                        const activeBooks = booksForDay.sort((a, b) => {
                            const getTimestamp = (book) => {
                                const timestamps = [];
                                if (book.finishedAt && isSameDay(new Date(book.finishedAt), day)) {
                                    timestamps.push(new Date(book.finishedAt).getTime());
                                }
                                const logs = book.readingLogs?.filter(l => isSameDay(new Date(l.date), day)) || [];
                                logs.forEach(l => timestamps.push(new Date(l.date).getTime()));

                                return timestamps.length > 0 ? Math.min(...timestamps) : 0;
                            };
                            return getTimestamp(a) - getTimestamp(b);
                        });

                        const isToday = isSameDay(day, new Date());

                        return (
                            <div
                                key={day.toString()}
                                className={`min-h-[8rem] relative flex flex-col rounded-lg overflow-hidden transition-all ${isToday
                                    ? 'bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500 dark:ring-violet-400'
                                    : 'bg-slate-50 dark:bg-slate-800/50'
                                    }`}
                            >
                                {/* Date Number - Resides in top padding area */}
                                <div className="h-6 flex items-center justify-center shrink-0 z-20">
                                    <span className={`text-xs font-bold ${isToday
                                        ? 'text-violet-700 dark:text-violet-300'
                                        : activeBooks.length > 0
                                            ? 'text-slate-900 dark:text-white'
                                            : 'text-slate-500'
                                        }`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                {/* Covers Area - Flexible Grid */}
                                <div className={`flex-1 grid gap-1 px-1 pb-1 ${activeBooks.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {activeBooks.length > 0 && activeBooks.map((book) => (
                                        <div
                                            key={book.id}
                                            onClick={() => navigate(`/book/${book.id}`)}
                                            className="relative w-full cursor-pointer hover:opacity-80 transition-opacity"
                                            style={{ aspectRatio: '2/3' }} // Force book ratio to expand height
                                        >
                                            <CoverImage
                                                src={book.cover}
                                                title={book.title}
                                                author={book.author}
                                                className="w-full h-full object-cover rounded-md shadow-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Weekly Progress Tracker */}
            <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 contrast-card">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">This Week's Progress</h3>
                <div className="grid grid-cols-7 gap-2">
                    {(() => {
                        const today = new Date();
                        const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
                        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
                        const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                        return weekDays.map((day, index) => {
                            // Check if there's any reading activity on this day
                            const hasActivity = books.some(book => {
                                const hasLog = book.readingLogs?.some(log => isSameDay(new Date(log.date), day));
                                const isStarted = book.startedAt && isSameDay(new Date(book.startedAt), day);
                                const isFinished = book.finishedAt && isSameDay(new Date(book.finishedAt), day);
                                return hasLog || isStarted || isFinished;
                            });

                            const isToday = isSameDay(day, today);
                            const isPast = day < today && !isSameDay(day, today);

                            return (
                                <div
                                    key={index}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${hasActivity
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500'
                                        : isToday
                                            ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                                            : 'bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'
                                        }`}
                                >
                                    <div className={`text-xs font-bold uppercase mb-2 ${hasActivity
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : isToday
                                            ? 'text-blue-700 dark:text-blue-400'
                                            : 'text-slate-400'
                                        }`}>
                                        {dayAbbreviations[index]}
                                    </div>
                                    <div className={`text-lg font-bold mb-2 ${hasActivity
                                        ? 'text-emerald-900 dark:text-emerald-300'
                                        : isToday
                                            ? 'text-blue-900 dark:text-blue-300'
                                            : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                        {format(day, 'd')}
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${hasActivity
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-200 dark:bg-slate-700'
                                        }`}>
                                        {hasActivity && <Check size={16} className="text-white" />}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                        <span>Activity logged</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span>Today</span>
                    </div>
                </div>
            </div>

            {/* Monthly Analytics Section */}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-8 mb-4">Monthly Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                <ChartCard
                    title="Monthly Top Genres"
                    data={monthlyTopGenres}
                    colors={themePreset === 'paper-ink' ? ['#333333', '#555555', '#777777', '#999999', '#BBBBBB'] : ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B']}
                />
                <ChartCard
                    title="Monthly Book Formats"
                    data={monthlyFormatData}
                    colors={themePreset === 'paper-ink' ? ['#333333', '#666666', '#999999', '#CCCCCC', '#EEEEEE'] : ['#6366F1', '#F43F5E', '#84CC16', '#06B6D4', '#D946EF']}
                />
                <ChartCard
                    title="Monthly Purchase Locations"
                    data={monthlyLocationData}
                    colors={themePreset === 'paper-ink' ? ['#333333', '#555555', '#777777', '#999999', '#BBBBBB'] : ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6']}
                />
            </div>

            {/* Monthly Stats Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Monthly Spend Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm contrast-card">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl">
                            <DollarSign className="text-emerald-600 dark:text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Monthly Spent</h3>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                                {formatCurrency(monthlySpent)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monthly Time Read Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm contrast-card">
                    <div className="flex items-center gap-4">
                        <div className="bg-violet-100 dark:bg-violet-900/30 p-3 rounded-xl">
                            <Clock className="text-violet-600 dark:text-violet-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Time Read</h3>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                                {formatTime(monthlyTimeRead)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monthly Pages Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm contrast-card">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                            <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pages Read</h3>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                                {monthlyPagesRead.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monthly Spicy Books Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm contrast-card">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
                            <ChilliIcon size={24} className="text-red-500 fill-current" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Spicy Reads</h3>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                                {spicyBooksReadThisMonth}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monthly Paused Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm contrast-card">
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl">
                            <PauseCircle className="text-amber-600 dark:text-amber-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Paused</h3>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                                {stats.pausedThisMonth}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monthly DNF Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm contrast-card">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                            <XCircle className="text-slate-600 dark:text-slate-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">DNF</h3>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                                {stats.dnfThisMonth}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Worst Review Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm contrast-card">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
                            <Star className="text-red-600 dark:text-red-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Worst Review</h3>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                                {worstReviewCount}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Favorites Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-pink-100 dark:bg-pink-900/30 p-3 rounded-xl">
                            <Heart className="text-pink-600 dark:text-pink-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Favorites</h3>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                                {favoritesThisMonth}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Monthly Library Growth Card */}
                <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl border border-slate-700 dark:border-slate-700 col-span-1 md:col-span-3 text-white shadow-xl shadow-slate-200 dark:shadow-none relative overflow-hidden contrast-card">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Library size={80} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Monthly Growth ({format(selectedDate, 'MMMM')})</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-2xl font-black">{booksAddedThisMonth}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Added</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-amber-400">{tbrAddedThisMonth}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">TBR Added</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-emerald-400">{totalTBRRemaining}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">TBR Total</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
