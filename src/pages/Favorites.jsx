import React, { useState } from 'react';
import { useBooks } from '../context/BookContext';
import BookCard from '../components/BookCard';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { ArrowDownUp, Loader2, Heart, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BookListSkeleton } from '../components/BookCardSkeleton';
import EmptyState from '../components/EmptyState';
import FormButton from '../components/FormButton';

const Favorites = () => {
    const { t } = useTranslation();
    const { books, loading } = useBooks();
    const navigate = useNavigate();

    const [sortBy, setSortBy] = useState('Recently Added');
    const [showSortMenu, setShowSortMenu] = useState(false);



    const sorts = ['Alphabetical', 'Recently Added', 'Recently Bought'];
    const getSortLabel = (s) => {
        if (s === 'Alphabetical') return t('library.sort.alphabetical');
        if (s === 'Recently Added') return t('library.sort.added');
        if (s === 'Recently Bought') return t('library.sort.bought');
        return s;
    };

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
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('favorites.title')}</h1>
                <div className="relative">
                    <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500"
                    >
                        {getSortLabel(sortBy)} <ArrowDownUp size={14} />
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
                                    {getSortLabel(s)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Book Count */}
            <div className="mb-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('library.bookCount', { count: favoriteBooks.length })}
                </p>
            </div>

            {/* Book List */}
            {loading ? (
                <div className="px-1">
                    <BookListSkeleton count={4} />
                </div>
            ) : favoriteBooks.length > 0 ? (
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
                <EmptyState
                    title={t('favorites.noFavorites')}
                    message={t('favorites.noFavoritesDesc')}
                    icon={<Heart size={48} className="text-slate-300 dark:text-slate-600" />}
                    actionLabel={t('favorites.browseLibrary') || t('library.mode')}
                    actionPath="/library"
                />
            )}
        </div>
    );
};

export default Favorites;
