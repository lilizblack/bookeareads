import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../context/BookContext';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Heart,
    ScanBarcode,
    Upload,
    Image as ImageIcon,
    AlertTriangle,
    Book,
    Search,
    User,
    Save,
    Loader2,
    Trash2
} from 'lucide-react';
import { GENRES } from '../data/genres';
import BarcodeScanner from '../components/BarcodeScanner';
import SpiceRating from '../components/SpiceRating';
import { generateGenericCover } from '../utils/coverGenerator';
import { getCurrencySymbol } from '../utils/currency';
import ChilliIcon from '../components/ChilliIcon';
import { fetchBookData } from '../utils/bookApi';
import CustomSelect from '../components/CustomSelect';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import SuccessAnimation from '../components/SuccessAnimation';

const AddBook = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addBook, checkDuplicate } = useBooks();

    // UI State
    const [showScanner, setShowScanner] = useState(false);
    const [fetchingCover, setFetchingCover] = useState(false);
    const [coverError, setCoverError] = useState('');
    const [duplicateError, setDuplicateError] = useState(null);
    const [errors, setErrors] = useState({});
    const [showSuccess, setShowSuccess] = useState(false);
    const fileInputRef = useRef(null);

    // Form State
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
        format: '',
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

    // Handle initial fetch of data
    const handleFetchData = async (query, mode) => {
        if (!query || !query.trim()) {
            setCoverError(mode === 'isbn' ? 'Please enter an ISBN' : 'Please enter a book title');
            return;
        }

        setFetchingCover(true);
        setCoverError('');

        try {
            const result = await fetchBookData(query.trim(), mode);

            if (result.success) {
                const apiData = result.data;
                let matchedGenre = '';

                if (apiData.genres) {
                    const genreMatch = GENRES.find(g =>
                        apiData.genres.toLowerCase().includes(g.toLowerCase()) ||
                        g.toLowerCase().includes(apiData.genres.toLowerCase())
                    );
                    matchedGenre = genreMatch || apiData.genres;
                }

                setFormData(prev => ({
                    ...prev,
                    ...apiData,
                    genres: matchedGenre || prev.genres,
                    // Auto-select Physical if pages found
                    format: prev.format || (apiData.totalPages ? 'Physical' : prev.format)
                }));
                setCoverError('');
            } else {
                setCoverError(result.error);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setCoverError('Failed to fetch book data');
        } finally {
            setFetchingCover(false);
        }
    };

    const handleScanSuccess = (decodedText) => {
        setFormData(prev => ({ ...prev, isbn: decodedText }));
        setShowScanner(false);
        handleFetchData(decodedText, 'isbn');
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

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = t('addBook.form.errorTitle');
        if (!formData.author.trim()) newErrors.author = t('addBook.form.errorAuthor');
        if (!formData.genres) newErrors.genres = t('addBook.form.errorGenre');

        if (formData.status !== 'want-to-read') {
            const totalVal = formData.format === 'Audiobook' ? formData.totalChapters : formData.totalPages;
            if (!totalVal || totalVal <= 0) {
                newErrors.pages = formData.format === 'Audiobook' ? t('addBook.form.errorChapters') : t('addBook.form.errorPages');
            }
            if (!formData.format) newErrors.format = t('addBook.form.errorFormat');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Duplicate check
        const duplicate = checkDuplicate(formData.title, formData.isbn);
        if (duplicate.exists) {
            setDuplicateError(duplicate);
            return;
        }

        const newBook = {
            ...formData,
            genres: [formData.genres],
            cover: formData.cover || generateGenericCover(formData.title, formData.author),
            progressMode: formData.format === 'Audiobook' ? 'chapters' : 'pages',
            updatedAt: new Date().toISOString(),
            // Ensure dates are set based on status
            startedAt: (formData.status === 'reading' || formData.status === 'read') ? (formData.startedAt || new Date().toISOString()) : null,
            finishedAt: formData.status === 'read' ? (formData.finishedAt || new Date().toISOString()) : null
        };

        addBook(newBook);
        setShowSuccess(true);
    };

    const handleSuccessComplete = () => {
        navigate('/');
    };

    // Calculate progress percentage for display
    const totalCount = formData.format === 'Audiobook' ? formData.totalChapters : formData.totalPages;
    const progressPercent = totalCount > 0 ? Math.round(((formData.progress || 0) / totalCount) * 100) : 0;

    return (
        <div className="pb-10 pt-2">
            {showSuccess && (
                <SuccessAnimation
                    message={t('addBook.form.successMessage') || "Book added successfully!"}
                    onComplete={handleSuccessComplete}
                />
            )}

            {/* Duplicate Warning Modal */}
            {duplicateError && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in scale-in flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">{t('addBook.form.duplicateTitle')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                            {t('addBook.form.duplicateMessage', {
                                type: duplicateError.type === 'Title' ? t('book.fields.title') : t('book.fields.isbn')
                            })}
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
                {/* Cover Preview Section */}
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
                        {formData.cover && (
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, cover: '' }))}
                                className="flex items-center gap-1 px-3 py-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                            >
                                <Trash2 size={14} />
                                {t('app.delete') || 'Remove'}
                            </button>
                        )}
                    </div>

                    {coverError && <p className="text-xs text-red-500 text-center">{coverError}</p>}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </div>

                {/* Form Fields Section */}
                <div className="space-y-4">
                    {/* Title Search Group */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <FormInput
                                label={t('book.fields.title')}
                                type="text"
                                placeholder={t('addBook.form.titlePlaceholder')}
                                value={formData.title}
                                helperText={t('addBook.form.searchTip')}
                                onChange={e => {
                                    setFormData({ ...formData, title: e.target.value });
                                    if (errors.title) setErrors({ ...errors, title: null });
                                }}
                                required
                                error={errors.title}
                                icon={Book}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => handleFetchData(formData.title, 'title')}
                            disabled={fetchingCover || !formData.title.trim()}
                            className="p-3.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50 h-[52px] mb-[2px]"
                            title="Search by Title"
                        >
                            {fetchingCover ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                        </button>
                    </div>

                    {/* Author Field */}
                    <FormInput
                        label={t('book.fields.author')}
                        type="text"
                        placeholder={t('addBook.form.authorPlaceholder')}
                        value={formData.author}
                        onChange={e => {
                            setFormData({ ...formData, author: e.target.value });
                            if (errors.author) setErrors({ ...errors, author: null });
                        }}
                        required
                        error={errors.author}
                        icon={User}
                    />

                    {/* ISBN Group */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <FormInput
                                label="ISBN"
                                type="text"
                                placeholder="9780316769174"
                                value={formData.isbn}
                                onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                                icon={ScanBarcode}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors h-[52px] mb-[2px]"
                            title="Scan Barcode"
                        >
                            <ScanBarcode size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFetchData(formData.isbn, 'isbn')}
                            disabled={fetchingCover || !formData.isbn.trim()}
                            className="p-3.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 h-[52px] mb-[2px] shadow-lg shadow-violet-500/20"
                            title="Fetch by ISBN"
                        >
                            {fetchingCover ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                        </button>
                    </div>

                    {/* Pages/Chapters Field */}
                    <FormInput
                        label={formData.format === 'Audiobook' ? t('book.fields.chapters') : t('book.fields.pages')}
                        type="number"
                        placeholder="0"
                        value={formData.format === 'Audiobook' ? formData.totalChapters : formData.totalPages}
                        helperText={t('addBook.form.pagesTip')}
                        onChange={e => {
                            const value = parseInt(e.target.value) || '';
                            if (formData.format === 'Audiobook') {
                                setFormData({ ...formData, totalChapters: value });
                            } else {
                                setFormData({ ...formData, totalPages: value });
                            }
                            if (errors.pages) setErrors({ ...errors, pages: null });
                        }}
                        required={formData.status !== 'want-to-read'}
                        error={errors.pages}
                    />

                    {/* Genre and Status Grid */}
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
                                    })),
                                    ...(formData.genres && !GENRES.includes(formData.genres) ? [{ value: formData.genres, label: formData.genres }] : [])
                                ]}
                                placeholder={t('addBook.form.selectGenre')}
                                className={errors.genres ? 'ring-2 ring-red-500' : ''}
                            />
                            {errors.genres ? (
                                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">{errors.genres}</p>
                            ) : (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{t('addBook.form.genresTip')}</p>
                            )}
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
                                        if (total) updates.progress = total;
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
                                    {t('addBook.form.complete', { percent: progressPercent })}
                                </span>
                            </div>

                            <input
                                type="number"
                                className="w-full bg-white dark:bg-slate-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-violet-500 transition-shadow dark:text-white"
                                placeholder="0"
                                value={formData.progress || ''}
                                onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                            />

                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-violet-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, progressPercent)}%` }}
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

                    {/* Format Selector */}
                    <div>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex justify-between">
                            {t('addBook.form.format')}
                            {formData.status !== 'want-to-read' && <span className="text-red-500">*</span>}
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
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{t('book.fields.language')}</label>
                        <CustomSelect
                            value={formData.language}
                            onChange={e => setFormData({ ...formData, language: e.target.value })}
                            options={[
                                { value: 'English', label: t('book.languages.English') },
                                { value: 'Spanish', label: t('book.languages.Spanish') }
                            ]}
                        />
                    </div>

                    {/* Other Versions Section */}
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">{t('addBook.form.otherVersion')}</span>
                        <div className="flex flex-wrap gap-2">
                            {['Audiobook', 'Physical', 'Ebook'].map(version => (
                                <label key={version} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={(formData.otherVersions || []).includes(version)}
                                        onChange={(e) => {
                                            const current = formData.otherVersions || [];
                                            setFormData({
                                                ...formData,
                                                otherVersions: e.target.checked ? [...current, version] : current.filter(v => v !== version)
                                            });
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

                    {/* Toggles Container */}
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Favorite Toggle */}
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
                                    if (formData.isOwned) setFormData({ ...formData, isOwned: false, isWantToBuy: false });
                                    else if (formData.isWantToBuy) setFormData({ ...formData, isOwned: true, isWantToBuy: false });
                                    else setFormData({ ...formData, isOwned: false, isWantToBuy: true });
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
                                <div className={`w-10 h-5 rounded-full p-1 transition-colors relative shrink-0 ${formData.isOwned ? 'bg-emerald-500' : formData.isWantToBuy ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 absolute top-1 ${formData.isOwned ? 'left-[22px]' : formData.isWantToBuy ? 'left-[14px]' : 'left-[4px]'}`} />
                                </div>
                            </div>

                            {/* Owned Details */}
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
                                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
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

                        {/* Spicy Content Toggle */}
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

                <FormButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    icon={Save}
                    className="w-full mt-6"
                >
                    {t('addBook.form.save')}
                </FormButton>
            </form>
        </div>
    );
};

export default AddBook;
