import React, { useState } from 'react';
import { Heart, Star, StarHalf, Timer } from 'lucide-react';
import ChilliIcon from './ChilliIcon';
import { generateGenericCover } from '../utils/coverGenerator';
import { getCurrencySymbol } from '../utils/currency';
import { getBookProgressPercentage, getSpineColor } from '../utils/bookUtils';
import { useBooks } from '../context/BookContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const BookCard = ({ book, onClick, variant = 'grid', selectable = false, selected = false, onSelect }) => {
    const { activeTimer, startTimer, stopTimer } = useBooks();
    const { t } = useTranslation();
    const isActive = activeTimer?.bookId === book.id;
    const [imgError, setImgError] = useState(false);

    const handleCardClick = (e) => {
        if (selectable) {
            e.stopPropagation();
            onSelect && onSelect(book.id);
        } else {
            onClick && onClick(book);
        }
    };

    const handleTimerClick = (e) => {
        e.stopPropagation();
        if (isActive) {
            window.dispatchEvent(new CustomEvent('stop-timer', { detail: { book } }));
        } else {
            if (book.status === 'reading') {
                startTimer(book.id);
            } else {
                window.dispatchEvent(new CustomEvent('start-reading-request', { detail: { book } }));
            }
        }
    };

    // Variants: 'grid' (standard), 'list' (detailed bookshelf), 'next-up' (horizontal/simple)

    const renderCover = () => {
        if (!book.cover || imgError) {
            return (
                <img
                    src={generateGenericCover(book.title, book.author)}
                    alt={book.title}
                    className="w-full h-full object-cover"
                />
            );
        }
        return (
            <img
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setImgError(true)}
            />
        );
    };

    const percentage = getBookProgressPercentage(book);

    if (variant === 'list') {
        return (
            <div
                onClick={handleCardClick}
                className={`flex gap-4 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border transition-all ${selected
                    ? 'border-violet-500 ring-1 ring-violet-500 bg-violet-50/50 dark:bg-violet-900/10'
                    : 'border-slate-100 dark:border-slate-700'} active:scale-95`}
                style={{
                    border: 'var(--theme-border, initial)'
                }}
            >
                {/* Selection Indicator */}
                {selectable && (
                    <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'bg-violet-600 border-violet-600' : 'border-slate-300 dark:border-slate-600'}`}>
                            {selected && <div className="w-2 h-2 bg-white rounded-full animate-scale-in" />}
                        </div>
                    </div>
                )}
                {/* Cover */}
                <div className="w-20 aspect-[2/3] rounded-md overflow-hidden bg-slate-200 flex-shrink-0 relative">
                    {renderCover()}
                    {(book.hasSpice || book.spiceRating > 0) && (
                        <div className="absolute top-1 right-1 p-1 bg-white/80 dark:bg-black/40 backdrop-blur rounded-full text-orange-600 shadow-sm z-10 animate-scale-in">
                            <ChilliIcon size={10} className="fill-current" />
                        </div>
                    )}
                    {(book.status === 'reading' || book.status === 'want-to-read') && (
                        <button
                            onClick={handleTimerClick}
                            className={`absolute bottom-1 right-1 p-1 rounded-full backdrop-blur-md transition-all z-10 shadow-sm ${isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:scale-110 active:scale-95'
                                }`}
                        >
                            <Timer size={12} className={isActive ? 'animate-spin-slow' : ''} />
                        </button>
                    )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-center">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{book.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{book.author}</p>

                    <div className="space-y-1">
                        {/* Status & Progress */}
                        {book.status === 'reading' && (
                            <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                                {t('book.status.reading')} • {percentage}%
                            </div>
                        )}
                        {book.status === 'read' && (
                            <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
                                {t('book.status.completed')} • 100%
                            </div>
                        )}

                        {/* Tags Row */}
                        <div className="flex gap-1 mb-1">
                            {book.isWantToBuy && (
                                <span className="inline-block text-[10px] px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-bold">
                                    {t('actions.want')}
                                </span>
                            )}
                            {book.status === 'want-to-read' && (
                                <span className="inline-block text-[10px] px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full font-bold">
                                    {t('book.status.wantToRead')}
                                </span>
                            )}
                        </div>

                        {/* Ratings row */}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            {/* Star Rating */}
                            <div className="flex items-center gap-1 text-yellow-400">
                                <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map(i => {
                                        if (book.rating >= i) {
                                            return <Star key={i} size={10} fill="currentColor" />;
                                        } else if (book.rating >= i - 0.5) {
                                            return <StarHalf key={i} size={10} fill="currentColor" />;
                                        } else {
                                            return <Star key={i} size={10} className="text-slate-300" />;
                                        }
                                    })}
                                </div>
                                {book.rating > 0 && (
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 ml-0.5">
                                        {book.rating}
                                    </span>
                                )}
                            </div>
                            {/* Spice Rating */}
                            <div className="flex items-center text-red-500">
                                {[1, 2, 3, 4, 5].map(i => {
                                    const filled = book.spiceRating >= i;
                                    const half = book.spiceRating >= i - 0.5 && book.spiceRating < i;
                                    return (
                                        <ChilliIcon
                                            key={i}
                                            size={10}
                                            fillPercentage={filled ? 100 : half ? 50 : 0}
                                            className={filled || half ? "text-red-500" : "text-slate-300"}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Owned / Sold Tag */}
                        {book.ownershipStatus === 'sold' ? (
                            <span className="inline-block text-[10px] px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-bold">
                                {t('book.status.sold')}
                            </span>
                        ) : book.isOwned && (
                            <span className="inline-block text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-bold">
                                {t('book.status.owned')}
                            </span>
                        )}

                        {/* Genres - Show first one and all formats */}
                        {book.genres?.[0] && (
                            <div className="text-[10px] text-slate-400 mt-1">
                                {book.genres[0]} • {[book.format, ...(book.otherVersions || [])].filter(Boolean).map(f => t(`book.formats.${f.toLowerCase()}`, f)).join(', ')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Next Up Variant (for Dashboard)
    if (variant === 'next-up') {
        return (
            <div
                onClick={() => onClick(book)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
                <div className="w-12 aspect-[2/3] rounded bg-slate-200 overflow-hidden flex-shrink-0">
                    {renderCover()}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{book.title}</h4>
                    <p className="text-xs text-slate-500 truncate mb-1">{book.author}</p>
                    {/* Genre Tag */}
                    {book.genres?.[0] && (
                        <span className="inline-block text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium">
                            {book.genres[0]}
                        </span>
                    )}
                </div>
                {/* Add/Plus Button visual */}
                <div className="text-slate-300">
                    {/* Visual cue only */}
                </div>
            </div>
        );
    }

    // Square Grid Variant (1:1 aspect ratio)
    if (variant === 'square') {
        return (
            <div
                className={`relative group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 w-full border ${selected ? 'border-violet-500 ring-1 ring-violet-500' : 'border-transparent'}`}
                style={{
                    border: 'var(--theme-border, initial)'
                }}
                onClick={handleCardClick}
            >
                {selectable && (
                    <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'bg-violet-600 border-violet-600' : 'border-slate-300 dark:border-slate-600'}`}>
                            {selected && <div className="w-1.5 h-1.5 bg-white rounded-full animate-scale-in" />}
                        </div>
                    </div>
                )}
                <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                    {renderCover()}
                    {/* Overlays */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
                        {book.format && (
                            <div className="px-1.5 py-0.5 bg-white/80 dark:bg-black/40 backdrop-blur rounded text-[8px] font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                                {t(`book.formats.${book.format.toLowerCase()}`, book.format)}
                            </div>
                        )}
                        {book.otherVersions?.map(ver => (
                            <div key={ver} className="px-1.5 py-0.5 bg-white/80 dark:bg-black/40 backdrop-blur rounded text-[8px] font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                                {t(`book.formats.${ver.toLowerCase()}`, ver)}
                            </div>
                        ))}
                    </div>

                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                        {book.isFavorite && (
                            <div className="p-1.5 bg-white/80 dark:bg-black/40 backdrop-blur rounded-full text-red-500 shadow-sm z-10">
                                <Heart size={12} fill="currentColor" />
                            </div>
                        )}
                        {(book.hasSpice || book.spiceRating > 0) && (
                            <div className="p-1.5 bg-white/80 dark:bg-black/40 backdrop-blur rounded-full text-orange-600 shadow-sm z-10 animate-scale-in">
                                <ChilliIcon size={12} className="fill-current" />
                            </div>
                        )}
                        {(book.status === 'reading' || book.status === 'want-to-read') && (
                            <button
                                onClick={handleTimerClick}
                                className={`p-1.5 rounded-full backdrop-blur-md transition-all z-10 shadow-sm ${isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:scale-110 active:scale-95'
                                    }`}
                            >
                                <Timer size={12} className={isActive ? 'animate-spin-slow' : ''} />
                            </button>
                        )}
                    </div>

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                    <div className="absolute bottom-2 left-2 right-2 text-white">
                        <h3 className="font-bold text-sm line-clamp-1 text-white shadow-black/50 drop-shadow-md">{book.title}</h3>
                        <p className="text-[10px] text-slate-200 line-clamp-1">{book.author}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Spine Variant
    if (variant === 'spine') {
        const { themePreset } = useTheme();
        const spineColor = getSpineColor(book.title || book.id, themePreset);
        const heightVariation = 160 + (parseInt(String(book.id).slice(-2)) || 50) % 40;
        return (
            // Wrapper to enforce consistent row height for the "shelf" background effect
            <div className="h-[200px] flex items-end border-b-[12px] border-stone-300 dark:border-stone-700 w-[42px]" onClick={handleCardClick}>
                <div
                    className={`relative shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex flex-col items-center py-3 px-1 select-none ${spineColor} ${selected ? 'ring-2 ring-violet-500' : ''}`}
                    style={{
                        height: `${heightVariation}px`,
                        width: '42px',
                        borderRadius: 'var(--radius-spine)',
                        border: 'var(--theme-border, initial)',
                        borderLeft: 'var(--theme-border, 1px solid rgba(255,255,255,0.2))', // Highlight or theme border
                        borderRight: 'var(--theme-border, 2px solid rgba(0,0,0,0.1))', // Shadow or theme border
                    }}
                >
                    {/* Favorite Icon (Top) */}
                    <div className="mb-2 h-3 w-full flex justify-center shrink-0">
                        {book.isFavorite && <Heart size={12} fill="currentColor" className="text-red-600" />}
                    </div>

                    {/* Book Title (Vertical) */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden w-full px-0.5">
                        <h3
                            className="font-bold text-slate-900 text-[10px] leading-tight tracking-tight uppercase whitespace-nowrap"
                            style={{
                                writingMode: 'vertical-rl',
                                textOrientation: 'mixed',
                                transform: 'rotate(180deg)', // Standard for book spines tip-to-bottom
                                maxHeight: '120px',
                                display: 'block'
                            }}
                        >
                            {book.title}
                        </h3>
                    </div>

                    {/* Spice Icon (Bottom) */}
                    {(book.hasSpice || book.spiceRating > 0) && (
                        <div className="mt-2 text-red-600/80 w-full flex justify-center shrink-0">
                            <ChilliIcon size={10} className="fill-current" />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default Grid Variant - Mobile-First, Touch-Optimized
    return (
        <div
            className={`relative group bg-white dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-base cursor-pointer no-select touch-feedback ${selected
                ? 'shadow-violet ring-2 ring-violet-500'
                : 'shadow-soft-md hover:shadow-soft-xl hover:-translate-y-1'
                }`}
            onClick={handleCardClick}
            style={{
                willChange: 'transform, box-shadow',
            }}
        >
            {selectable && (
                <div className="absolute top-2 left-2 z-10 min-w-touch min-h-touch flex items-center justify-center">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-base ${selected ? 'bg-violet-600 border-violet-600 scale-110' : 'border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90'
                        }`}>
                        {selected && <div className="w-2 h-2 bg-white rounded-full animate-scale-in" />}
                    </div>
                </div>
            )}

            {/* Book Cover */}
            <div className="aspect-[2/3] relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                {renderCover()}

                {/* Top Right Icons */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                    {book.isFavorite && (
                        <div className="p-1.5 bg-white/90 dark:bg-black/50 backdrop-blur-sm rounded-full text-red-500 shadow-soft-md z-10 animate-scale-in">
                            <Heart size={14} fill="currentColor" />
                        </div>
                    )}
                    {(book.hasSpice || book.spiceRating > 0) && (
                        <div className="p-1.5 bg-white/90 dark:bg-black/50 backdrop-blur-sm rounded-full text-orange-600 shadow-soft-md z-10 animate-scale-in">
                            <ChilliIcon size={14} className="fill-current" />
                        </div>
                    )}
                </div>

                {/* Top Left Format Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    {book.ownershipStatus === 'sold' && (
                        <div className="px-2 py-1 bg-red-100/95 dark:bg-red-900/95 backdrop-blur-sm rounded-md text-[10px] font-semibold text-red-700 dark:text-red-300 shadow-soft-sm">
                            {t('book.status.sold')}
                        </div>
                    )}
                    {book.format && (
                        <div className="px-2 py-1 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 shadow-soft-sm">
                            {t(`book.formats.${book.format.toLowerCase()}`, book.format)}
                        </div>
                    )}
                    {book.otherVersions?.map(ver => (
                        <div key={ver} className="px-2 py-1 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 shadow-soft-sm">
                            {t(`book.formats.${ver.toLowerCase()}`, ver)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Book Details */}
            <div className="p-3">
                <h3 className="font-content font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1 leading-tight">
                    {book.title}
                </h3>
                <p className="font-ui text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                    {book.author}
                </p>

                {/* Star Rating */}
                {(book.rating > 0) && (
                    <div className="flex items-center gap-1 text-yellow-400 mb-2">
                        <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(i => {
                                if (book.rating >= i) {
                                    return <Star key={i} size={12} fill="currentColor" />;
                                } else if (book.rating >= i - 0.5) {
                                    return <StarHalf key={i} size={12} fill="currentColor" />;
                                } else {
                                    return <Star key={i} size={12} className="text-slate-200 dark:text-slate-700" />;
                                }
                            })}
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {book.rating}
                        </span>
                    </div>
                )}

                {/* Reading Progress */}
                {book.status === 'reading' && (
                    <div className="mt-2 space-y-1.5">
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-slow bg-gradient-to-r from-violet-500 to-violet-400"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <div className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                            {t('book.status.reading')} • {percentage}%
                        </div>
                    </div>
                )}

                {book.status === 'read' && (
                    <div className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        {t('book.status.completed')}
                    </div>
                )}

                {book.status === 'want-to-read' && (
                    <div className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        {t('book.status.wantToRead')}
                    </div>
                )}
            </div>

            {/* Timer Button - Touch-Optimized */}
            {(book.status === 'reading' || book.status === 'want-to-read') && (
                <button
                    onClick={handleTimerClick}
                    className={`absolute bottom-3 right-3 min-w-touch-comfortable min-h-touch-comfortable flex items-center justify-center rounded-full backdrop-blur-md transition-all duration-base z-10 shadow-soft-lg active:scale-95 ${isActive
                        ? 'bg-red-500 text-white animate-pulse shadow-rose'
                        : 'bg-white/95 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 hover:scale-110 hover:shadow-soft-xl'
                        }`}
                >
                    <Timer size={18} className={isActive ? 'animate-spin-slow' : ''} />
                </button>
            )}
        </div>
    );
};

export default BookCard;
