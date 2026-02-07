import React, { useState, useEffect } from 'react';
import { useBooks } from '../context/BookContext';
import BookCard from '../components/BookCard';
import Header from '../components/Header';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, X, ArrowDownUp, Loader2, Trash2, CheckSquare, Square, LayoutGrid, List, Book, Plus } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { BookListSkeleton } from '../components/BookCardSkeleton';
import EmptyState from '../components/EmptyState';
import FormButton from '../components/FormButton';

const Library = () => {
    const { books, loading, bulkDeleteBooks, activeTimer, startTimer, stopTimer, updateBook, logReading } = useBooks();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const location = useLocation();

    // Manual search params to avoid hook issues
    const searchParams = new URLSearchParams(location.search);
    const [filterOpen, setFilterOpen] = useState(false);


    // Selection Mode States
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Filter States
    const [statusFilter, setStatusFilter] = useState('All');
    const [pendingStartBook, setPendingStartBook] = useState(null);
    const [selectedBook, setSelectedBook] = useState(null);
    const [newProgress, setNewProgress] = useState(0);
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    // Handle filter from navigation state (e.g., from Dashboard stats cards)
    useEffect(() => {
        if (location.state?.statusFilter) {
            setStatusFilter(location.state.statusFilter);
            // Clear location state to prevent filter sticking after navigation
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    const [formatFilter, setFormatFilter] = useState('All');
    const [viewMode, setViewMode] = useState('list');
    const [sortBy, setSortBy] = useState('Recently Added');

    useEffect(() => {
        const handleStartReadingRequest = (e) => {
            setPendingStartBook(e.detail.book);
        };
        const handleStopTimerEvent = (e) => {
            const book = e.detail.book;
            if (activeTimer && activeTimer.bookId === book.id) {
                const start = new Date(activeTimer.startTime);
                const now = new Date();
                const diffMs = now - start;
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



    const statuses = ['All', 'Reading', 'Read', 'Want to Read', 'Paused', 'DNF', 'Owned', 'Sold', 'To Buy', 'Spicy', 'Worst Review'];
    const formats = ['All', 'Physical', 'Ebook', 'Audiobook'];
    const sorts = ['Alphabetical', 'Recently Added', 'Recently Bought'];

    // Filtering & Sorting Logic
    let filteredBooks = books.filter(book => {
        let statusMatch = true;
        if (statusFilter !== 'All') {
            if (statusFilter === 'To Buy') statusMatch = book.isWantToBuy;
            else if (statusFilter === 'Owned') statusMatch = book.isOwned;
            else if (statusFilter === 'Sold') statusMatch = book.ownershipStatus === 'sold';
            else if (statusFilter === 'Reading') statusMatch = book.status === 'reading';
            else if (statusFilter === 'Read') statusMatch = book.status === 'read';
            else if (statusFilter === 'Want to Read') statusMatch = book.status === 'want-to-read';
            else if (statusFilter === 'Paused') statusMatch = book.status === 'paused';
            else if (statusFilter === 'DNF') statusMatch = book.status === 'dnf';
            else if (statusFilter === 'Spicy') statusMatch = (book.hasSpice || book.spiceRating > 0);
            else if (statusFilter === 'Worst Review') statusMatch = book.rating > 0 && book.rating <= 2;
        }

        let formatMatch = true;
        if (formatFilter !== 'All') {
            formatMatch = book.format === formatFilter;
        }

        let ratingMatch = true;
        // const maxRatingParam = searchParams.get('maxRating');
        // if (maxRatingParam) {
        //     // "Worst Review" filter: Show rated books <= maxRating
        //     if (book.rating && book.rating > 0) {
        //         ratingMatch = book.rating <= parseFloat(maxRatingParam);
        //     } else {
        //         ratingMatch = false; // Exclude unrated
        //     }
        // }

        return statusMatch && formatMatch && ratingMatch;
    });

    // Sorting
    filteredBooks.sort((a, b) => {
        if (sortBy === 'Alphabetical') return a.title.localeCompare(b.title);
        if (sortBy === 'Recently Added') return new Date(b.addedAt) - new Date(a.addedAt);
        if (sortBy === 'Recently Bought') return new Date(b.boughtDate || 0) - new Date(a.boughtDate || 0);
        return 0;
    });

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        bulkDeleteBooks(selectedIds);
        setSelectedIds([]);
        setIsSelectMode(false);
        setShowDeleteModal(false);
    };

    const confirmStartReading = () => {
        if (pendingStartBook) {
            updateBook(pendingStartBook.id, {
                status: 'reading',
                startedAt: new Date().toISOString()
            });
            startTimer(pendingStartBook.id);
            setPendingStartBook(null);
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

    return (
        <div className="pb-24 pt-2 min-h-screen relative">
            <Header />
            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('library.title')}</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400 font-bold uppercase">{t('library.bookCount', { count: filteredBooks.length })}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}
                            >
                                <List size={14} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}
                            >
                                <LayoutGrid size={14} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => setViewMode('spine')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'spine' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}
                            >
                                <Book size={14} strokeWidth={2.5} />
                            </button>
                        </div>
                        {/* Mobile View Toggle (Simplified) */}
                        <button
                            onClick={() => setViewMode(prev => prev === 'list' ? 'grid' : prev === 'grid' ? 'spine' : 'list')}
                            className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase text-slate-500 dark:text-slate-400"
                        >
                            {viewMode === 'list' ? <LayoutGrid size={14} /> : viewMode === 'grid' ? <List size={14} /> : <Book size={14} />}
                            <span>{t('library.mode')}</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsSelectMode(!isSelectMode);
                                setSelectedIds([]);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${isSelectMode ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                        >
                            {isSelectMode ? <CheckSquare size={14} /> : <Square size={14} />}
                            {isSelectMode ? t('library.done') : t('library.select')}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                            {t('library.filter')} <Filter size={14} />
                        </button>
                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 my-auto" />
                        <button className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                            {sortBy === 'Alphabetical' ? t('library.sort.alphabetical') : sortBy === 'Recently Added' ? t('library.sort.added') : t('library.sort.bought')} <ArrowDownUp size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Selection Toolbar */}
            {isSelectMode && (
                <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
                    <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-violet-500 p-2 rounded-xl">
                                <CheckSquare size={20} className="text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-black">{t('library.selectedCount', { count: selectedIds.length })}</div>
                                <div className="text-[10px] font-bold opacity-60 uppercase">{t('library.bulkActions')}</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-4 py-2 text-xs font-bold uppercase opacity-60 hover:opacity-100"
                            >
                                {t('library.clear')}
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-red-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                            >
                                <Trash2 size={14} /> {t('actions.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title={t('library.confirmDeleteTitle')}
                message={t('library.confirmDeleteMessage', { count: selectedIds.length, item: t('book.fields.title').toLowerCase() })}
                isDangerous={true}
                confirmText={t('actions.delete')}
            />

            {/* Log Progress Modal Overlay */}
            {selectedBook && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-fade-in slide-in-from-bottom flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white">{t('dashboard.modals.logProgress')}</h3>
                            <button onClick={() => setSelectedBook(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        {elapsedMinutes > 0 && (
                            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 text-center animate-fade-in">
                                {t('dashboard.modals.session', { minutes: elapsedMinutes })}
                            </div>
                        )}

                        <div className="mb-8 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block tracking-widest text-center">Current Progress</label>
                            <input
                                type="number"
                                className="w-full text-center text-5xl font-black bg-transparent outline-none p-2 dark:text-white"
                                value={newProgress}
                                onChange={e => setNewProgress(Number(e.target.value))}
                                autoFocus
                            />
                            <div className="text-[10px] font-bold text-slate-400 text-center mt-2">
                                {selectedBook.format === 'Audiobook' || selectedBook.progressMode === 'chapters' ? t('book.fields.chapters').toUpperCase() : t('book.fields.pages').toUpperCase()}
                            </div>
                        </div>

                        <button onClick={saveProgress} className="w-full py-5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-violet-500/20 active:scale-95 transition-all">
                            {t('actions.updateProgress')}
                        </button>
                    </div>
                </div>
            )}

            {/* Start Reading Modal Overlay */}
            {pendingStartBook && (
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

            {/* Filter Menu */}
            {filterOpen && (
                <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 animate-fade-in">
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">{t('library.sortBy')}</span>
                            <div className="flex flex-wrap gap-2">
                                {sorts.map(s => (
                                    <button key={s} onClick={() => setSortBy(s)} className={`px-3 py-1 rounded-full text-xs font-medium border ${sortBy === s ? 'bg-slate-800 text-white' : 'border-slate-200'}`}>
                                        {s === 'Alphabetical' ? t('library.sort.alphabetical') : s === 'Recently Added' ? t('library.sort.added') : t('library.sort.bought')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">{t('book.fields.status')}</span>
                            <div className="flex flex-wrap gap-2">
                                {statuses.map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium border ${statusFilter === s ? 'bg-violet-600 text-white' : 'border-slate-200'}`}>
                                        {s === 'All' ? t('library.all')
                                            : s === 'Reading' ? t('book.status.reading')
                                                : s === 'Read' ? t('book.status.completed')
                                                    : s === 'Want to Read' ? t('book.status.wantToRead')
                                                        : s === 'Paused' ? t('book.status.paused')
                                                            : s === 'DNF' ? t('book.status.dnf')
                                                                : s === 'Owned' ? t('book.status.owned')
                                                                    : s === 'Sold' ? t('book.status.sold')
                                                                        : s === 'Spicy' ? t('book.fields.spicy')
                                                                            : s === 'To Buy' ? t('book.fields.toBuy')
                                                                                : s === 'Worst Review' ? t('book.fields.worstReview')
                                                                                    : s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Book List */}
            {loading ? (
                <div className="px-1">
                    <BookListSkeleton count={6} />
                </div>
            ) : filteredBooks.length > 0 ? (
                <div className={
                    viewMode === 'spine'
                        ? "flex flex-wrap items-end gap-x-0 gap-y-12 px-8 py-12 bg-slate-50 dark:bg-[#1a1a1a] rounded-sm border-[16px] border-white dark:border-[#2a2a2a] shadow-[inset_0_2px_10px_rgba(0,0,0,0.05),0_10px_30px_rgba(0,0,0,0.1)] min-h-[500px]" // Built-in Bookshelf look
                        : viewMode === 'grid'
                            ? "grid grid-cols-2 gap-3"
                            : "space-y-3"
                }>
                    {filteredBooks.map(book => (
                        <BookCard
                            key={book.id}
                            book={book}
                            variant={viewMode === 'spine' ? 'spine' : viewMode === 'grid' ? 'grid' : 'list'}
                            onClick={() => navigate(`/book/${book.id}`)}
                            selectable={isSelectMode}
                            selected={selectedIds.includes(book.id)}
                            onSelect={toggleSelection}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    title={statusFilter === 'All' ? t('library.emptyTitle') : t('library.noResultsTitle')}
                    message={statusFilter === 'All' ? t('library.emptyMessage') : t('library.noResultsMessage')}
                    actionLabel={statusFilter === 'All' ? t('library.addFirst') : null}
                    actionPath="/add"
                />
            )}
        </div>
    );
};

export default Library;
