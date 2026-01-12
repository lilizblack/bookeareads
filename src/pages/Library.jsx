import React, { useState, useEffect } from 'react';
import { useBooks } from '../context/BookContext';
import BookCard from '../components/BookCard';
import Header from '../components/Header';
import { useNavigate, useLocation } from 'react-router-dom';
import { Filter, X, ArrowDownUp, Loader2, Trash2, CheckSquare, Square, LayoutGrid, List, Book } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Library = () => {
    const { books, loading, bulkDeleteBooks } = useBooks();
    const navigate = useNavigate();
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

    // useEffect(() => {
    //     if (location.state?.statusFilter) {
    //         setStatusFilter(location.state.statusFilter);
    //         // Clear location state to prevent filter sticking after navigation
    //         navigate(location.pathname, { replace: true, state: {} });
    //     }
    // }, [location.state, navigate, location.pathname]);
    const [formatFilter, setFormatFilter] = useState('All');
    const [viewMode, setViewMode] = useState('list');
    const [sortBy, setSortBy] = useState('Recently Added');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    const statuses = ['All', 'Reading', 'Read', 'Want to Read', 'Paused', 'DNF', 'Owned', 'To Buy', 'Spicy', 'Worst Review'];
    const formats = ['All', 'Physical', 'Ebook', 'Audiobook'];
    const sorts = ['Alphabetical', 'Recently Added', 'Recently Bought'];

    // Filtering & Sorting Logic
    let filteredBooks = books.filter(book => {
        let statusMatch = true;
        if (statusFilter !== 'All') {
            if (statusFilter === 'To Buy') statusMatch = book.toBuy;
            else if (statusFilter === 'Owned') statusMatch = book.isOwned;
            else if (statusFilter === 'Reading') statusMatch = book.status === 'reading';
            else if (statusFilter === 'Read') statusMatch = book.status === 'read';
            else if (statusFilter === 'Want to Read') statusMatch = book.status === 'want-to-read';
            else if (statusFilter === 'Paused') statusMatch = book.status === 'paused';
            else if (statusFilter === 'DNF') statusMatch = book.status === 'dnf';
            else if (statusFilter === 'Spicy') statusMatch = book.hasSpice;
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

    return (
        <div className="pb-24 pt-2 min-h-screen relative">
            <Header />
            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">BookShelf</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400 font-bold uppercase">{filteredBooks.length} {filteredBooks.length === 1 ? 'Book' : 'Books'}</p>
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
                            <span>Mode</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsSelectMode(!isSelectMode);
                                setSelectedIds([]);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${isSelectMode ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                        >
                            {isSelectMode ? <CheckSquare size={14} /> : <Square size={14} />}
                            {isSelectMode ? 'Done' : 'Select'}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                            Filter <Filter size={14} />
                        </button>
                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 my-auto" />
                        <button className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                            {sortBy} <ArrowDownUp size={14} />
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
                                <div className="text-sm font-black">{selectedIds.length} Selected</div>
                                <div className="text-[10px] font-bold opacity-60 uppercase">Bulk Actions</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-4 py-2 text-xs font-bold uppercase opacity-60 hover:opacity-100"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-red-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                            >
                                <Trash2 size={14} /> Delete
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
                title="Delete Books?"
                message={`Are you sure you want to delete ${selectedIds.length} ${selectedIds.length === 1 ? 'book' : 'books'}? This action cannot be undone.`}
                isDangerous={true}
                confirmText="Delete"
            />

            {/* Filter Menu */}
            {filterOpen && (
                <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 animate-fade-in">
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Sort By</span>
                            <div className="flex flex-wrap gap-2">
                                {sorts.map(s => (
                                    <button key={s} onClick={() => setSortBy(s)} className={`px-3 py-1 rounded-full text-xs font-medium border ${sortBy === s ? 'bg-slate-800 text-white' : 'border-slate-200'}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Status</span>
                            <div className="flex flex-wrap gap-2">
                                {statuses.map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium border ${statusFilter === s ? 'bg-violet-600 text-white' : 'border-slate-200'}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Book List */}
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
        </div>
    );
};

export default Library;
