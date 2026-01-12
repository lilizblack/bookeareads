import React, { useState } from 'react';
import { useBooks } from '../context/BookContext';
import BookCard from '../components/BookCard';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { ArrowDownUp, Loader2 } from 'lucide-react';

const Favorites = () => {
    const { books, loading } = useBooks();
    const navigate = useNavigate();

    const [sortBy, setSortBy] = useState('Recently Added');
    const [showSortMenu, setShowSortMenu] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    const sorts = ['Alphabetical', 'Recently Added', 'Recently Bought'];

    // Filter only favorite books
    let favoriteBooks = books.filter(book => book.isFavorite);

    // Sorting
    favoriteBooks.sort((a, b) => {
        if (sortBy === 'Alphabetical') return a.title.localeCompare(b.title);
        if (sortBy === 'Recently Added') return new Date(b.addedAt) - new Date(a.addedAt);
        if (sortBy === 'Recently Bought') return new Date(b.boughtDate || 0) - new Date(a.boughtDate || 0);
        return 0;
    });

    return (
        <div className="pb-24 pt-2 min-h-screen relative">
            <Header />
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Favorites</h1>
                <div className="relative">
                    <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500"
                    >
                        {sortBy} <ArrowDownUp size={14} />
                    </button>

                    {/* Sort Menu */}
                    {showSortMenu && (
                        <div className="absolute right-0 top-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 p-2 min-w-[160px] z-10">
                            {sorts.map(s => (
                                <button
                                    key={s}
                                    onClick={() => {
                                        setSortBy(s);
                                        setShowSortMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${sortBy === s ? 'bg-violet-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Book Count */}
            <div className="mb-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {favoriteBooks.length} {favoriteBooks.length === 1 ? 'book' : 'books'}
                </p>
            </div>

            {/* Book List */}
            {favoriteBooks.length > 0 ? (
                <div className="space-y-3">
                    {favoriteBooks.map(book => (
                        <BookCard
                            key={book.id}
                            book={book}
                            variant="list"
                            onClick={() => navigate(`/book/${book.id}`)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-slate-400 dark:text-slate-500 mb-4">
                        <svg className="w-24 h-24 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No Favorites Yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                        Mark books as favorites by tapping the heart icon in their details page.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Favorites;
