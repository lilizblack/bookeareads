import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBooks } from '../context/BookContext';
import { format, parseISO } from 'date-fns';
import Rating from '../components/Rating';
import SpiceRating from '../components/SpiceRating';
import { ArrowLeft, Heart, Notebook, Pencil, Upload, Image as ImageIcon, Save, X as CloseIcon, ScanBarcode, AlertTriangle } from 'lucide-react';
import { GENRES } from '../data/genres';
import BarcodeScanner from '../components/BarcodeScanner';
import CoverImage from '../components/CoverImage';
import { getCurrencySymbol } from '../utils/currency';

const BookDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { books, updateBook, deleteBook, checkDuplicate, logReading } = useBooks();

    const [book, setBook] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [fetchingCover, setFetchingCover] = useState(false);
    const [coverError, setCoverError] = useState('');
    const [duplicateError, setDuplicateError] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [tempStatus, setTempStatus] = useState(null); // To store status while modal is open
    const [manualDate, setManualDate] = useState('');
    const [showDateInput, setShowDateInput] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [newProgress, setNewProgress] = useState(0);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const found = books.find(b => b.id === id);
        if (found) {
            setBook(found);
            setEditData(found);
        }
        else navigate('/');
    }, [id, books, navigate]);

    if (!book) return null;

    const handleEditToggle = () => {
        setEditData({ ...book });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditData({ ...book });
        setIsEditing(false);
        setCoverError('');
        setDuplicateError(null);
    };

    const handleSave = () => {
        // Check for duplicates (excluding current book)
        const duplicate = checkDuplicate(editData.title, editData.isbn, book.id);
        if (duplicate.exists) {
            setDuplicateError(duplicate);
            return;
        }

        updateBook(book.id, editData);
        setIsEditing(false);
    };

    const handleChange = (field, value) => {
        if (isEditing) {
            setEditData(prev => ({ ...prev, [field]: value }));
        } else {
            // Intercept "Reading" status change
            if (field === 'status' && value === 'reading' && book.status !== 'reading') {
                setTempStatus(value);
                setShowStartModal(true);
                return;
            }

            const updates = { [field]: value };

            // Auto-fill progress when status changes to "Read"
            if (field === 'status' && value === 'read') {
                if (book.totalPages) {
                    updates.progress = book.totalPages;
                } else if (book.totalChapters) {
                    updates.progress = book.totalChapters;
                }
            }
            updateBook(book.id, updates);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditData(prev => ({ ...prev, cover: reader.result }));
                setCoverError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFetchData = async () => {
        const isbnToUse = editData?.isbn || book?.isbn;
        if (!isbnToUse) {
            setCoverError('Please enter an ISBN first');
            return;
        }

        setFetchingCover(true);
        setCoverError('');

        try {
            // 1. Fetch Metadata (Title, Author, Pages)
            const metadataResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbnToUse}&format=json&jscmd=data`);
            const metadata = await metadataResponse.json();
            const bookInfo = metadata[`ISBN:${isbnToUse}`];

            if (bookInfo) {
                setEditData(prev => ({
                    ...prev,
                    title: bookInfo.title || prev.title,
                    author: bookInfo.authors?.[0]?.name || prev.author,
                    totalPages: bookInfo.number_of_pages || prev.totalPages
                }));

                // 2. Fetch High-Res Cover
                const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbnToUse}-L.jpg`;
                const img = new Image();
                img.onload = () => {
                    setEditData(prev => ({ ...prev, cover: coverUrl }));
                    setFetchingCover(false);
                };
                img.onerror = () => {
                    // Fallback to metadata cover if direct high-res fails
                    if (bookInfo.cover?.large) {
                        setEditData(prev => ({ ...prev, cover: bookInfo.cover.large }));
                    } else {
                        setCoverError('High-res cover not found, but metadata updated.');
                    }
                    setFetchingCover(false);
                };
                img.src = coverUrl;
            } else {
                setCoverError('No book found for this ISBN');
                setFetchingCover(false);
            }
        } catch (error) {
            setCoverError('Failed to fetch book data');
            setFetchingCover(false);
        }
    };

    const handleScanSuccess = (decodedText) => {
        setEditData(prev => ({ ...prev, isbn: decodedText }));
        setShowScanner(false);
    };

    const handleStartConfirm = (mode) => {
        if (mode === 'now') {
            updateBook(book.id, { status: 'reading', startedAt: new Date().toISOString() });
            setShowStartModal(false);
        } else if (mode === 'manual_input') {
            setShowDateInput(true);
        } else if (mode === 'manual_save') {
            if (manualDate) {
                updateBook(book.id, { status: 'reading', startedAt: new Date(manualDate).toISOString() });
                setShowStartModal(false);
                setShowDateInput(false);
                setManualDate('');
            }
        }
    };

    // Always calculate percentage from actual pages/chapters read
    const getPercentage = () => {
        const currentProgress = book.progress || 0;
        // Primary: Use totalPages if available
        if (book.totalPages > 0) {
            return Math.round((currentProgress / book.totalPages) * 100);
        }
        // Fallback: Use totalChapters
        if (book.totalChapters > 0) {
            return Math.round((currentProgress / book.totalChapters) * 100);
        }
        // If no totals set, assume progress is a percentage
        return Math.min(currentProgress, 100);
    };

    // Get the label text for the bookmark based on progressMode
    const getBookmarkLabel = () => {
        if (book.progressMode === 'chapters') {
            return `Ch ${book.progress || 0}`;
        } else if (book.progressMode === 'pages') {
            return `${book.progress || 0}p`;
        } else {
            return `${getPercentage()}%`;
        }
    };

    return (
        <div className="pb-8 pt-4">
            {/* Duplicate Warning Modal */}
            {duplicateError && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in scale-in flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">Duplicate Detected</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                            Another book already uses this {duplicateError.type === 'Title' ? 'title' : 'ISBN'}. Please ensure all entries are unique.
                        </p>
                        <button
                            onClick={() => setDuplicateError(null)}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold active:scale-95 transition-transform"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Start Reading Modal */}
            {showStartModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in scale-in flex flex-col items-center text-center">
                        <h3 className="text-xl font-bold dark:text-white mb-2">Start Reading?</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                            Do you want to set the start date to today?
                        </p>

                        {!showDateInput ? (
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => handleStartConfirm('now')}
                                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold active:scale-95 transition-transform"
                                >
                                    Yes, Start Now
                                </button>
                                <button
                                    onClick={() => handleStartConfirm('manual_input')}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold active:scale-95 transition-transform"
                                >
                                    Set Manual
                                </button>
                            </div>
                        ) : (
                            <div className="w-full space-y-4">
                                <input
                                    type="date"
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl outline-none dark:text-white"
                                    value={manualDate}
                                    onChange={(e) => setManualDate(e.target.value)}
                                />
                                <button
                                    onClick={() => handleStartConfirm('manual_save')}
                                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold active:scale-95 transition-transform"
                                >
                                    Confirm Date
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => { setShowStartModal(false); setShowDateInput(false); }}
                            className="mt-4 text-slate-400 text-xs font-bold hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Activity History Modal */}
            {showActivityModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm max-h-[80vh] rounded-3xl p-6 shadow-2xl animate-fade-in scale-in flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h3 className="text-xl font-bold dark:text-white">Reading Activity</h3>
                            <button onClick={() => setShowActivityModal(false)} className="text-slate-400 hover:text-slate-600">
                                <CloseIcon size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {book.readingLogs && book.readingLogs.length > 0 ? (
                                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6 my-2">
                                    {[...book.readingLogs].sort((a, b) => new Date(b.date) - new Date(a.date)).map((log, index) => (
                                        <div key={index} className="relative pl-6">
                                            {/* Dot */}
                                            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500"></div>

                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-400 uppercase">
                                                    {format(parseISO(log.date), 'MMMM d, yyyy')}
                                                </span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {log.pagesRead} {book.progressMode === 'chapters' ? 'Chapters' : 'Pages'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <p>No activity recorded yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}



            {/* Log Progress Modal */}
            {
                showLogModal && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-fade-in scale-in flex flex-col relative overflow-hidden">
                            {/* Background Decoration */}
                            <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-violet-400/20 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-6 z-10">
                                <div>
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">Log Progress</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Update your journey</p>
                                </div>
                                <button
                                    onClick={() => setShowLogModal(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                                >
                                    <CloseIcon size={24} />
                                </button>
                            </div>

                            <div className="mb-8 z-10">
                                <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">
                                    New {book.format === 'Audiobook' || book.progressMode === 'chapters' ? 'Chapter' : 'Page'} Number
                                </label>
                                <input
                                    type="number"
                                    className="w-full text-center text-5xl font-bold bg-transparent outline-none border-b-2 border-violet-500 p-2 dark:text-white"
                                    value={newProgress}
                                    onChange={e => setNewProgress(Number(e.target.value))}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={() => {
                                    logReading(book.id, newProgress);
                                    setShowLogModal(false);
                                }}
                                className="w-full py-4 bg-gradient-to-r from-violet-600 to-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/30 active:scale-95 transition-all z-10"
                            >
                                Update Progress
                            </button>
                        </div>
                    </div>
                )
            }

            {
                showScanner && (
                    <BarcodeScanner
                        onScanSuccess={handleScanSuccess}
                        onClose={() => setShowScanner(false)}
                    />
                )
            }
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => navigate(-1)} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center">
                    ← Back
                </button>
                <h1 className="text-xl font-bold dark:text-white">Book Details</h1>
                {isEditing ? (
                    <div className="flex gap-2">
                        <button onClick={handleCancel} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                            <CloseIcon size={16} />
                        </button>
                        <button onClick={handleSave} className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                            <Save size={16} />
                        </button>
                    </div>
                ) : (
                    <button onClick={handleEditToggle} className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                        <Pencil size={16} /> Edit
                    </button>
                )}
            </div>

            {/* Cover and Metadata */}
            <div className="space-y-6 my-6">
                <div className="flex flex-col items-center">
                    <div className="w-48 aspect-[2/3] shadow-lg rounded-lg overflow-hidden bg-slate-200 relative group">
                        <CoverImage
                            src={isEditing ? editData.cover : book.cover}
                            title={isEditing ? editData.title : book.title}
                            author={isEditing ? editData.author : book.author}
                            className="w-full h-full object-cover"
                        />

                        {isEditing && (
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors"
                                >
                                    <Upload size={20} />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </div>

                    {isEditing && (
                        <div className="mt-4 w-full max-w-[200px] space-y-2">
                            <button
                                onClick={handleFetchData}
                                disabled={fetchingCover}
                                className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                            >
                                <ImageIcon size={14} />
                                {fetchingCover ? 'Fetching...' : 'Fetch Book Data'}
                            </button>
                            {coverError && <p className="text-[10px] text-red-500 text-center">{coverError}</p>}
                        </div>
                    )}
                </div>

                <div className="px-4 space-y-2">
                    {isEditing ? (
                        <>
                            <input
                                type="text"
                                value={editData.title}
                                onChange={e => handleChange('title', e.target.value)}
                                className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-center outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Book Title"
                            />
                            <input
                                type="text"
                                value={editData.author}
                                onChange={e => handleChange('author', e.target.value)}
                                className="w-full text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-center outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Author"
                            />
                            <div className="relative">
                                <input
                                    type="text"
                                    value={editData.isbn || ''}
                                    onChange={e => handleChange('isbn', e.target.value)}
                                    className="w-full text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-center outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                    placeholder="ISBN"
                                />
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                                    title="Scan Barcode"
                                >
                                    <ScanBarcode size={16} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center">{book.title}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-center">{book.author}</p>
                            {book.isbn && <p className="text-xs text-slate-400 dark:text-slate-500 text-center">ISBN: {book.isbn}</p>}
                        </>
                    )}
                </div>
            </div>

            <div className="px-4">
                {/* Owned/Favorite/Spent Row */}
                <div className="flex flex-wrap gap-2 mb-6 text-sm items-stretch">
                    {/* Favorite Button (Fixed Position - Start) */}
                    <button
                        onClick={() => handleChange('isFavorite', isEditing ? !editData.isFavorite : !book.isFavorite)}
                        className={`flex flex-col items-center justify-center gap-1 px-2 rounded-xl border h-20 min-w-[60px] shrink-0 transition-colors ${(isEditing ? editData.isFavorite : book.isFavorite)
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                            }`}
                    >
                        <Heart size={20} fill={(isEditing ? editData.isFavorite : book.isFavorite) ? "currentColor" : "none"} />
                        <span className="text-[10px] font-bold">Fav</span>
                    </button>

                    {/* 3-Way Ownership Toggle */}
                    <div
                        className={`flex flex-col items-center justify-center gap-2 px-2 rounded-xl border select-none transition-all h-20 w-[130px] shrink-0 ${(isEditing ? editData.isOwned : book.isOwned)
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700'
                            : (isEditing ? editData.isWantToBuy : book.isWantToBuy)
                                ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            } ${!isEditing && book.isOwned ? 'cursor-default opacity-80' : 'cursor-pointer hover:shadow-md'}`}
                        onClick={() => {
                            // If locked (Owned and NOT editing), prevent toggle
                            if (!isEditing && book.isOwned) return;

                            const current = isEditing ? editData : book;
                            let updates;
                            if (current.isOwned) {
                                updates = { isOwned: false, isWantToBuy: false };
                            } else if (current.isWantToBuy) {
                                updates = { isOwned: true, isWantToBuy: false };
                            } else {
                                updates = { isOwned: false, isWantToBuy: true };
                            }

                            if (isEditing) {
                                setEditData(prev => ({ ...prev, ...updates }));
                            } else {
                                updateBook(book.id, updates);
                            }
                        }}
                    >
                        <span className={`font-bold text-xs transition-colors ${(isEditing ? editData.isOwned : book.isOwned)
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : (isEditing ? editData.isWantToBuy : book.isWantToBuy)
                                ? 'text-orange-700 dark:text-orange-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}>
                            {(isEditing ? editData.isOwned : book.isOwned) ? 'Owned' : (isEditing ? editData.isWantToBuy : book.isWantToBuy) ? 'Want' : 'Interested?'}
                        </span>

                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors relative shrink-0 ${(isEditing ? editData.isOwned : book.isOwned)
                            ? 'bg-emerald-500'
                            : (isEditing ? editData.isWantToBuy : book.isWantToBuy)
                                ? 'bg-orange-500'
                                : 'bg-slate-300 dark:bg-slate-600'
                            }`}>
                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 absolute top-0.5 ${(isEditing ? editData.isOwned : book.isOwned)
                                ? 'left-[18px]'
                                : (isEditing ? editData.isWantToBuy : book.isWantToBuy)
                                    ? 'left-[10px]'
                                    : 'left-[2px]'
                                }`} />
                        </div>
                    </div>

                    {(isEditing ? editData.isOwned : book.isOwned) && (
                        <div className="flex flex-col justify-center px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-20 animate-fade-in shadow-sm min-w-[100px] shrink-0">
                            <span className="text-[10px] uppercase text-slate-400 font-bold mb-0.5 text-center">Spent</span>
                            <div className="flex items-center gap-1 justify-center">
                                <span className="text-sm font-bold text-slate-500">{getCurrencySymbol()}</span>
                                <input
                                    type="number"
                                    value={(isEditing ? editData.price : book.price) || ''}
                                    onChange={e => handleChange('price', parseFloat(e.target.value))}
                                    className="w-14 bg-transparent text-sm font-bold text-emerald-600 dark:text-emerald-400 outline-none text-center"
                                    placeholder="0.00"
                                />
                            </div>
                            <input
                                type="date"
                                value={(isEditing ? editData.boughtDate : book.boughtDate)?.split('T')[0] || ''}
                                onChange={e => handleChange('boughtDate', e.target.value)}
                                className="w-full bg-transparent text-[10px] text-slate-400 outline-none text-center"
                            />
                        </div>
                    )}

                    {(isEditing ? editData.isOwned : book.isOwned) && (
                        <div className="flex flex-col justify-center px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-20 animate-fade-in shadow-sm min-w-[100px] shrink-0">
                            <span className="text-[10px] uppercase text-slate-400 font-bold mb-1 text-center">Status</span>
                            <select
                                value={(isEditing ? editData.ownershipStatus : book.ownershipStatus) || 'kept'}
                                onChange={e => handleChange('ownershipStatus', e.target.value)}
                                className="w-full bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none text-center cursor-pointer"
                            >
                                <option value="kept">Kept Copy</option>
                                <option value="sold">Sold</option>
                            </select>
                        </div>
                    )}

                    {(isEditing ? editData.isOwned : book.isOwned) && (
                        <div className="flex flex-col justify-center px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-20 animate-fade-in shadow-sm min-w-[100px] shrink-0">
                            <span className="text-[10px] uppercase text-slate-400 font-bold mb-1 text-center">Bought At</span>
                            <select
                                value={(isEditing ? editData.purchaseLocation : book.purchaseLocation) || ''}
                                onChange={e => handleChange('purchaseLocation', e.target.value)}
                                className="w-full bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none text-center cursor-pointer"
                            >
                                <option value="" disabled>Select</option>
                                <option value="Online">Online</option>
                                <option value="Local Bookstore">Local Bookstore</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Info Grid (Selectors) */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-6">
                    {/* Genre */}
                    <div className="col-span-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">Genre</span>
                        <div className="relative">
                            <select
                                value={(isEditing ? editData.genres?.[0] : book.genres?.[0]) || ''}
                                onChange={e => handleChange('genres', [e.target.value])}
                                className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none"
                            >
                                <option value="" disabled>Select Genre</option>
                                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                ▼
                            </div>
                        </div>
                    </div>

                    {/* Format/Type Toggles */}
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Format</span>
                        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {['Physical', 'Ebook', 'Audiobook'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleChange('format', type)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${(isEditing ? editData.format : book.format) === type
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Other Versions Question */}
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Do you own another version?</span>
                        <div className="flex flex-wrap gap-2">
                            {['Audiobook', 'Physical', 'Ebook'].map(version => (
                                <label key={version} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={(isEditing ? (editData.otherVersions || []) : (book.otherVersions || [])).includes(version)}
                                        onChange={(e) => {
                                            const currentVersions = isEditing ? (editData.otherVersions || []) : (book.otherVersions || []);
                                            let newVersions;
                                            if (e.target.checked) {
                                                newVersions = [...currentVersions, version];
                                            } else {
                                                newVersions = currentVersions.filter(v => v !== version);
                                            }
                                            handleChange('otherVersions', newVersions);
                                        }}
                                        className="accent-violet-600"
                                    />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{version}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-1">
                        <span className="font-bold text-slate-900 dark:text-white">Status:</span>
                        <select
                            value={isEditing ? editData.status : book.status}
                            onChange={e => handleChange('status', e.target.value)}
                            className="bg-transparent text-right outline-none text-slate-600 dark:text-slate-300"
                        >
                            <option value="reading" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Reading</option>
                            <option value="read" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Read</option>
                            <option value="want-to-read" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">TBR</option>
                            <option value="paused" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Paused</option>
                            <option value="dnf" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">DNF</option>
                        </select>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-1">
                        <span className="font-bold text-slate-900 dark:text-white">Style:</span>
                        <select
                            value={(isEditing ? editData.progressMode : book.progressMode) || 'percent'}
                            onChange={e => handleChange('progressMode', e.target.value)}
                            className="bg-transparent text-right outline-none text-slate-600 dark:text-slate-300"
                        >
                            <option value="percent" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Percent</option>
                            {book.format === 'Audiobook' ? (
                                <option value="chapters" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Chapters</option>
                            ) : (
                                <option value="pages" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Pages</option>
                            )}
                        </select>
                    </div>
                </div>

                {/* Input Grid for Progress */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                        <span className="block font-bold text-slate-900 dark:text-white mb-1">Started:</span>
                        <input
                            type="date"
                            value={(isEditing ? editData.startedAt : book.startedAt)?.split('T')[0] || ''}
                            onChange={e => handleChange('startedAt', e.target.value)}
                            className="bg-transparent border-b border-slate-300 dark:border-slate-700 w-full dark:text-slate-300"
                        />
                    </div>
                    <div>
                        <span className="block font-bold text-slate-900 dark:text-white mb-1">Finished:</span>
                        <input
                            type="date"
                            value={(isEditing ? editData.finishedAt : book.finishedAt)?.split('T')[0] || ''}
                            onChange={e => handleChange('finishedAt', e.target.value)}
                            className="bg-transparent border-b border-slate-300 dark:border-slate-700 w-full dark:text-slate-300"
                        />
                    </div>

                    <div>
                        <span className="block font-bold text-slate-900 dark:text-white mb-1">Read:</span>
                        <input
                            type="number"
                            value={(isEditing ? editData.progress : book.progress) || 0}
                            onChange={e => handleChange('progress', parseInt(e.target.value))}
                            onClick={() => {
                                if (!isEditing) {
                                    setNewProgress(book.progress || 0);
                                    setShowLogModal(true);
                                }
                            }}
                            readOnly={!isEditing}
                            className={`bg-transparent border-b border-slate-300 dark:border-slate-700 w-full dark:text-slate-300 ${!isEditing ? 'cursor-pointer hover:text-blue-500 transition-colors' : ''}`}
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <span className="block font-bold text-slate-900 dark:text-white mb-1">
                            Total {book.format === 'Audiobook' ? 'Chapters' : 'Pages'}:
                        </span>
                        {isEditing ? (
                            <input
                                type="number"
                                value={book.format === 'Audiobook' ? (editData.totalChapters || 0) : (editData.totalPages || 0)}
                                onChange={e => handleChange(book.format === 'Audiobook' ? 'totalChapters' : 'totalPages', parseInt(e.target.value))}
                                className="bg-transparent border-b border-slate-300 dark:border-slate-700 w-full dark:text-slate-300 font-bold text-blue-600 dark:text-blue-400"
                                placeholder="Total"
                            />
                        ) : (
                            <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 w-full py-2 px-1 dark:text-slate-300 text-slate-500">
                                {book.format === 'Audiobook' ? (book.totalChapters || '-') : (book.totalPages || '-')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Non-Editable Sliding Bookmark Progress Bar */}
                <div className="mb-6 mt-4">
                    <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full">
                        {/* Filled Bar */}
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-violet-500 rounded-full transition-all duration-300"
                            style={{ width: `${getPercentage()}%` }}
                        />

                        {/* Sliding Bookmark */}
                        <div
                            className="absolute top-0 transition-all duration-300 z-10"
                            style={{ left: `${getPercentage()}%`, transform: 'translateX(-50%)' }}
                        >
                            <div className="relative -top-3 flex flex-col items-center">
                                {/* Bookmark Body */}
                                <div className="bg-violet-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm shadow-md min-w-[40px] text-center mb-1 whitespace-nowrap">
                                    {getBookmarkLabel()}
                                </div>
                                {/* Triangle arrow */}
                                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-violet-600"></div>
                            </div>
                        </div>
                    </div>
                </div>



                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Description</h3>
                <textarea
                    value={(isEditing ? editData.description : book.description) || ''}
                    onChange={e => handleChange('description', e.target.value)}
                    className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm mb-6 outline-none dark:text-slate-200 resize-none"
                    placeholder="Enter description..."
                />

                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white">Your Review</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold w-16 dark:text-slate-300">Rating:</span>
                        <Rating value={isEditing ? editData.rating : book.rating} onChange={v => handleChange('rating', v)} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold w-16 dark:text-slate-300">Spice:</span>
                        <SpiceRating value={isEditing ? editData.spiceRating : book.spiceRating} onChange={v => handleChange('spiceRating', v)} />

                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Spicy Content?</span>
                            <button
                                onClick={() => handleChange('hasSpice', isEditing ? !editData.hasSpice : !book.hasSpice)}
                                className={`w-10 h-5 rounded-full p-0.5 transition-colors relative ${(isEditing ? editData.hasSpice : book.hasSpice) ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 absolute top-0.5 ${(isEditing ? editData.hasSpice : book.hasSpice) ? 'left-[22px]' : 'left-[2px]'}`} />
                            </button>
                        </div>
                    </div>

                    <textarea
                        value={(isEditing ? editData.review : book.review) || ''}
                        onChange={e => handleChange('review', e.target.value)}
                        className="w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm outline-none resize-none dark:text-slate-200"
                        placeholder="Write your thoughts about the book..."
                    />
                </div>

                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => navigate(`/book/${id}/notes`)} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors px-3 py-2 -ml-3 active:scale-95">
                        See all Notes →
                    </button>
                    <button onClick={() => setShowActivityModal(true)} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors px-3 py-2 -mr-3 active:scale-95">
                        See all Activity →
                    </button>
                </div>

                {!isEditing && (
                    <div className="space-y-4 mt-8">
                        <button className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl shadow-sm active:scale-95 transition-transform" onClick={() => navigate(-1)}>
                            Back to Library
                        </button>
                        <button onClick={() => setShowDeleteModal(true)} className="w-full text-red-500/60 text-sm font-bold">Delete Book</button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in scale-in relative overflow-hidden text-center">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Book?</h3>
                            <p className="text-slate-500 dark:text-slate-400">Are you sure you want to delete this book? This action cannot be undone.</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                            >
                                No, Keep it
                            </button>
                            <button
                                onClick={() => {
                                    deleteBook(book.id);
                                    setShowDeleteModal(false);
                                    navigate('/');
                                }}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/30"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default BookDetails;

