import React, { useState } from 'react';
import { useBooks } from '../context/BookContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, TrendingUp, Award, Clock, PauseCircle, XCircle, AlertTriangle, Trophy, Star, Library, DollarSign, Heart, ArrowLeft } from 'lucide-react';
import ChilliIcon from '../components/ChilliIcon';
import { formatCurrency } from '../utils/currency';
import ChartCard from '../components/ChartCard';

const AnnualReport = () => {
    const { books, getYearlyStats } = useBooks();
    const { themePreset } = useTheme();
    const navigate = useNavigate();
    const [hoveredMonth, setHoveredMonth] = useState(null);

    // Calculate available years from books
    const currentYear = new Date().getFullYear();
    const availableYears = [...new Set(books
        .filter(b => b.finishedAt || b.addedAt)
        .map(b => {
            const date = b.finishedAt ? new Date(b.finishedAt) : new Date(b.addedAt);
            return date.getFullYear();
        })
    )].sort((a, b) => b - a); // Sort descending

    // Add current year if not in list
    if (!availableYears.includes(currentYear)) {
        availableYears.unshift(currentYear);
    }

    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Calculate books read per month for selected year
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthlyData = monthNames.map((month, index) => {
        const count = books.filter(book => {
            if (!book.finishedAt || book.status !== 'read') return false;
            const finishedDate = new Date(book.finishedAt);
            return finishedDate.getFullYear() === selectedYear && finishedDate.getMonth() === index;
        }).length;
        return { month, count, index };
    });

    // Library Growth Stats
    const booksAddedThisYear = books.filter(b => {
        if (!b.addedAt) return false;
        return new Date(b.addedAt).getFullYear() === selectedYear;
    }).length;

    const tbrAddedThisYear = books.filter(b => {
        if (!b.addedAt || b.status !== 'want-to-read') return false;
        return new Date(b.addedAt).getFullYear() === selectedYear;
    }).length;

    const totalTBRRemaining = books.filter(b => b.status === 'want-to-read').length;

    const maxCount = Math.max(...monthlyData.map(d => d.count), 1);

    // Best Month Calculation
    const bestMonth = monthlyData.reduce((max, current) => current.count > max.count ? current : max, { month: '-', count: 0 });

    // Aggregation for Charts
    const readBooks = books.filter(b => {
        if (b.status !== 'read' || !b.finishedAt) return false;
        return new Date(b.finishedAt).getFullYear() === selectedYear;
    });

    // Spicy Books Stats
    const spicyBooksReadThisYear = readBooks.filter(b => b.hasSpice).length;

    // Favorites Added This Year
    const favoritesThisYear = books.filter(b => {
        if (!b.isFavorite || !b.addedAt) return false;
        return new Date(b.addedAt).getFullYear() === selectedYear;
    }).length;

    // Calculate yearly stats for selected year
    const booksReadThisYear = books.filter(b =>
        b.status === 'read' &&
        b.finishedAt &&
        new Date(b.finishedAt).getFullYear() === selectedYear
    );

    const stats = {
        readThisYear: booksReadThisYear.length,
        dnfThisYear: books.filter(b => {
            if (b.status !== 'dnf' || !b.dnfAt) return false;
            return new Date(b.dnfAt).getFullYear() === selectedYear;
        }).length,
        pausedThisYear: books.filter(b => {
            if (b.status !== 'paused' || !b.pausedAt) return false;
            return new Date(b.pausedAt).getFullYear() === selectedYear;
        }).length,
        spent: books.filter(b => {
            // Include books that have a price set
            if (!b.price || parseFloat(b.price) === 0) return false;
            // If boughtDate exists, check if it's in the selected year
            if (b.boughtDate) {
                return new Date(b.boughtDate).getFullYear() === selectedYear;
            }
            // If no boughtDate but has price, include if book was added this year
            if (b.addedAt) {
                return new Date(b.addedAt).getFullYear() === selectedYear;
            }
            return false;
        }).reduce((acc, b) => acc + (parseFloat(b.price) || 0), 0),
        worstBook: booksReadThisYear.filter(b => b.rating > 0).sort((a, b) => a.rating - b.rating)[0]
    };

    // Calculate yearly reading time from logs
    const yearlyTimeRead = books.reduce((total, book) => {
        const logs = book.readingLogs || [];
        const thisYearLogs = logs.filter(l => {
            const date = new Date(l.date);
            return date.getFullYear() === selectedYear;
        });
        const yearTotal = thisYearLogs.reduce((acc, l) => acc + (l.minutesRead || 0), 0);
        return total + yearTotal;
    }, 0);

    const yearlyPagesRead = books.reduce((total, book) => {
        const logs = book.readingLogs || [];
        const thisYearLogs = logs.filter(l => new Date(l.date).getFullYear() === selectedYear);

        if (thisYearLogs.length === 0) return total;

        const maxThisYear = Math.max(...thisYearLogs.map(l => l.pagesRead || 0));
        const prevYearLogs = logs.filter(l => new Date(l.date).getFullYear() < selectedYear);
        const maxBeforeYear = prevYearLogs.length > 0
            ? Math.max(...prevYearLogs.map(l => l.pagesRead || 0))
            : 0;

        return total + Math.max(0, maxThisYear - maxBeforeYear);
    }, 0);

    const formatTime = (minutes) => {
        if (!minutes) return '0m';
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // Genre distribution
    const genreCounts = {};
    readBooks.forEach(b => {
        (b.genres || []).forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
    });
    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    // Format distribution
    const formatCounts = {};
    readBooks.forEach(b => {
        const f = b.format || 'Unknown';
        formatCounts[f] = (formatCounts[f] || 0) + 1;
    });
    const formatData = Object.entries(formatCounts)
        .map(([name, value]) => ({ name, value }));

    // Purchase Location distribution (for owned books)
    const locationCounts = {};
    books.filter(b => {
        if (!b.isOwned || !b.purchaseLocation) return false;
        if (b.boughtDate) {
            return new Date(b.boughtDate).getFullYear() === selectedYear;
        }
        if (b.addedAt) {
            return new Date(b.addedAt).getFullYear() === selectedYear;
        }
        return false;
    }).forEach(b => {
        const loc = b.purchaseLocation;
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const locationData = Object.entries(locationCounts)
        .map(([name, value]) => ({ name, value }));

    return (
        <div className="pb-24 pt-4">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-800 dark:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Annual Report</h1>
            </div>

            <div className="flex items-center gap-2 mb-8">
                <span className="text-xl font-bold text-slate-900 dark:text-white">Year</span>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="text-violet-600 dark:text-violet-400 font-medium bg-transparent border-2 border-violet-200 dark:border-violet-800 rounded-lg px-3 py-1 cursor-pointer hover:border-violet-400 dark:hover:border-violet-600 transition-colors"
                >
                    {availableYears.map(year => (
                        <option key={year} value={year} className="bg-white dark:bg-slate-900">
                            {year}
                        </option>
                    ))}
                </select>
            </div>

            {/* Interactive Monthly Bar Chart */}
            <div className="bg-white dark:bg-slate-900 p-3 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6 overflow-hidden contrast-card">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Books Read Per Month</h3>
                <div className="flex items-end justify-between gap-0.5 sm:gap-2 h-44 sm:h-48 relative">
                    {monthlyData.map((data, i) => {
                        const heightPercent = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
                        const isHovered = hoveredMonth === i;

                        return (
                            <div
                                key={i}
                                className="flex-1 flex flex-col items-center justify-end relative group h-full"
                                onMouseEnter={() => setHoveredMonth(i)}
                                onMouseLeave={() => setHoveredMonth(null)}
                                onClick={() => setHoveredMonth(isHovered ? null : i)}
                            >
                                {/* Tooltip */}
                                {isHovered && (
                                    <div
                                        className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-2 rounded-lg shadow-lg z-10 whitespace-nowrap animate-fade-in pointer-events-none chart-tooltip"
                                        style={themePreset === 'paper-ink' ? { color: '#FFFFFF', backgroundColor: '#333333' } : {}}
                                    >
                                        <div className="text-[10px] sm:text-xs font-bold">{data.month}</div>
                                        <div className="text-xs sm:text-sm font-black">{data.count} {data.count === 1 ? 'book' : 'books'}</div>
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900 dark:border-t-white"
                                            style={themePreset === 'paper-ink' ? { borderTopColor: '#333333' } : {}}
                                        ></div>
                                    </div>
                                )}

                                {/* Bar */}
                                <div
                                    className={`w-full rounded-t sm:rounded-t-lg cursor-pointer transition-all duration-500 chart-bar-fill ${themePreset !== 'paper-ink'
                                        ? (isHovered ? 'bg-red-600' : 'bg-red-500')
                                        : ''
                                        }`}
                                    style={{
                                        height: `${heightPercent}%`,
                                        minHeight: data.count > 0 ? '8px' : '0px',
                                        backgroundColor: themePreset === 'paper-ink'
                                            ? (isHovered ? '#000000' : '#333333')
                                            : undefined
                                    }}
                                />

                                {/* Month Label */}
                                <div className={`text-[9px] sm:text-xs font-bold mt-2 transition-colors ${isHovered
                                    ? 'text-violet-600 dark:text-violet-400'
                                    : 'text-slate-400'
                                    }`}>
                                    {data.month}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 contrast-card">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Time Read</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{formatTime(yearlyTimeRead)}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 contrast-card">
                    <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center text-violet-600 dark:text-violet-400">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pages Read</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{yearlyPagesRead.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 contrast-card">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Money Spent</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{formatCurrency(stats.spent)}</p>
                    </div>
                </div>

                {/* Spicy Books Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 contrast-card">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                        <ChilliIcon size={24} className="fill-current" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Spicy Reads</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{spicyBooksReadThisYear}</p>
                    </div>
                </div>

                {/* Best Month Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 contrast-card">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Best Month</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{bestMonth.month}</p>
                        <p className="text-xs text-slate-500 font-bold">{bestMonth.count} books</p>
                    </div>
                </div>
                {/* Paused Stats Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 contrast-card">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <PauseCircle size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Paused</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.pausedThisYear}</p>
                    </div>
                </div>

                {/* DNF Stats Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 contrast-card">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <XCircle size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">DNF</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.dnfThisYear}</p>
                    </div>
                </div>

                {/* Favorites Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 contrast-card">
                    <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400">
                        <Heart size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Favorites</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{favoritesThisYear}</p>
                    </div>
                </div>
            </div>



            {/* Worst Review Card (Yearly) */}
            {stats.worstBook && stats.worstBook.rating <= 2 && (
                <div
                    onClick={() => navigate('/?maxRating=2')}
                    className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow group col-span-full md:col-span-1 contrast-card"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-16 bg-slate-200 dark:bg-slate-800 rounded bg-cover bg-center shadow-sm" style={{ backgroundImage: `url(${stats.worstBook.cover})` }}></div>
                        <div>
                            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider group-hover:underline">Worst of the Year</h3>
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-1 line-clamp-1">{stats.worstBook.title}</p>
                            <div className="flex items-center gap-1 mt-1 text-red-500">
                                <span className="font-black text-lg">{stats.worstBook.rating}</span>
                                <span className="text-[10px] font-bold opacity-60">Stars</span>
                            </div>
                        </div>
                        <div className="ml-auto text-red-300">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </div>
            )}



            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 col-span-full md:col-span-2 lg:col-span-4 contrast-card">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-amber-500 mb-2"><Star size={24} /></div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">4.5</div>
                        <div className="text-xs text-slate-400">Rating Avg</div>
                    </div>
                    {/* Progress bar visual */}
                    <div className="flex-1 ml-6 space-y-2">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-amber-400 w-3/4 h-full" /></div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-amber-400 w-1/2 h-full" /></div>
                    </div>
                </div>
            </div>

            {/* Library Growth Card */}
            <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl border border-slate-700 dark:border-slate-700 col-span-full text-white shadow-xl shadow-slate-200 dark:shadow-none relative overflow-hidden contrast-card">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Library size={80} />
                </div>
                <div className="relative z-10">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Library Growth {selectedYear}</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-3xl font-black">{booksAddedThisYear}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Added</div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-amber-400">{tbrAddedThisYear}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">TBR Added</div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-emerald-400">{totalTBRRemaining}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">TBR Left</div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Interactive Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                <ChartCard
                    title="Top Genres"
                    data={topGenres}
                    colors={themePreset === 'paper-ink' ? ['#333333', '#555555', '#777777', '#999999', '#BBBBBB'] : ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B']}
                />
                <ChartCard
                    title="Book Formats"
                    data={formatData}
                    colors={themePreset === 'paper-ink' ? ['#333333', '#666666', '#999999', '#CCCCCC', '#EEEEEE'] : ['#6366F1', '#F43F5E', '#84CC16', '#06B6D4', '#D946EF']}
                />
                <ChartCard
                    title="Purchase Locations"
                    data={locationData}
                    colors={themePreset === 'paper-ink' ? ['#333333', '#555555', '#777777', '#999999', '#BBBBBB'] : ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6']}
                />
            </div>
        </div>
    );
};

export default AnnualReport;
