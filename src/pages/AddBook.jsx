import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../context/BookContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart, ScanBarcode, Upload, Image as ImageIcon, AlertTriangle, Book } from 'lucide-react';
import { GENRES } from '../data/genres';
import BarcodeScanner from '../components/BarcodeScanner';
import SpiceRating from '../components/SpiceRating';
import { generateGenericCover } from '../utils/coverGenerator';
import { getCurrencySymbol } from '../utils/currency';
import ChilliIcon from '../components/ChilliIcon';
import { fetchBookByISBN } from '../utils/bookApi';
import CustomSelect from '../components/CustomSelect';

const AddBook = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addBook, checkDuplicate } = useBooks();
    const [showScanner, setShowScanner] = useState(false);
    const [fetchingCover, setFetchingCover] = useState(false);
    const [coverError, setCoverError] = useState('');
    const [duplicateError, setDuplicateError] = useState(null); // { type: 'Title' | 'ISBN' }
    const [errors, setErrors] = useState({});
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        author: '',
        cover: '',
        status: 'want-to-read',
        isOwned: false,
        price: '',
        boughtDate: '',
        isFavorite: false,
        genres: '',
        format: '', // Changed to empty to force choice
        isWantToBuy: false,
        isbn: '',
        totalPages: '',
        totalChapters: '',
        progress: 0,
        progressMode: 'pages',
        startedAt: '',
        finishedAt: '',
        ownershipStatus: 'kept',
        purchaseLocation: '',
        otherVersions: [],
        hasSpice: false,
        spiceRating: 0,
        language: 'English'
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = t('addBook.form.errorTitle');
        if (!formData.author.trim()) newErrors.author = t('addBook.form.errorAuthor');

        const totalVal = formData.format === 'Audiobook' ? formData.totalChapters : formData.totalPages;
        if (!totalVal || totalVal <= 0) {
            newErrors.pages = formData.format === 'Audiobook' ? t('addBook.form.errorChapters') : t('addBook.form.errorPages');
        }

        if (!formData.genres) newErrors.genres = t('addBook.form.errorGenre');
        if (!formData.format) newErrors.format = t('addBook.form.errorFormat');

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Scroll to top to see error if needed or just let them see the highlights
            return;
        }

        setErrors({});

        // Check for duplicates
        const duplicate = checkDuplicate(formData.title, formData.isbn);
        if (duplicate.exists) {
            setDuplicateError(duplicate);
            return;
        }

        const newBook = {
            ...formData,
            genres: [formData.genres], // Wrap single selection in array for consistency
            cover: formData.cover || generateGenericCover(formData.title, formData.author),
            progressMode: formData.format === 'Audiobook' ? 'chapters' : 'pages',
            otherVersions: formData.otherVersions || [],
            // Ensure dates are set based on status
            startedAt: (formData.status === 'reading' || formData.status === 'read') ? (formData.startedAt || new Date().toISOString()) : null,
            finishedAt: formData.status === 'read' ? (formData.finishedAt || new Date().toISOString()) : null
        };

        addBook(newBook);
        navigate('/');
    };

    const handleScanSuccess = async (decodedText) => {
        setFormData(prev => ({ ...prev, isbn: decodedText }));
        setShowScanner(false);

        // Auto-fetch book data after scanning
        setFetchingCover(true);
        const result = await fetchBookByISBN(decodedText);

        if (result.success) {
            setFormData(prev => ({
                ...prev,
                ...result.data,
                genres: result.data.genres || prev.genres
            }));
            setCoverError('');
        } else {
            setCoverError(result.error);
        }
        setFetchingCover(false);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, cover: reader.result }));
                setCoverError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFetchData = async () => {
        if (!formData.isbn) {
            setCoverError(t('addBook.form.isbnError'));
            return;
        }

        setFetchingCover(true);
        setCoverError('');

        const result = await fetchBookByISBN(formData.isbn);

        if (result.success) {
            setFormData(prev => ({
                ...prev,
                ...result.data,
                // Keep existing genre if API doesn't return one
                genres: result.data.genres || prev.genres
            }));
            setCoverError('');
        } else {
            setCoverError(result.error);
        }

        setFetchingCover(false);
    };

    return (
        <div className="pb-10 pt-2">
            {/* Duplicate Warning Modal */}
            {duplicateError && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in scale-in flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">{t('addBook.form.duplicateTitle')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                            {t('addBook.form.duplicateMessage', { type: duplicateError.type === 'Title' ? t('book.fields.title') : t('book.fields.isbn') })}
                        </p>
                        <button
                            onClick={() => setDuplicateError(null)}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold active:scale-95 transition-transform"
                        >
                            {t('addBook.form.gotIt')}
                        </button>
                    </div>
                </div>
            )}

            {showScanner && (
                <BarcodeScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setShowScanner(false)}
                />
            )}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-800 dark:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('addBook.title')}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Cover Preview with Upload/Fetch Options */}
                <div className="space-y-3">
                    <div className="flex justify-center">
                        <div className="w-32 aspect-[2/3] bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden shadow-md">
                            {formData.cover ? (
                                <img src={formData.cover} alt="Book cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col gap-2 items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50">
                                    <Book size={48} strokeWidth={1.5} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{t('addBook.form.noCover')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-center">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                        >
                            <Upload size={14} />
                            {t('addBook.form.upload')}
                        </button>
                        <button
                            type="button"
                            onClick={handleFetchData}
                            disabled={!formData.isbn || fetchingCover}
                            className="flex items-center gap-1 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ImageIcon size={14} />
                            {fetchingCover ? t('addBook.form.fetching') : t('addBook.form.fetchData')}
                        </button>
                    </div>

                    {coverError && (
                        <p className="text-xs text-red-500 text-center">{coverError}</p>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex justify-between">
                            {t('book.fields.title')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className={`w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-violet-500 transition-shadow dark:text-white ${errors.title ? 'ring-2 ring-red-500' : ''}`}
                            placeholder={t('addBook.form.titlePlaceholder')}
                            value={formData.title}
                            onChange={e => {
                                setFormData({ ...formData, title: e.target.value });
                                if (errors.title) setErrors({ ...errors, title: null });
                            }}
                        />
                        {errors.title && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">{errors.title}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex justify-between">
                            {t('book.fields.author')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className={`w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-violet-500 transition-shadow dark:text-white ${errors.author ? 'ring-2 ring-red-500' : ''}`}
                            placeholder={t('addBook.form.authorPlaceholder')}
                            value={formData.author}
                            onChange={e => {
                                setFormData({ ...formData, author: e.target.value });
                                if (errors.author) setErrors({ ...errors, author: null });
                            }}
                        />
                        {errors.author && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">{errors.author}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{t('book.fields.isbn')}</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-3 pr-12 outline-none focus:ring-2 focus:ring-violet-500 transition-shadow dark:text-white"
                                placeholder={t('addBook.form.isbnPlaceholder')}
                                value={formData.isbn}
                                onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowScanner(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <ScanBarcode size={20} />
                            </button>
                        </div>
                    </div>



                    {/* Conditional: Total Pages (Physical/Ebook) or Total Chapters (Audiobook) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex justify-between">
                            {formData.format === 'Audiobook' ? t('book.fields.chapters') : t('book.fields.pages')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            className={`w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-violet-500 transition-shadow dark:text-white ${errors.pages ? 'ring-2 ring-red-500' : ''}`}
                            placeholder="0"
                            value={formData.format === 'Audiobook' ? formData.totalChapters : formData.totalPages}
                            onChange={e => {
                                const value = parseInt(e.target.value) || '';
                                if (formData.format === 'Audiobook') {
                                    setFormData({ ...formData, totalChapters: value });
                                } else {
                                    setFormData({ ...formData, totalPages: value });
                                }
                                if (errors.pages) setErrors({ ...errors, pages: null });
                            }}
                        />
                        {errors.pages && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">{errors.pages}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex justify-between">
                                {t('book.fields.genres')} <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect
                                value={formData.genres}
                                onChange={e => {
                                    setFormData({ ...formData, genres: e.target.value });
                                    if (errors.genres) setErrors({ ...errors, genres: null });
                                }}
                                options={[
                                    { value: '', label: t('addBook.form.selectGenre'), disabled: true },
                                    ...GENRES.map(genre => ({
                                        value: genre,
                                        label: t(`book.genres.${genre}`, { defaultValue: genre })
                                    }))
                                ]}
                                placeholder={t('addBook.form.selectGenre')}
                                className={errors.genres ? 'ring-2 ring-red-500' : ''}
                            />
                            {errors.genres && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">{errors.genres}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex justify-between">
                                {t('book.fields.status')} <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect
                                value={formData.status}
                                onChange={e => {
                                    const newStatus = e.target.value;
                                    let updates = { status: newStatus };

                                    if (newStatus === 'read') {
                                        const total = formData.format === 'Audiobook' ? formData.totalChapters : formData.totalPages;
                                        if (total) {
                                            updates.progress = total;
                                        }
                                        const today = new Date().toISOString().split('T')[0];
                                        if (!formData.startedAt) updates.startedAt = today;
                                        if (!formData.finishedAt) updates.finishedAt = today;
                                    } else if (newStatus === 'reading') {
                                        const today = new Date().toISOString().split('T')[0];
                                        if (!formData.startedAt) updates.startedAt = today;
                                    } else if (newStatus === 'want-to-read') {
                                        updates.progress = 0;
                                    }

                                    setFormData({ ...formData, ...updates });
                                }}
                                options={[
                                    { value: 'want-to-read', label: t('book.status.wantToRead') },
                                    { value: 'reading', label: t('book.status.reading') },
                                    { value: 'read', label: t('book.status.read') }
                                ]}
                            />
                        </div>
                    </div>

                    {/* Progress Tracking Section */}
                    {(formData.status === 'reading' || formData.status === 'read') && (
                        <div className="space-y-4 animate-fade-in bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {formData.format === 'Audiobook' ? t('addBook.form.currentChapter') : t('addBook.form.currentPage')}
                                </label>
                                <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase">
                                    {t('addBook.form.complete', { percent: Math.round(((formData.progress || 0) / (formData.format === 'Audiobook' ? formData.totalChapters : formData.totalPages || 1)) * 100) })}
                                </span>
                            </div>

                            <input
                                type="number"
                                className="w-full bg-white dark:bg-slate-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-violet-500 transition-shadow dark:text-white"
                                placeholder="0"
                                value={formData.progress || ''}
                                onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                            />

                            {/* visual progress bar */}
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-violet-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, ((formData.progress || 0) / (formData.format === 'Audiobook' ? formData.totalChapters : formData.totalPages || 1)) * 100)}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">{t('addBook.form.dateStarted')}</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white dark:bg-slate-800 rounded-lg p-2 text-xs outline-none dark:text-white"
                                        value={formData.startedAt}
                                        onChange={e => setFormData({ ...formData, startedAt: e.target.value })}
                                    />
                                </div>
                                {formData.status === 'read' && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">{t('addBook.form.dateFinished')}</label>
                                        <input
                                            type="date"
                                            className="w-full bg-white dark:bg-slate-800 rounded-lg p-2 text-xs outline-none dark:text-white"
                                            value={formData.finishedAt}
                                            onChange={e => setFormData({ ...formData, finishedAt: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Type / Format Selector */}
                    <div>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex justify-between">
                            {t('addBook.form.format')} <span className="text-red-500">*</span>
                        </label>
                        <div className={`flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg ${errors.format ? 'ring-2 ring-red-500' : ''}`}>
                            {['Physical', 'Ebook', 'Audiobook'].map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, format: f });
                                        if (errors.format) setErrors({ ...errors, format: null });
                                    }}
                                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${formData.format === f
                                        ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white'
                                        : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    {f === 'Physical' ? t('book.formats.physical') : f === 'Ebook' ? t('book.formats.ebook') : t('book.formats.audiobook')}
                                </button>
                            ))}
                        </div>
                        {errors.format && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">{errors.format}</p>}
                    </div>

                    {/* Language Selector */}
                    <div>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                            {t('book.fields.language')}
                        </label>
                        <CustomSelect
                            value={formData.language}
                            onChange={e => setFormData({ ...formData, language: e.target.value })}
                            options={[
                                { value: 'English', label: t('book.languages.English') },
                                { value: 'Spanish', label: t('book.languages.Spanish') }
                            ]}
                        />
                    </div>

                    {/* Other Versions Question */}
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">{t('addBook.form.otherVersion')}</span>
                        <div className="flex flex-wrap gap-2">
                            {['Audiobook', 'Physical', 'Ebook'].map(version => (
                                <label key={version} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={(formData.otherVersions || []).includes(version)}
                                        onChange={(e) => {
                                            const currentVersions = formData.otherVersions || [];
                                            let newVersions;
                                            if (e.target.checked) {
                                                newVersions = [...currentVersions, version];
                                            } else {
                                                newVersions = currentVersions.filter(v => v !== version);
                                            }
                                            setFormData({ ...formData, otherVersions: newVersions });
                                        }}
                                        className="accent-violet-600"
                                    />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {version === 'Physical' ? t('book.formats.physical') : version === 'Ebook' ? t('book.formats.ebook') : t('book.formats.audiobook')}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Favorite Button (Fixed Position - Start) */}
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isFavorite: !formData.isFavorite })}
                                className={`flex flex-col items-center justify-center gap-1 px-4 rounded-xl border h-20 min-w-[80px] transition-colors ${formData.isFavorite
                                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                                    }`}
                            >
                                <Heart size={20} fill={formData.isFavorite ? "currentColor" : "none"} />
                                <span className="text-xs font-bold">{t('addBook.form.favorite')}</span>
                            </button>

                            {/* 3-Way Ownership Toggle */}
                            <div
                                className={`flex flex-col items-center justify-center gap-2 px-4 rounded-xl border cursor-pointer select-none transition-all h-20 min-w-[140px] ${formData.isOwned
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700'
                                    : formData.isWantToBuy
                                        ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                    }`}
                                onClick={() => {
                                    if (formData.isOwned) {
                                        setFormData({ ...formData, isOwned: false, isWantToBuy: false });
                                    } else if (formData.isWantToBuy) {
                                        setFormData({ ...formData, isOwned: true, isWantToBuy: false });
                                    } else {
                                        setFormData({ ...formData, isOwned: false, isWantToBuy: true });
                                    }
                                }}
                            >
                                <span className={`font-bold text-sm transition-colors ${formData.isOwned
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : formData.isWantToBuy
                                        ? 'text-orange-700 dark:text-orange-400'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {formData.isOwned ? t('book.status.owned') : formData.isWantToBuy ? t('addBook.form.want') : t('addBook.form.interested')}
                                </span>

                                <div className={`w-10 h-5 rounded-full p-1 transition-colors relative shrink-0 ${formData.isOwned
                                    ? 'bg-emerald-500'
                                    : formData.isWantToBuy
                                        ? 'bg-orange-500'
                                        : 'bg-slate-300 dark:bg-slate-600'
                                    }`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 absolute top-1 ${formData.isOwned
                                        ? 'left-[22px]'
                                        : formData.isWantToBuy
                                            ? 'left-[14px]'
                                            : 'left-[4px]'
                                        }`} />
                                </div>
                            </div>

                            {/* Conditional Fields for Owned */}
                            {formData.isOwned && (
                                <>
                                    <div className="flex flex-col justify-center px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-20 animate-fade-in shadow-sm min-w-[120px]">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">{t('book.fields.spent')}</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-bold text-slate-500">{getCurrencySymbol()}</span>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                className="w-16 bg-transparent text-sm font-bold text-emerald-600 dark:text-emerald-400 outline-none"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <input
                                            type="date"
                                            className="w-full bg-transparent text-xs text-slate-400 outline-none"
                                            value={formData.boughtDate}
                                            onChange={e => setFormData({ ...formData, boughtDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col justify-center px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-20 animate-fade-in shadow-sm min-w-[100px]">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold mb-1">Status</span>
                                        <CustomSelect
                                            value={formData.ownershipStatus}
                                            onChange={e => setFormData({ ...formData, ownershipStatus: e.target.value })}
                                            options={[
                                                { value: 'kept', label: t('book.status.owned') },
                                                { value: 'sold', label: t('book.status.sold') }
                                            ]}
                                            className="text-xs"
                                        />
                                    </div>

                                    <div className="flex flex-col justify-center px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-20 animate-fade-in shadow-sm min-w-[100px]">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold mb-1">{t('addBook.form.boughtAt')}</span>
                                        <CustomSelect
                                            value={formData.purchaseLocation}
                                            onChange={e => setFormData({ ...formData, purchaseLocation: e.target.value })}
                                            options={[
                                                { value: '', label: t('app.select') },
                                                { value: 'Online', label: 'Online' },
                                                { value: 'Local Bookstore', label: 'Local Bookstore' }
                                            ]}
                                            placeholder={t('app.select')}
                                            className="text-xs"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Spicy Content Toggle & Rating */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ChilliIcon size={20} className={formData.hasSpice ? "text-red-500" : "text-slate-400"} />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('addBook.form.spicyContent')}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, hasSpice: !formData.hasSpice, spiceRating: !formData.hasSpice ? formData.spiceRating : 0 })}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors relative ${formData.hasSpice ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 absolute top-1 ${formData.hasSpice ? 'left-[26px]' : 'left-[4px]'}`} />
                                </button>
                            </div>

                            {formData.hasSpice && (
                                <div className="flex items-center gap-4 py-2 px-3 bg-white dark:bg-slate-800 rounded-xl border border-red-100 dark:border-red-900/30 animate-fade-in shadow-sm">
                                    <span className="text-[10px] font-black uppercase text-slate-400 min-w-[50px]">{t('addBook.form.intensity')}</span>
                                    <SpiceRating
                                        value={formData.spiceRating}
                                        onChange={v => setFormData({ ...formData, spiceRating: v })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-xl mt-6 active:scale-95 transition-transform"
                >
                    {t('addBook.form.save')}
                </button>
            </form>
        </div>
    );
};

export default AddBook;
