import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isSameDay, differenceInCalendarDays, parseISO } from 'date-fns';
import { db } from '../lib/firebaseClient';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { calculateGlobalSpeed } from '../utils/bookUtils';

const BookContext = createContext();

export const useBooks = () => {
    const context = useContext(BookContext);
    if (!context) {
        throw new Error('useBooks must be used within a BookProvider');
    }
    return context;
};

const INITIAL_BOOKS = [
    {
        id: '1',
        title: 'Fourth Wing',
        author: 'Rebecca Yarros',
        cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1701980900i/198303554.jpg',
        status: 'reading',
        progress: 45,
        totalPages: 528,
        isOwned: true,
        price: 29.99,
        isFavorite: false,
        rating: 0,
        spiceRating: 0,
        genres: ['Fantasy', 'Romance'],
        format: 'Physical',
        addedAt: new Date().toISOString(),
        readingLogs: [] // { date: ISOString, pagesRead: number }
    },
    {
        id: '2',
        title: 'A Court of Thorns and Roses',
        author: 'Sarah J. Maas',
        cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1620324329i/50659467.jpg',
        status: 'read',
        isOwned: true,
        price: 18.00,
        isFavorite: true,
        rating: 5,
        spiceRating: 3,
        review: 'Absolutely loved it! The world building is phenomenal.',
        genres: ['Fantasy', 'Romance', 'Fae'],
        format: 'Paperback',
        addedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        readingLogs: [
            { date: new Date().toISOString(), pagesRead: 50 } // Mock log
        ]
    },
    {
        id: '3',
        title: 'Iron Flame',
        author: 'Rebecca Yarros',
        cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1684817006i/90202214.jpg',
        status: 'want-to-read',
        isOwned: false,
        toBuy: true,
        isFavorite: false,
        rating: 0,
        spiceRating: 0,
        genres: ['Fantasy'],
        format: 'Ebook',
        addedAt: new Date().toISOString()
    }
];

export const BookProvider = ({ children }) => {
    const { user, isOfflineMode } = useAuth();

    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [readingGoal, setReadingGoal] = useState({ yearly: 15, monthly: 2 });
    const [activeTimer, setActiveTimer] = useState(null);
    const [celebrationBook, setCelebrationBook] = useState(null);

    // Load books function - defined early so it can be reused by syncLocalToCloud and importData
    const loadBooks = useCallback(async () => {
        console.log('📚 loadBooks called - user:', user?.uid, 'isOfflineMode:', isOfflineMode);
        setLoading(true);

        try {
            // 1. Authenticated User -> Fetch from Firestore
            if (user) {
                try {
                    const booksRef = collection(db, 'users', user.uid, 'books');
                    const q = query(booksRef, orderBy('addedAt', 'desc'));
                    const snapshot = await getDocs(q);

                    if (!snapshot.empty) {
                        const appBooks = snapshot.docs.map(docSnap => {
                            const data = docSnap.data();
                            // Convert Firestore Timestamps to ISO strings
                            return {
                                id: docSnap.id,
                                ...data,
                                addedAt: data.addedAt?.toDate?.()?.toISOString() || data.addedAt,
                                startedAt: data.startedAt?.toDate?.()?.toISOString() || data.startedAt,
                                finishedAt: data.finishedAt?.toDate?.()?.toISOString() || data.finishedAt,
                                pausedAt: data.pausedAt?.toDate?.()?.toISOString() || data.pausedAt,
                                dnfAt: data.dnfAt?.toDate?.()?.toISOString() || data.dnfAt,
                                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                                readingLogs: data.readingLogs || [],
                                notes: data.notes || [],
                                language: data.language || 'English'
                            };
                        });
                        console.log(`✅ Loaded ${appBooks.length} books from Firestore`);
                        setBooks(appBooks);
                    } else {
                        console.log('📭 No books found in Firestore');
                        setBooks([]);
                    }
                } catch (error) {
                    console.error('❌ Error fetching books from Firestore:', error);
                    console.error('Error details:', JSON.stringify(error, null, 2));
                    // Fallback to localStorage if Firestore fails
                    const savedBooks = localStorage.getItem('book-tracker-data-v3');
                    if (savedBooks) {
                        const parsedBooks = JSON.parse(savedBooks);
                        console.log(`⚠️ Fallback to localStorage: ${parsedBooks.length} books`);
                        setBooks(parsedBooks);
                    }
                }
            }
            // 2. Offline Mode (Logged out but keeping data visible)
            else if (isOfflineMode) {
                const savedBooks = localStorage.getItem('book-tracker-data-v3');
                const savedGoal = localStorage.getItem('reading-goal');
                if (savedBooks) {
                    const parsedBooks = JSON.parse(savedBooks);
                    console.log(`📱 Offline mode: ${parsedBooks.length} books from localStorage`);
                    setBooks(parsedBooks);
                }
                if (savedGoal) {
                    try {
                        const parsed = JSON.parse(savedGoal);
                        setReadingGoal(typeof parsed === 'object' ? parsed : { yearly: 12, monthly: 1 });
                    } catch (e) {
                        // Default handled in useState
                    }
                }
            }
            // 3. Guest / First Load -> Local Storage
            else {
                const savedBooks = localStorage.getItem('book-tracker-data-v3');
                const savedGoal = localStorage.getItem('reading-goal');
                if (savedBooks) {
                    const parsedBooks = JSON.parse(savedBooks);
                    console.log(`👤 Guest mode: ${parsedBooks.length} books from localStorage`);
                    setBooks(parsedBooks);
                }
                if (savedGoal) {
                    try {
                        const parsed = JSON.parse(savedGoal);
                        setReadingGoal(typeof parsed === 'object' ? parsed : { yearly: 12, monthly: 1 });
                    } catch (e) {
                        // Default handled in useState
                    }
                }
            }
        } catch (error) {
            console.error('❌ Critical error in loadBooks:', error);
        } finally {
            setLoading(false);
        }
    }, [user, isOfflineMode]);

    // Initial Load - Fetch from Firestore OR LocalStorage
    useEffect(() => {
        loadBooks();
    }, [user, isOfflineMode]);

    // Save to localStorage for offline access (always persist)
    useEffect(() => {
        localStorage.setItem('book-tracker-data-v3', JSON.stringify(books));
        localStorage.setItem('reading-goal', JSON.stringify(readingGoal));
        if (activeTimer) localStorage.setItem('active-timer', JSON.stringify(activeTimer));
        else localStorage.removeItem('active-timer');
    }, [books, readingGoal, activeTimer]);

    const addBook = async (book) => {
        const newBook = {
            ...book,
            id: Date.now().toString(),
            addedAt: new Date().toISOString(),
            readingLogs: [],
            notes: []
        };
        if (newBook.status === 'read') {
            if (!newBook.finishedAt) {
                newBook.finishedAt = new Date().toISOString();
            }
            if (newBook.totalPages) {
                newBook.progress = newBook.totalPages;
            } else if (newBook.totalChapters) {
                newBook.progress = newBook.totalChapters;
            } else {
                newBook.progress = 100;
            }
        }



        if (user) {
            // Firestore Insert
            const insertData = {
                title: newBook.title,
                author: newBook.author,
                cover: newBook.cover,
                isbn: newBook.isbn || null,
                status: newBook.status || 'want-to-read',
                progress: newBook.progress || 0,
                totalPages: newBook.totalPages || null,
                totalChapters: newBook.totalChapters || null,
                rating: newBook.rating || 0,
                spiceRating: newBook.spiceRating || 0,
                isOwned: newBook.isOwned || false,
                isFavorite: newBook.isFavorite || false,
                toBuy: newBook.toBuy || false,
                price: newBook.price ? parseFloat(newBook.price) : null,
                review: newBook.review || null,
                format: newBook.format || null,
                genres: newBook.genres || [],
                addedAt: Timestamp.fromDate(new Date(newBook.addedAt)),
                startedAt: newBook.startedAt ? Timestamp.fromDate(new Date(newBook.startedAt)) : null,
                finishedAt: newBook.finishedAt ? Timestamp.fromDate(new Date(newBook.finishedAt)) : null,
                pausedAt: null,
                dnfAt: null,
                updatedAt: serverTimestamp(),
                readingLogs: [],
                notes: [],
                language: newBook.language || 'English'
            };

            try {
                const booksRef = collection(db, 'users', user.uid, 'books');
                const docRef = await addDoc(booksRef, insertData);

                // Use the Firestore-generated ID
                newBook.id = docRef.id;
            } catch (error) {
                console.error('Error inserting book to Firestore:', error);
                alert('Failed to save book: ' + error.message);
                return; // Don't add to local state if Firestore insert failed
            }
        }

        setBooks(prev => [...prev, newBook]);
    };

    // Celebration State (Share Modal) - closeCelebration helper
    const closeCelebration = () => setCelebrationBook(null);

    const updateBook = async (id, updates) => {
        // Trigger celebration if marking as read
        if (updates.status === 'read') {
            const currentBook = books.find(b => b.id === id);
            if (currentBook && currentBook.status !== 'read') {
                // Determine completion date/data for the celebration card
                const celebrationData = {
                    ...currentBook,
                    ...updates,
                    // Ensure cover/title/author are present
                };
                setCelebrationBook(celebrationData);
            }
        }

        setBooks(prev => {
            return prev.map(book => {
                if (book.id !== id) return book;
                const updated = { ...book, ...updates };
                if (updates.status === 'read' && book.status !== 'read') {
                    if (!updated.finishedAt) {
                        updated.finishedAt = new Date().toISOString();
                    }
                    if (updated.totalPages) {
                        updated.progress = updated.totalPages;
                    } else if (updated.totalChapters) {
                        updated.progress = updated.totalChapters;
                    } else {
                        updated.progress = 100;
                    }
                }
                if (updates.status === 'paused' && book.status !== 'paused') {
                    updated.pausedAt = new Date().toISOString();
                }
                if (updates.status === 'dnf' && book.status !== 'dnf') {
                    updated.dnfAt = new Date().toISOString();
                }
                if (user) {
                    const bookRef = doc(db, 'users', user.uid, 'books', id);
                    updateDoc(bookRef, {
                        status: updated.status,
                        progress: updated.progress,
                        rating: updated.rating,
                        spiceRating: updated.spiceRating,
                        isFavorite: updated.isFavorite,
                        isOwned: updated.isOwned,
                        finishedAt: updated.finishedAt ? Timestamp.fromDate(new Date(updated.finishedAt)) : null,
                        pausedAt: updated.pausedAt ? Timestamp.fromDate(new Date(updated.pausedAt)) : null,
                        dnfAt: updated.dnfAt ? Timestamp.fromDate(new Date(updated.dnfAt)) : null,
                        review: updated.review,
                        cover: updated.cover,
                        title: updated.title,
                        author: updated.author,
                        updatedAt: serverTimestamp(),
                        language: updated.language || 'English'
                    }).catch((error) => {
                        console.error('Firestore update failed:', error);
                    });
                }
                return updated;
            });
        });
    };

    const deleteBook = async (id) => {
        if (user) {
            try {
                const bookRef = doc(db, 'users', user.uid, 'books', id);
                await deleteDoc(bookRef);
            } catch (error) {
                console.error('Firestore delete failed:', error);
            }
        }
        setBooks(prev => prev.filter(book => book.id !== id));
    };

    const bulkDeleteBooks = async (ids) => {
        if (user) {
            try {
                // Firestore doesn't have bulk delete in one query, so we delete individually
                const deletePromises = ids.map(id => {
                    const bookRef = doc(db, 'users', user.uid, 'books', id);
                    return deleteDoc(bookRef);
                });
                await Promise.all(deletePromises);
            } catch (error) {
                console.error('Firestore bulk delete failed:', error);
            }
        }
        setBooks(prev => prev.filter(book => !ids.includes(book.id)));
    };

    // V3 Logic: Log Reading for Streak
    const logReading = async (bookId, pagesRead) => {
        // Check for completion via progress logging
        const currentBook = books.find(b => b.id === bookId);
        if (currentBook) {
            const target = currentBook.totalPages || currentBook.totalChapters || 100;
            if (pagesRead >= target && currentBook.status === 'reading') {
                // Auto-finish logic could go here, but usually we let the user explicitly finish.
                // However, if we do updateBook to 'read', it will trigger celebration.
                // For now, assume explicit status change or separate flow for log-completion.
            }
        }

        setBooks(prev => prev.map(book => {
            if (book.id !== bookId) return book;

            const today = new Date().toISOString();
            const existingLogIndex = book.readingLogs?.findIndex(log => isSameDay(parseISO(log.date), new Date()));

            let newLogs = [...(book.readingLogs || [])];

            if (existingLogIndex >= 0) {
                newLogs[existingLogIndex] = { ...newLogs[existingLogIndex], pagesRead: pagesRead };
            } else {
                newLogs.push({ date: today, pagesRead });
            }

            // If completed via pages
            const updatedBook = { ...book, readingLogs: newLogs, progress: pagesRead };

            return updatedBook;
        }));
    };

    const startTimer = (bookId) => {
        setActiveTimer({
            bookId,
            startTime: new Date().toISOString()
        });
    };

    const stopTimer = async (bookId, minutesSpent, sessionProgress = 0) => {
        const endTime = new Date();
        const startTime = activeTimer ? new Date(activeTimer.startTime) : endTime;

        // Create reading session in Supabase if user is logged in
        if (user && activeTimer) {
            await createReadingSession(
                bookId,
                Math.round(minutesSpent),
                sessionProgress,
                startTime.toISOString(),
                endTime.toISOString()
            );
        }

        setBooks(prev => prev.map(book => {
            if (book.id !== bookId) return book;

            const today = new Date().toISOString();
            const existingLogIndex = (book.readingLogs || []).findIndex(log => isSameDay(parseISO(log.date), new Date()));

            let newLogs = [...(book.readingLogs || [])];

            if (existingLogIndex >= 0) {
                newLogs[existingLogIndex] = {
                    ...newLogs[existingLogIndex],
                    minutesRead: (newLogs[existingLogIndex].minutesRead || 0) + minutesSpent,
                    pagesRead: Math.max(newLogs[existingLogIndex].pagesRead || 0, (book.progress || 0) + sessionProgress)
                };
            } else {
                newLogs.push({
                    date: today,
                    minutesRead: minutesSpent,
                    pagesRead: (book.progress || 0) + sessionProgress
                });
            }

            return {
                ...book,
                totalTimeRead: (book.totalTimeRead || 0) + minutesSpent,
                totalTimedProgress: (book.totalTimedProgress || 0) + sessionProgress,
                readingLogs: newLogs,
                progress: Math.max(book.progress || 0, (book.progress || 0) + sessionProgress)
            };
        }));
        setActiveTimer(null);
    };

    const addNote = async (bookId, noteContent) => {
        setBooks(prev => prev.map(book => {
            if (book.id !== bookId) return book;
            const note = { id: Date.now(), content: noteContent, date: new Date().toISOString() };
            return { ...book, notes: [...(book.notes || []), note] };
        }));
    };

    const deleteNote = async (bookId, noteId) => {
        setBooks(prev => prev.map(book => {
            if (book.id !== bookId) return book;
            return {
                ...book,
                notes: (book.notes || []).filter(note => note.id !== noteId)
            };
        }));
    };

    const syncLocalToCloud = async () => {
        console.log('🔄 syncLocalToCloud called');

        if (!user) {
            console.log('❌ No user logged in');
            return { success: false, message: 'Please log in to sync to cloud' };
        }

        try {
            console.log('📡 Fetching existing books from Firestore...');
            // First, fetch existing books from Firestore
            const booksRef = collection(db, 'users', user.uid, 'books');
            const snapshot = await getDocs(booksRef);
            const existingBooks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`📚 Found ${existingBooks.length} existing books in Firestore`);

            // Get local books from state (only those with numeric IDs = not from Firestore)
            const localBooks = books.filter(book => {
                // Firestore IDs are alphanumeric strings, local IDs are numeric timestamps
                return /^\d+$/.test(book.id);
            });
            console.log(`💾 Found ${localBooks.length} local books to potentially sync`);

            if (localBooks.length === 0) {
                console.log('✅ No local data to sync');
                return { success: true, message: 'No local data to sync' };
            }

            let syncedCount = 0;
            let skippedCount = 0;
            const errors = [];

            // Sync each local book to Firestore (with duplicate checking)
            for (const book of localBooks) {
                try {
                    // Check if book already exists in Firestore by ISBN or title
                    const isDuplicate = existingBooks.some(existingBook => {
                        // Check by ISBN if both have ISBN
                        if (book.isbn && existingBook.isbn && book.isbn === existingBook.isbn) {
                            console.log(`🔍 Duplicate found by ISBN: ${book.title} (${book.isbn})`);
                            return true;
                        }
                        // Check by exact title match (case-insensitive)
                        if (book.title && existingBook.title &&
                            book.title.toLowerCase().trim() === existingBook.title.toLowerCase().trim()) {
                            console.log(`🔍 Duplicate found by title: ${book.title}`);
                            return true;
                        }
                        return false;
                    });

                    if (isDuplicate) {
                        console.log(`⏭️ Skipping duplicate book: ${book.title}`);
                        skippedCount++;
                        continue;
                    }

                    console.log(`➕ Syncing new book: ${book.title}`);
                    const insertData = {
                        title: book.title,
                        author: book.author,
                        cover: book.cover,
                        isbn: book.isbn || null,
                        status: book.status || 'want-to-read',
                        progress: book.progress || 0,
                        totalPages: book.totalPages || null,
                        totalChapters: book.totalChapters || null,
                        rating: book.rating || 0,
                        spiceRating: book.spiceRating || 0,
                        isOwned: book.isOwned || false,
                        isFavorite: book.isFavorite || false,
                        toBuy: book.toBuy || false,
                        price: book.price ? parseFloat(book.price) : null,
                        review: book.review || null,
                        format: book.format || null,
                        genres: book.genres || [],
                        addedAt: Timestamp.fromDate(new Date(book.addedAt || Date.now())),
                        startedAt: book.startedAt ? Timestamp.fromDate(new Date(book.startedAt)) : null,
                        finishedAt: book.finishedAt ? Timestamp.fromDate(new Date(book.finishedAt)) : null,
                        pausedAt: book.pausedAt ? Timestamp.fromDate(new Date(book.pausedAt)) : null,
                        dnfAt: book.dnfAt ? Timestamp.fromDate(new Date(book.dnfAt)) : null,
                        updatedAt: serverTimestamp(),
                        readingLogs: book.readingLogs || [],
                        notes: book.notes || [],
                        language: book.language || 'English'
                    };

                    await addDoc(booksRef, insertData);
                    syncedCount++;
                    console.log(`✅ Successfully synced: ${book.title}`);
                } catch (error) {
                    console.error(`❌ Error syncing book ${book.title}:`, error);
                    errors.push({ title: book.title, error: error.message });
                }
            }

            // Reload books from Firestore
            console.log('🔄 Reloading books from Firestore...');
            await loadBooks();
            console.log('✅ Books reloaded successfully');

            let message = `Successfully synced ${syncedCount} book${syncedCount !== 1 ? 's' : ''} to cloud`;
            if (skippedCount > 0) {
                message += `. Skipped ${skippedCount} duplicate${skippedCount !== 1 ? 's' : ''}`;
            }

            console.log(`🎉 Sync complete: ${message}`);
            return {
                success: true,
                message,
                syncedCount,
                skippedCount,
                errors
            };
        } catch (error) {
            console.error('❌ Sync failed:', error);
            return { success: false, message: 'Sync failed: ' + error.message };
        }
    };

    // Global Streak Calculation
    const getStreak = () => {
        // Collect all unique dates with reading activity across ALL books
        const allDates = new Set();
        books.forEach(book => {
            book.readingLogs?.forEach(log => {
                allDates.add(log.date.split('T')[0]); // YYYY-MM-DD
            });
        });

        const datesArr = Array.from(allDates).sort().reverse(); // Newest first
        if (datesArr.length === 0) return 0;

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Check if streak is active (read today or yesterday)
        let currentDate = datesArr[0];
        if (currentDate !== today && currentDate !== yesterday) return 0;

        // Calculate backward
        let checkDate = new Date(currentDate);

        // Simple verification (could be more robust)
        streak = 1;
        for (let i = 1; i < datesArr.length; i++) {
            const prevDate = new Date(datesArr[i]);
            const diff = differenceInCalendarDays(checkDate, prevDate);
            if (diff === 1) {
                streak++;
                checkDate = prevDate;
            } else {
                break;
            }
        }
        return streak;
    };

    // Helper: Get counts for current year
    const getYearlyStats = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const booksReadThisYear = books.filter(b =>
            b.status === 'read' &&
            b.finishedAt &&
            new Date(b.finishedAt).getFullYear() === currentYear
        );

        const readThisYear = booksReadThisYear.length;
        const readThisMonth = booksReadThisYear.filter(b =>
            new Date(b.finishedAt).getMonth() === currentMonth
        ).length;

        const totalRead = books.filter(b => b.status === 'read').length;

        // Calculate books added this month
        const addedThisMonth = books.filter(b => {
            if (!b.addedAt) return false;
            const addedDate = new Date(b.addedAt);
            return addedDate.getFullYear() === currentYear && addedDate.getMonth() === currentMonth;
        }).length;

        const pausedThisMonth = books.filter(b => {
            if (b.status !== 'paused' || !b.pausedAt) return false;
            const date = new Date(b.pausedAt);
            return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
        }).length;

        const pausedThisYear = books.filter(b => {
            if (b.status !== 'paused' || !b.pausedAt) return false;
            const date = new Date(b.pausedAt);
            return date.getFullYear() === currentYear;
        }).length;

        const dnfThisMonth = books.filter(b => {
            if (b.status !== 'dnf' || !b.dnfAt) return false;
            const date = new Date(b.dnfAt);
            return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
        }).length;

        const dnfThisYear = books.filter(b => {
            if (b.status !== 'dnf' || !b.dnfAt) return false;
            const date = new Date(b.dnfAt);
            return date.getFullYear() === currentYear;
        }).length;

        // Find Worst Book (Lowest Rating > 0)
        const ratedBooksThisYear = booksReadThisYear.filter(b => b.rating > 0);
        const worstBook = ratedBooksThisYear.sort((a, b) => a.rating - b.rating)[0];

        return {
            read: readThisYear,
            readThisYear,
            readThisMonth,
            totalRead: totalRead,
            reading: books.filter(b => b.status === 'reading').length,
            tbr: books.filter(b => b.status === 'want-to-read').length,
            paused: books.filter(b => b.status === 'paused').length,
            pausedThisYear,
            pausedThisMonth,
            dnf: books.filter(b => b.status === 'dnf').length,
            dnfThisYear,
            dnfThisMonth,
            addedThisMonth,
            worstBook,
            spent: books.reduce((acc, b) => acc + (b.isOwned ? (parseFloat(b.price) || 0) : 0), 0)
        };
    };

    // Helper: Sort Books
    const sortBooks = (moviesList, type) => {
        // return sorted list
        // Implement locally in Library usually, but context helper is fine
    };

    // Export/Import for syncing between devices
    const exportData = () => {
        const data = {
            books,
            readingGoal,
            exportedAt: new Date().toISOString(),
            version: 'v3'
        };
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `book-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importData = (file) => {
        return new Promise(async (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.books && Array.isArray(data.books)) {
                        // Remove duplicates from the imported data itself
                        const uniqueBooks = [];
                        const seenISBNs = new Set();
                        const seenTitles = new Set();

                        for (const book of data.books) {
                            const normalizedTitle = book.title?.toLowerCase().trim();
                            const isbn = book.isbn;

                            // Check if this book is a duplicate
                            const isDuplicate =
                                (isbn && seenISBNs.has(isbn)) ||
                                (normalizedTitle && seenTitles.has(normalizedTitle));

                            if (!isDuplicate) {
                                uniqueBooks.push(book);
                                if (isbn) seenISBNs.add(isbn);
                                if (normalizedTitle) seenTitles.add(normalizedTitle);
                            } else {
                                console.log(`Skipping duplicate in import file: ${book.title}`);
                            }
                        }

                        const duplicatesRemoved = data.books.length - uniqueBooks.length;
                        if (duplicatesRemoved > 0) {
                            console.log(`Removed ${duplicatesRemoved} duplicate(s) from import file`);
                        }

                        // If user is logged in, sync to Firestore
                        if (user) {
                            try {
                                // Delete existing books for this user
                                const booksRef = collection(db, 'users', user.uid, 'books');
                                const snapshot = await getDocs(booksRef);
                                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                                await Promise.all(deletePromises);

                                console.log(`Deleted ${snapshot.docs.length} existing books from Firestore`);

                                // Insert imported books (deduplicated)
                                const insertPromises = uniqueBooks.map(book => {
                                    const insertData = {
                                        title: book.title || 'Untitled',
                                        author: book.author || 'Unknown Author',
                                        cover: book.cover || null,
                                        status: book.status || 'want-to-read',
                                        progress: parseInt(book.progress) || 0,
                                        totalPages: parseInt(book.totalPages) || null,
                                        totalChapters: parseInt(book.totalChapters) || null,
                                        isbn: book.isbn || null,
                                        rating: parseFloat(book.rating) || 0,
                                        spiceRating: parseFloat(book.spiceRating) || 0,
                                        isOwned: Boolean(book.isOwned),
                                        isFavorite: Boolean(book.isFavorite),
                                        toBuy: Boolean(book.toBuy || book.isWantToBuy),
                                        price: parseFloat(book.price) || 0,
                                        review: book.review || null,
                                        format: book.format || null,
                                        genres: Array.isArray(book.genres) ? book.genres : [],
                                        addedAt: Timestamp.fromDate(new Date(book.addedAt || Date.now())),
                                        startedAt: book.startedAt ? Timestamp.fromDate(new Date(book.startedAt)) : null,
                                        finishedAt: book.finishedAt ? Timestamp.fromDate(new Date(book.finishedAt)) : null,
                                        pausedAt: book.pausedAt ? Timestamp.fromDate(new Date(book.pausedAt)) : null,
                                        dnfAt: book.dnfAt ? Timestamp.fromDate(new Date(book.dnfAt)) : null,
                                        updatedAt: serverTimestamp(),
                                        readingLogs: book.readingLogs || [],
                                        notes: book.notes || [],
                                        language: book.language || 'English'
                                    };
                                    return addDoc(booksRef, insertData);
                                });

                                await Promise.all(insertPromises);

                                console.log(`Imported ${uniqueBooks.length} unique books to Firestore`);

                                // Reload books from Firestore
                                await loadBooks();
                            } catch (error) {
                                console.error('Error importing books to Firestore:', error);
                                reject(new Error('Import failed: ' + error.message));
                                return;
                            }
                        } else {
                            // Guest mode - just update local state with deduplicated books
                            setBooks(uniqueBooks);
                        }

                        // Update reading goal
                        if (data.readingGoal) {
                            setReadingGoal(data.readingGoal);
                        }

                        resolve({
                            success: true,
                            bookCount: uniqueBooks.length,
                            duplicatesRemoved
                        });
                    } else {
                        reject(new Error('Invalid data format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    };

    const checkDuplicate = (title, isbn, excludeId = null) => {
        const titleMatch = books.some(b =>
            b.id !== excludeId &&
            b.title.toLowerCase().trim() === title?.toLowerCase().trim()
        );
        const isbnMatch = isbn && books.some(b =>
            b.id !== excludeId &&
            b.isbn === isbn
        );

        if (titleMatch || isbnMatch) {
            return {
                exists: true,
                type: titleMatch ? 'Title' : 'ISBN'
            };
        }
        return { exists: false };
    };

    // User Profile (Local)
    const [userProfile, setUserProfile] = useState(() => {
        const saved = localStorage.getItem('user-profile');
        return saved ? JSON.parse(saved) : { name: '', avatar: '' };
    });

    const updateUserProfile = (profile) => {
        setUserProfile(prev => {
            const updated = { ...prev, ...profile };
            localStorage.setItem('user-profile', JSON.stringify(updated));
            return updated;
        });
    };

    // ============================================
    // READING SESSIONS MANAGEMENT
    // ============================================
    const createReadingSession = async (bookId, durationMinutes, pagesRead, startedAt, endedAt) => {
        if (!user) return { success: false, message: 'User not logged in' };

        try {
            const sessionsRef = collection(db, 'users', user.uid, 'books', bookId, 'sessions');
            const docRef = await addDoc(sessionsRef, {
                durationMinutes,
                pagesRead,
                startedAt: Timestamp.fromDate(new Date(startedAt)),
                endedAt: Timestamp.fromDate(new Date(endedAt)),
                createdAt: serverTimestamp()
            });

            return { success: true, data: { id: docRef.id } };
        } catch (error) {
            console.error('Error creating reading session:', error);
            return { success: false, message: error.message };
        }
    };

    const getBookSessions = async (bookId) => {
        if (!user) return [];

        try {
            const sessionsRef = collection(db, 'users', user.uid, 'books', bookId, 'sessions');
            const q = query(sessionsRef, orderBy('startedAt', 'desc'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
                startedAt: docSnap.data().startedAt?.toDate?.()?.toISOString(),
                endedAt: docSnap.data().endedAt?.toDate?.()?.toISOString()
            }));
        } catch (error) {
            console.error('Error fetching book sessions:', error);
            return [];
        }
    };

    const getUserSessions = async (startDate, endDate) => {
        if (!user) return [];

        try {
            // Note: Firestore doesn't support cross-collection queries easily
            // We'd need to query all books' sessions subcollections
            // For now, return empty array - this function may need restructuring
            console.warn('getUserSessions not fully implemented for Firestore yet');
            return [];
        } catch (error) {
            console.error('Error fetching user sessions:', error);
            return [];
        }
    };

    // ============================================
    // BOOK NOTES MANAGEMENT
    // ============================================
    const addBookNote = async (bookId, content, pageReference = null, isPrivate = true) => {
        if (!user) {
            // Fallback to local state for guest users
            setBooks(prev => prev.map(book => {
                if (book.id !== bookId) return book;
                const newNote = {
                    id: Date.now().toString(),
                    content,
                    page: pageReference,
                    createdAt: new Date().toISOString()
                };
                return {
                    ...book,
                    notes: [...(book.notes || []), newNote]
                };
            }));
            return { success: true };
        }

        try {
            const notesRef = collection(db, 'users', user.uid, 'books', bookId, 'notes');
            const docRef = await addDoc(notesRef, {
                content,
                date: Timestamp.fromDate(new Date()),
                createdAt: serverTimestamp()
            });

            // Update local state
            setBooks(prev => prev.map(book => {
                if (book.id !== bookId) return book;
                return {
                    ...book,
                    notes: [...(book.notes || []), {
                        id: docRef.id,
                        content,
                        date: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    }]
                };
            }));

            return { success: true, data: { id: docRef.id } };
        } catch (error) {
            console.error('Error adding note:', error);
            return { success: false, message: error.message };
        }
    };

    const updateBookNote = async (bookId, noteId, updates) => {
        if (!user) return { success: false, message: 'User not logged in' };

        try {
            const noteRef = doc(db, 'users', user.uid, 'books', bookId, 'notes', noteId);
            await updateDoc(noteRef, {
                content: updates.content
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating note:', error);
            return { success: false, message: error.message };
        }
    };

    const deleteBookNote = async (bookId, noteId) => {
        if (!user) {
            // Fallback for guest users
            setBooks(prev => prev.map(book => ({
                ...book,
                notes: (book.notes || []).filter(note => note.id !== noteId)
            })));
            return { success: true };
        }

        try {
            const noteRef = doc(db, 'users', user.uid, 'books', bookId, 'notes', noteId);
            await deleteDoc(noteRef);

            // Update local state
            setBooks(prev => prev.map(book => ({
                ...book,
                notes: (book.notes || []).filter(note => note.id !== noteId)
            })));

            return { success: true };
        } catch (error) {
            console.error('Error deleting note:', error);
            return { success: false, message: error.message };
        }
    };

    const getBookNotes = async (bookId) => {
        if (!user) {
            const book = books.find(b => b.id === bookId);
            return book?.notes || [];
        }

        try {
            const notesRef = collection(db, 'users', user.uid, 'books', bookId, 'notes');
            const q = query(notesRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
                date: docSnap.data().date?.toDate?.()?.toISOString(),
                createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString()
            }));
        } catch (error) {
            console.error('Error fetching notes:', error);
            return [];
        }
    };

    // ============================================
    // READING GOALS MANAGEMENT
    // ============================================
    const setReadingGoalDB = async (year, month = null, targetBooks = 0, targetPages = 0) => {
        if (!user) {
            // Fallback to local state for guest users
            setReadingGoal({ yearly: targetBooks, monthly: month ? targetBooks : readingGoal.monthly });
            localStorage.setItem('reading-goal', JSON.stringify({ yearly: targetBooks, monthly: month ? targetBooks : readingGoal.monthly }));
            return { success: true };
        }

        try {
            const goalRef = doc(db, 'users', user.uid, 'goals', year.toString());
            await updateDoc(goalRef, {
                yearlyGoal: !month ? targetBooks : null,
                monthlyGoal: month ? targetBooks : null,
                updatedAt: serverTimestamp()
            }).catch(async () => {
                // Document doesn't exist, create it
                await addDoc(collection(db, 'users', user.uid, 'goals'), {
                    year,
                    yearlyGoal: !month ? targetBooks : null,
                    monthlyGoal: month ? targetBooks : null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });

            // Update local state
            if (!month) {
                setReadingGoal(prev => ({ ...prev, yearly: targetBooks }));
            } else {
                setReadingGoal(prev => ({ ...prev, monthly: targetBooks }));
            }

            return { success: true };
        } catch (error) {
            console.error('Error setting reading goal:', error);
            return { success: false, message: error.message };
        }
    };

    const getReadingGoalDB = async (year, month = null) => {
        if (!user) return null;

        try {
            const goalRef = doc(db, 'users', user.uid, 'goals', year.toString());
            const docSnap = await getDoc(goalRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error('Error fetching reading goal:', error);
            return null;
        }
    };

    const getGoalProgress = async (year, month = null) => {
        const goal = await getReadingGoalDB(year, month);
        if (!goal) return null;

        const stats = getYearlyStats();
        const booksRead = month ? stats.readThisMonth : stats.readThisYear;

        return {
            target: goal.target_books,
            current: booksRead,
            percentage: goal.target_books > 0 ? (booksRead / goal.target_books) * 100 : 0
        };
    };

    return (
        <BookContext.Provider value={{
            books,
            loading,
            addBook,
            updateBook,
            addNote,
            deleteNote,
            deleteBook,
            bulkDeleteBooks,
            getYearlyStats,
            getStreak,
            logReading,
            readingGoal,
            setReadingGoal,
            exportData,
            importData,
            syncLocalToCloud,
            checkDuplicate,
            userProfile,
            updateUserProfile,
            celebrationBook,
            closeCelebration,
            activeTimer,
            startTimer,
            stopTimer,
            globalSpeed: calculateGlobalSpeed(books),
            // Reading Sessions
            createReadingSession,
            getBookSessions,
            getUserSessions,
            // Book Notes (new table-based)
            addBookNote,
            updateBookNote,
            deleteBookNote,
            getBookNotes,
            // Reading Goals (new table-based)
            setReadingGoalDB,
            getReadingGoalDB,
            getGoalProgress,
            // Helper filters
            readingBooks: books.filter(b => b.status === 'reading'),
            wantToReadBooks: books.filter(b => b.status === 'want-to-read'),
            ownedBooks: books.filter(b => b.isOwned),
            toBuyBooks: books.filter(b => b.toBuy || b.isWantToBuy)
        }}>
            {children}
        </BookContext.Provider>
    );
};
