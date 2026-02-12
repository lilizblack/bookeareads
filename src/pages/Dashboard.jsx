import React, { useState, useRef } from 'react';
import { useBooks } from '../context/BookContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import BookCard from '../components/BookCard';
import StatsCard from '../components/StatsCard';
import CoverImage from '../components/CoverImage';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, ArrowRight, Plus, X, Download, Upload, Loader2, User, BarChart2, Target, Check, Timer, Book, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import { getBookProgressPercentage } from '../utils/bookUtils';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const Dashboard = () => {
    const { loading, readingBooks, getYearlyStats, wantToReadBooks, logReading, readingGoal, setReadingGoal, setReadingGoalDB, userProfile, activeTimer, startTimer, stopTimer, updateBook } = useBooks();
    const { user } = useAuth();
    const { theme, toggleTheme, themePreset } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const stats = getYearlyStats();

    // Progress Modal State
    const [selectedBook, setSelectedBook] = useState(null);
    const [newProgress, setNewProgress] = useState(0);
    const [progressHours, setProgressHours] = useState(0);
    const [progressMinutes, setProgressMinutes] = useState(0);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [tempGoals, setTempGoals] = useState({ yearly: readingGoal.yearly, monthly: readingGoal.monthly });
    const [pendingStartBook, setPendingStartBook] = useState(null);
    const [showTrackingModeModal, setShowTrackingModeModal] = useState(false);
    const [tempStartTime, setTempStartTime] = useState(null);
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    const scrollRef = useRef(null);

    React.useEffect(() => {
        const handleStartReadingRequest = (e) => {
            setPendingStartBook(e.detail.book);
        };
        const handleStopTimerEvent = (e) => {
            const book = e.detail.book;
            if (activeTimer && activeTimer.bookId === book.id) {
                const start = new Date(activeTimer.startTime);
                const now = new Date();
                const minutes = (now - start) / 60000;
                setElapsedMinutes(parseFloat(Math.max(0.1, minutes).toFixed(2)));
                setSelectedBook(book);
                setNewProgress(book.progress || 0);
            }
        };

        window.addEventListener('start-reading-request', handleStartReadingRequest);
        window.addEventListener('stop-timer', handleStopTimerEvent);
        return () => {
            window.removeEventListener('start-reading-request', handleStartReadingRequest);
            window.removeEventListener('stop-timer', handleStopTimerEvent);
        };
    }, [activeTimer]);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -300 : 300;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };



    const handleBookClick = (book) => {
        navigate(`/book/${book.id}`);
    };

    const openLogModal = (book, e) => {
        e.stopPropagation();
        setSelectedBook(book);
        const currentProgress = book.progress || 0;
        setNewProgress(currentProgress);

        const trackingUnit = book.tracking_unit || book.progressMode || (book.format === 'Audiobook' ? 'minutes' : 'pages');
        if (trackingUnit === 'minutes') {
            setProgressHours(Math.floor(currentProgress / 60));
            setProgressMinutes(currentProgress % 60);
        } else {
            setProgressHours(0);
            setProgressMinutes(0);
        }
    };

    const saveProgress = () => {
        if (selectedBook) {
            const oldProgress = selectedBook.progress || 0;
            const sessionProgress = Math.max(0, newProgress - oldProgress);

            logReading(selectedBook.id, newProgress);
            if (elapsedMinutes > 0) {
                stopTimer(selectedBook.id, elapsedMinutes, sessionProgress);
                setElapsedMinutes(0);
            }
            setSelectedBook(null);
        }
    };

    const handleMarkAsFinished = (book) => {
        const trackingUnit = book.tracking_unit || book.progressMode || (book.format === 'Audiobook' ? 'minutes' : 'pages');
        let totalProgress = 0;

        if (trackingUnit === 'minutes') {
            totalProgress = book.total_duration_minutes || 0;
        } else if (trackingUnit === 'chapters') {
            totalProgress = book.totalChapters || 0;
        } else {
            totalProgress = book.totalPages || 0;
        }

        updateBook(book.id, {
            status: 'read',
            progress: totalProgress,
            finishedAt: new Date().toISOString()
        });
        setSelectedBook(null);
    };


    const openGoalModal = () => {
        setTempGoals({ yearly: readingGoal.yearly, monthly: readingGoal.monthly });
        setIsGoalModalOpen(true);
    };

    const saveGoals = async () => {
        const currentYear = new Date().getFullYear();
        await setReadingGoalDB(currentYear, tempGoals);
        setIsGoalModalOpen(false);
    };

    const confirmStartReading = () => {
        if (pendingStartBook) {
            setTempStartTime(new Date().toISOString());
            if (pendingStartBook.format === 'Audiobook') {
                handleTrackingModeConfirm('minutes');
                return;
            }
            setShowTrackingModeModal(true);
            // Don't close pendingStartBook yet, we need its data for the next modal
        }
    };

    const handleTrackingModeConfirm = (mode) => {
        if (pendingStartBook) {
            updateBook(pendingStartBook.id, {
                status: 'reading',
                startedAt: tempStartTime,
                progressMode: mode
            });
            startTimer(pendingStartBook.id);
            setPendingStartBook(null);
            setShowTrackingModeModal(false);
            setTempStartTime(null);
        }
    };

    return (
        <div className="pb-24 pt-2 relative">
            {/* Goal Modal Overlay */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-fade-in scale-in flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                                <Target className="text-blue-500" /> {t('dashboard.modals.setGoals')}
                            </h3>
                            <button onClick={() => setIsGoalModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-8 mb-10">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 mb-3 block tracking-wider">{t('dashboard.modals.monthlyGoal')}</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        className="flex-1 min-w-0 text-center text-3xl font-black bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-3 outline-none border-2 border-transparent focus:border-blue-500 transition-all dark:text-white"
                                        value={tempGoals.monthly}
                                        onChange={e => setTempGoals(prev => ({ ...prev, monthly: Number(e.target.value) }))}
                                    />
                                    <span className="text-slate-400 font-bold uppercase text-xs">{t('dashboard.modals.booksMo')}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 mb-3 block tracking-wider">{t('dashboard.modals.yearlyGoal')}</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        className="flex-1 min-w-0 text-center text-3xl font-black bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-3 outline-none border-2 border-transparent focus:border-emerald-500 transition-all dark:text-white"
                                        value={tempGoals.yearly}
                                        onChange={e => setTempGoals(prev => ({ ...prev, yearly: Number(e.target.value) }))}
                                    />
                                    <span className="text-slate-400 font-bold uppercase text-xs">{t('dashboard.modals.booksYr')}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={saveGoals}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            {t('dashboard.modals.setGoals')}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Overlay */}
            {selectedBook && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in slide-in-from-bottom">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white">{t('dashboard.modals.logProgress')}</h3>
                            <button onClick={() => setSelectedBook(null)}><X /></button>
                        </div>

                        <div className="flex gap-4 mb-6">
                            <div className="w-16 h-24 rounded bg-slate-200 overflow-hidden flex-shrink-0">
                                <CoverImage
                                    src={selectedBook.cover}
                                    title={selectedBook.title}
                                    author={selectedBook.author}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h4 className="font-bold dark:text-white">{selectedBook.title}</h4>
                                <p className="text-sm text-slate-500">{t('book.fields.progress')}: {selectedBook.progress}</p>
                            </div>
                        </div>

                        {elapsedMinutes > 0 && (
                            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 text-center animate-fade-in">
                                {t('dashboard.modals.session', { minutes: elapsedMinutes })}
                            </div>
                        )}

                        <div className="mb-8 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-bold uppercase text-slate-400 mb-2 block text-center">
                                {(() => {
                                    const trackingUnit = selectedBook.tracking_unit || selectedBook.progressMode || (selectedBook.format === 'Audiobook' ? 'minutes' : 'pages');
                                    if (trackingUnit === 'minutes') return t('dashboard.modals.timeListened', 'Time Listened');
                                    if (trackingUnit === 'chapters') return t('dashboard.modals.newChapter');
                                    return t('dashboard.modals.newPage');
                                })()}
                            </label>
                            {(() => {
                                const trackingUnit = selectedBook.tracking_unit || selectedBook.progressMode || (selectedBook.format === 'Audiobook' ? 'minutes' : 'pages');
                                if (trackingUnit === 'minutes') {
                                    return (
                                        <div className="flex gap-4 items-center justify-center">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block text-center">{t('book.fields.hours')}</label>
                                                <input
                                                    type="number"
                                                    className="w-full text-center text-4xl font-black bg-transparent outline-none p-2 dark:text-white border-b-2 border-violet-500"
                                                    value={progressHours}
                                                    onChange={e => {
                                                        const h = parseInt(e.target.value) || 0;
                                                        setProgressHours(h);
                                                        setNewProgress(h * 60 + progressMinutes);
                                                    }}
                                                    disabled={selectedBook.status === 'read'}
                                                />
                                            </div>
                                            <span className="text-3xl font-bold text-slate-300 pt-6">:</span>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block text-center">{t('book.fields.minutes')}</label>
                                                <input
                                                    type="number"
                                                    max="59"
                                                    className="w-full text-center text-4xl font-black bg-transparent outline-none p-2 dark:text-white border-b-2 border-violet-500"
                                                    value={progressMinutes}
                                                    onChange={e => {
                                                        const m = Math.min(59, parseInt(e.target.value) || 0);
                                                        setProgressMinutes(m);
                                                        setNewProgress(progressHours * 60 + m);
                                                    }}
                                                    disabled={selectedBook.status === 'read'}
                                                />
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <input
                                        type="number"
                                        className="w-full text-center text-5xl font-black bg-transparent outline-none p-2 dark:text-white border-b-2 border-violet-500"
                                        value={newProgress}
                                        onChange={e => setNewProgress(Number(e.target.value))}
                                        disabled={selectedBook.status === 'read'}
                                        autoFocus={selectedBook.status !== 'read'}
                                    />
                                );
                            })()}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={saveProgress}
                                disabled={selectedBook.status === 'read'}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedBook.status === 'read'
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                                    : 'bg-violet-600 text-white active:scale-95'
                                    }`}
                            >
                                {t('dashboard.modals.logProgress')}
                            </button>
                            <button
                                onClick={() => handleMarkAsFinished(selectedBook)}
                                className="w-full py-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800/50"
                            >
                                <Check size={20} />
                                {t('book.status.read', 'Finished')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Start Reading Modal Overlay */}
            {pendingStartBook && !showTrackingModeModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-fade-in scale-in flex flex-col items-center text-center">
                        <h3 className="text-2xl font-bold dark:text-white mb-2">{t('dashboard.modals.startReadingTitle')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                            {t('dashboard.modals.startReadingMessage', { title: pendingStartBook.title })}
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={confirmStartReading}
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold active:scale-95 transition-all"
                            >
                                {t('dashboard.modals.yesStart')}
                            </button>
                            <button
                                onClick={() => setPendingStartBook(null)}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold active:scale-95 transition-all"
                            >
                                {t('dashboard.modals.no')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tracking Mode Modal Overlay */}
            {showTrackingModeModal && pendingStartBook && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-fade-in scale-in flex flex-col items-center text-center relative overflow-hidden">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                            <Book size={32} />
                        </div>
                        <h3 className="text-2xl font-bold dark:text-white mb-2">{t('dashboard.modals.trackingModeTitle', 'Tracking Mode')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                            {t('dashboard.modals.trackingModeMessage', 'How do you want to track your progress for this book?')}
                        </p>

                        <div className={`grid ${pendingStartBook.format === 'Audiobook' ? 'grid-cols-1' : 'grid-cols-2'} gap-4 w-full`}>
                            {pendingStartBook.format === 'Audiobook' ? (
                                <button
                                    onClick={() => handleTrackingModeConfirm('minutes')}
                                    className="flex flex-col items-center gap-3 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                                >
                                    <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{t('book.fields.time', 'Time')}</span>
                                    <span className="text-[10px] uppercase text-slate-400 font-bold">{Math.floor((pendingStartBook.total_duration_minutes || 0) / 60)}h {(pendingStartBook.total_duration_minutes || 0) % 60}m</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleTrackingModeConfirm('pages')}
                                        className="flex flex-col items-center gap-3 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                                    >
                                        <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{t('book.fields.pages')}</span>
                                        <span className="text-[10px] uppercase text-slate-400 font-bold">{pendingStartBook.totalPages || 0} total</span>
                                    </button>
                                    <button
                                        onClick={() => handleTrackingModeConfirm('chapters')}
                                        className="flex flex-col items-center gap-3 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                                    >
                                        <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{t('book.fields.chapters')}</span>
                                        <span className="text-[10px] uppercase text-slate-400 font-bold">{pendingStartBook.totalChapters || 0} total</span>
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => { setShowTrackingModeModal(false); setPendingStartBook(null); }}
                            className="mt-8 text-slate-400 text-xs font-bold hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            {t('app.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <Header />

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('dashboard.title')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {userProfile?.name ? t('dashboard.hi', { name: userProfile.name }) : (user ? t('dashboard.hi', { name: user.email.split('@')[0] }) : t('dashboard.welcome'))}
                    </p>
                </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-4 gap-3 mb-8">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 sm:h-24 rounded-2xl" />
                    ))
                ) : (
                    <>
                        <StatsCard
                            label={t('dashboard.reading')}
                            count={stats.reading}
                            colorClass="bg-[var(--color-pastel-blue)] dark:bg-blue-900/40"
                            onClick={() => navigate('/library', { state: { statusFilter: 'Reading' } })}
                        />
                        <StatsCard
                            label={t('dashboard.read')}
                            count={stats.read}
                            colorClass="bg-[var(--color-pastel-green)] dark:bg-emerald-900/40"
                            onClick={() => navigate('/library', { state: { statusFilter: 'Read' } })}
                        />
                        <StatsCard
                            label={t('dashboard.tbr')}
                            count={stats.tbr}
                            colorClass="bg-[var(--color-pastel-pink)] dark:bg-fuchsia-900/40"
                            onClick={() => navigate('/library', { state: { statusFilter: 'Want to Read' } })}
                        />
                        <StatsCard
                            label={t('dashboard.added')}
                            count={stats.addedThisMonth}
                            colorClass="bg-[var(--color-pastel-orange)] dark:bg-amber-900/40"
                            onClick={() => navigate('/library')}
                        />
                    </>
                )}
            </div>

            {/* Goals Section (Special Bar) */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('dashboard.goalsThisMonth')}</h2>
                    <button onClick={openGoalModal} className={`text-sm font-bold ${themePreset === 'paper-ink' ? 'text-slate-900' : 'text-blue-500 hover:text-blue-600'} transition-colors px-3 py-2 -mr-3 active:scale-95`}>
                        {t('dashboard.setGoals')} <ArrowRight size={14} className="ml-1 inline" />
                    </button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-5 relative overflow-hidden ring-1 ring-blue-100 dark:ring-blue-900/30 contrast-card">
                    {/* Monthly Progress Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 ${themePreset === 'paper-ink' ? 'bg-slate-900' : 'bg-blue-500/10 dark:bg-blue-500/20'} transition-all duration-1000 ease-out`} style={{ width: `${Math.min((stats.readThisMonth / readingGoal.monthly) * 100, 100)}%` }} />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{stats.readThisMonth}</span>
                            <span className="text-lg font-bold text-slate-400">/ {readingGoal.monthly}</span>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                <span className="block text-sm font-black text-slate-800 dark:text-slate-200">{t('dashboard.booksRead')}</span>
                                {stats.readThisMonth >= readingGoal.monthly && (
                                    <div className="bg-blue-500 text-white p-0.5 rounded-full shadow-lg shadow-blue-500/40 animate-scale-in">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-tighter">{t('dashboard.readingGoal')}</span>
                        </div>
                    </div>
                </div>

                {/* Annual Report Button & Yearly Summary */}
                <div className="mt-3 flex gap-3">
                    <button
                        onClick={() => navigate('/annual')}
                        className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                    >
                        <BarChart2 size={18} />
                        {t('dashboard.annualReport')}
                    </button>
                    <div className="bg-slate-100 dark:bg-white/5 rounded-xl py-3 px-4 flex items-center justify-between flex-[1.5] border border-slate-200 dark:border-white/10 contrast-card">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('dashboard.yearlyProgress')}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold dark:text-white">{stats.readThisYear}</span>
                            <span className="text-xs font-bold text-slate-400">/ {readingGoal.yearly}</span>
                        </div>
                    </div>
                </div>

                {/* Monthly Activity Quick Stats */}
                <div className="mt-3 flex gap-3">
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl py-3 px-4 flex items-center justify-between border border-slate-200 dark:border-white/10 shadow-sm contrast-card">
                        <div className="flex items-center gap-2">
                            <BookOpen size={16} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('book.fields.pagesRead', 'Pages Read')}</span>
                        </div>
                        <span className="text-base font-black dark:text-white">{stats.pagesReadThisMonth.toLocaleString()}</span>
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl py-3 px-4 flex items-center justify-between border border-slate-200 dark:border-white/10 shadow-sm contrast-card">
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={16} className="text-indigo-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('calendar.chaptersRead', 'Chapters Read')}</span>
                        </div>
                        <span className="text-base font-black dark:text-white">{stats.chaptersReadThisMonth.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Currently Reading (Carousel) */}
            <div className="mb-8 -mx-4 px-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('dashboard.currentlyReading')}</h2>
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={() => navigate('/library', { state: { statusFilter: 'Reading' } })}
                            className={`text-sm font-bold ${themePreset === 'paper-ink' ? 'text-slate-900' : 'text-blue-500 hover:text-blue-600'} transition-colors px-3 py-2 active:scale-95`}
                        >
                            {t('dashboard.seeAll')} <ArrowRight size={14} className="ml-1 inline" />
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => scroll('left')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <ArrowRight size={16} className="rotate-180 text-slate-400" />
                            </button>
                            <button onClick={() => scroll('right')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <ArrowRight size={16} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="flex-none w-[280px] h-[180px] rounded-2xl" />
                        ))}
                    </div>
                ) : readingBooks.length > 0 ? (
                    <div ref={scrollRef} className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                        {readingBooks.map((book) => (
                            <div
                                key={book.id}
                                onClick={() => handleBookClick(book)}
                                className="flex-none w-[280px] snap-start bg-sky-400 dark:bg-sky-600 rounded-2xl p-4 text-white relative overflow-hidden shadow-lg shadow-sky-200 dark:shadow-sky-900/20 active:scale-98 transition-transform contrast-card"
                            >
                                {/* Plus Button for Logging (Top Right) */}
                                <button
                                    onClick={(e) => {
                                        if (book.status === 'read') return;
                                        openLogModal(book, e);
                                    }}
                                    disabled={book.status === 'read'}
                                    className={`absolute top-4 right-4 w-9 h-9 backdrop-blur rounded-full flex items-center justify-center transition-all z-20 ${book.status === 'read'
                                        ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed'
                                        : 'bg-white/20 hover:bg-white/30 text-white active:scale-90'
                                        }`}
                                >
                                    <Plus size={20} />
                                </button>

                                {/* Timer Button (Top Left) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (book.status === 'read') return;
                                        if (activeTimer?.bookId === book.id) {
                                            window.dispatchEvent(new CustomEvent('stop-timer', { detail: { book } }));
                                        } else {
                                            startTimer(book.id);
                                        }
                                    }}
                                    disabled={book.status === 'read'}
                                    className={`absolute top-4 left-4 w-9 h-9 backdrop-blur rounded-full flex items-center justify-center transition-colors z-20 ${book.status === 'read'
                                        ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed'
                                        : activeTimer?.bookId === book.id
                                            ? 'bg-red-500 text-white animate-pulse'
                                            : 'bg-white/20 hover:bg-white/30 text-white'
                                        }`}
                                >
                                    <Timer size={20} />
                                </button>

                                <div className="w-20 aspect-[2/3] rounded-lg shadow-md mb-4 bg-slate-800 overflow-hidden">
                                    <CoverImage
                                        src={book.cover}
                                        title={book.title}
                                        author={book.author}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <h3 className="font-bold text-base leading-tight mb-1 truncate">{book.title}</h3>
                                <p className="text-white/80 text-xs mb-4 truncate">{book.author}</p>

                                <div className={`h-2 rounded-full overflow-hidden ${themePreset === 'paper-ink' ? 'bg-slate-200' : 'bg-white/20'}`}>
                                    <div className={`h-full rounded-full ${themePreset === 'paper-ink' ? 'bg-slate-900' : 'bg-white'}`} style={{ width: `${getBookProgressPercentage(book)}%` }} />
                                </div>
                                <div className="text-right text-[10px] font-bold mt-1">{getBookProgressPercentage(book)}%</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/50">
                        <EmptyState
                            title={t('dashboard.noBooksReading')}
                            message={t('dashboard.noBooksReadingMessage') || "Pick up a book from your TBR to start reading!"}
                            icon={<Book size={32} className="text-slate-300 dark:text-slate-600" />}
                            actionLabel={t('dashboard.browseLibrary')}
                            actionPath="/library"
                        />
                    </div>
                )}
            </div>

            {/* Next Up */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('dashboard.nextUp')}</h2>
                    <button onClick={() => navigate('/add')} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors px-3 py-2 active:scale-95">
                        {t('dashboard.addBookShort')}
                    </button>
                </div>

                <div className="space-y-2">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-xl" />
                        ))
                    ) : wantToReadBooks.length > 0 ? (
                        wantToReadBooks.slice(0, 3).map(book => (
                            <BookCard key={book.id} book={book} onClick={handleBookClick} variant="next-up" />
                        ))
                    ) : (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                {t('dashboard.noTBR') || "Add some books to your TBR list!"}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
