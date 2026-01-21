import React, { createContext, useContext, useState, useEffect } from 'react';
import { isSameDay, differenceInCalendarDays, parseISO } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
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

    // Initial Load - Fetch from Supabase OR LocalStorage
    useEffect(() => {
        const loadBooks = async () => {
            setLoading(true);

            // 1. Authenticated User -> Fetch from Supabase
            if (user) {
                const { data, error } = await supabase
                    .from('books')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('added_at', { ascending: false });

                if (error) {
                    console.error('Error fetching books:', error);
                    console.error('Error details:', JSON.stringify(error, null, 2));
                } else {
                    if (data) {
                        // Transform DB snake_case to app camelCase
                        const appBooks = data.map(b => ({
                            ...b,
                            // Map specific fields if key names differ (they mostly match or we mapped in sync)
                            // Database Schema uses snake_case, App uses camelCase
                            userId: b.user_id,
                            totalPages: b.total_pages,
                            totalChapters: b.total_chapters,
                            spiceRating: b.spice_rating,
                            isOwned: b.is_owned,
                            isFavorite: b.is_favorite,
                            toBuy: b.to_buy,
                            addedAt: b.added_at,
                            startedAt: b.started_at,
                            finishedAt: b.finished_at,
                            pausedAt: b.paused_at,
                            dnfAt: b.dnf_at,
                            readingLogs: b.reading_logs || [],
                            notes: b.notes || []
                        }));
                        setBooks(appBooks);
                    }
                }
            }
            // 2. Offline Mode (Logged out but keeping data visible)
            else if (isOfflineMode) {
                const savedBooks = localStorage.getItem('book-tracker-data-v3');
                const savedGoal = localStorage.getItem('reading-goal');
                if (savedBooks) setBooks(JSON.parse(savedBooks));
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
                if (savedBooks) setBooks(JSON.parse(savedBooks));
                if (savedGoal) {
                    try {
                        const parsed = JSON.parse(savedGoal);
                        setReadingGoal(typeof parsed === 'object' ? parsed : { yearly: 12, monthly: 1 });
                    } catch (e) {
                        // Default handled in useState
                    }
                }
            }
            setLoading(false);
        };

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
            // Supabase Insert
            // Build insert object (ISBN, reading_logs, notes excluded due to schema cache issues)
            const insertData = {
                user_id: user.id,
                title: newBook.title,
                author: newBook.author,
                cover: newBook.cover,
                status: newBook.status || 'want-to-read',
                progress: newBook.progress || 0,
                total_pages: newBook.totalPages || null,
                total_chapters: newBook.totalChapters || null,
                rating: newBook.rating || 0,
                spice_rating: newBook.spiceRating || 0,
                is_owned: newBook.isOwned || false,
                is_favorite: newBook.isFavorite || false,
                to_buy: newBook.toBuy || false,
                price: newBook.price ? parseFloat(newBook.price) : null,
                review: newBook.review || null,
                format: newBook.format || null,
                genres: newBook.genres || [],
                added_at: newBook.addedAt,
                started_at: newBook.startedAt || null,
                finished_at: newBook.finishedAt || null
            };

            const { data, error } = await supabase.from('books').insert([insertData]).select();

            if (error) {
                console.error('Error inserting book to Supabase:', error);
                alert('Failed to save book: ' + error.message);
                return; // Don't add to local state if Supabase insert failed
            }

            if (data && data[0]) {
                // Use the real ID from Supabase
                newBook.id = data[0].id;
                newBook.userId = user.id;
            } else {
                console.error('No data returned from Supabase insert');
                return; // Don't add to local state if no data returned
            }
        }

        setBooks(prev => [...prev, newBook]);
    };

    // Celebration State (Share Modal)
    const [celebrationBook, setCelebrationBook] = useState(null);
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
                    supabase.from('books').update({
                        status: updated.status,
                        progress: updated.progress,
                        rating: updated.rating,
                        spice_rating: updated.spiceRating,
                        is_favorite: updated.isFavorite,
                        is_owned: updated.isOwned,
                        finished_at: updated.finishedAt,
                        paused_at: updated.pausedAt,
                        dnf_at: updated.dnfAt,
                        review: updated.review,
                        cover: updated.cover, // Allow updating cover/details
                        title: updated.title,
                        author: updated.author,
                        updated_at: new Date().toISOString()
                    }).eq('id', id).eq('user_id', user.id).then(({ error }) => {
                        if (error) console.error('Supabase update failed:', error);
                    });
                }
                return updated;
            });
        });
    };

    const deleteBook = async (id) => {
        if (user) {
            await supabase.from('books').delete().eq('id', id).eq('user_id', user.id);
        }
        setBooks(prev => prev.filter(book => book.id !== id));
    };

    const bulkDeleteBooks = async (ids) => {
        if (user) {
            await supabase.from('books').delete().in('id', ids).eq('user_id', user.id);
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
        if (!user) {
            alert('Please log in to sync to cloud');
            return { success: false, message: 'Not logged in' };
        }

        try {
            // Use the existing sync utility
            const { syncLocalDataToSupabase } = await import('../utils/syncUtils');
            const result = await syncLocalDataToSupabase(user.id);

            if (result) {
                // Refresh books from cloud after sync
                const { data, error } = await supabase
                    .from('books')
                    .select('*')
                    .order('updated_at', { ascending: false });

                if (!error && data) {
                    const appBooks = data.map(b => ({
                        ...b,
                        userId: b.user_id,
                        totalPages: b.total_pages,
                        totalChapters: b.total_chapters,
                        isbn: b.isbn,
                        spiceRating: b.spice_rating,
                        isOwned: b.is_owned,
                        isFavorite: b.is_favorite,
                        toBuy: b.to_buy,
                        addedAt: b.added_at,
                        startedAt: b.started_at,
                        finishedAt: b.finished_at,
                        pausedAt: b.paused_at,
                        dnfAt: b.dnf_at,
                        readingLogs: [],
                        notes: []
                    }));
                    setBooks(appBooks);
                }

                return { success: true, message: 'Sync completed successfully' };
            }

            return { success: true, message: 'No new data to sync' };
        } catch (error) {
            console.error('Sync failed:', error);
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
                        // If user is logged in, sync to Supabase
                        if (user && supabase) {
                            // Delete existing books for this user
                            const { error: deleteError } = await supabase
                                .from('books')
                                .delete()
                                .eq('user_id', user.id);

                            if (deleteError) {
                                console.error('Error deleting existing books:', deleteError);
                                reject(new Error('Failed to clear existing books: ' + deleteError.message));
                                return;
                            }

                            // Format and insert imported books
                            const formattedBooks = data.books.map(book => ({
                                user_id: user.id,
                                title: book.title || 'Untitled',
                                author: book.author || 'Unknown Author',
                                cover: book.cover || null,
                                status: book.status || 'want-to-read',
                                progress: parseInt(book.progress) || 0,
                                total_pages: parseInt(book.totalPages) || null,
                                total_chapters: parseInt(book.totalChapters) || null,
                                isbn: book.isbn || null,
                                rating: parseFloat(book.rating) || 0,
                                spice_rating: parseFloat(book.spiceRating) || 0,
                                is_owned: Boolean(book.isOwned),
                                is_favorite: Boolean(book.isFavorite),
                                to_buy: Boolean(book.toBuy || book.isWantToBuy),
                                price: parseFloat(book.price) || 0,
                                review: book.review || null,
                                format: book.format || null,
                                genres: Array.isArray(book.genres) ? book.genres : [],
                                added_at: book.addedAt || new Date().toISOString(),
                                started_at: book.startedAt || null,
                                finished_at: book.finishedAt || null,
                                paused_at: book.pausedAt || null,
                                dnf_at: book.dnfAt || null
                            }));

                            const { error: insertError } = await supabase
                                .from('books')
                                .insert(formattedBooks);

                            if (insertError) {
                                console.error('Error syncing imported books:', insertError);
                                reject(new Error('Import failed to sync to cloud: ' + insertError.message));
                                return;
                            }

                            // Fetch the newly inserted books to update local state
                            const { data: fetchedBooks, error: fetchError } = await supabase
                                .from('books')
                                .select('*')
                                .order('updated_at', { ascending: false });

                            if (fetchError) {
                                console.error('Error fetching imported books:', fetchError);
                                reject(new Error('Import succeeded but failed to fetch: ' + fetchError.message));
                                return;
                            }

                            // Transform to app format
                            const appBooks = fetchedBooks.map(b => ({
                                ...b,
                                userId: b.user_id,
                                totalPages: b.total_pages,
                                totalChapters: b.total_chapters,
                                isbn: b.isbn,
                                spiceRating: b.spice_rating,
                                isOwned: b.is_owned,
                                isFavorite: b.is_favorite,
                                toBuy: b.to_buy,
                                addedAt: b.added_at,
                                startedAt: b.started_at,
                                finishedAt: b.finished_at,
                                pausedAt: b.paused_at,
                                dnfAt: b.dnf_at,
                                readingLogs: [],
                                notes: []
                            }));

                            setBooks(appBooks);
                        } else {
                            // Guest mode - just update local state
                            setBooks(data.books);
                        }

                        // Update reading goal
                        if (data.readingGoal) {
                            setReadingGoal(data.readingGoal);
                        }

                        resolve({ success: true, bookCount: data.books.length });
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
            const { data, error } = await supabase
                .from('reading_sessions')
                .insert({
                    user_id: user.id,
                    book_id: bookId,
                    duration_minutes: durationMinutes,
                    pages_read: pagesRead,
                    started_at: startedAt,
                    ended_at: endedAt
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating reading session:', error);
            return { success: false, message: error.message };
        }
    };

    const getBookSessions = async (bookId) => {
        if (!user) return [];

        try {
            const { data, error } = await supabase
                .from('reading_sessions')
                .select('*')
                .eq('book_id', bookId)
                .order('started_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching book sessions:', error);
            return [];
        }
    };

    const getUserSessions = async (startDate, endDate) => {
        if (!user) return [];

        try {
            let query = supabase
                .from('reading_sessions')
                .select('*')
                .order('started_at', { ascending: false });

            if (startDate) query = query.gte('started_at', startDate);
            if (endDate) query = query.lte('started_at', endDate);

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
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
            const { data, error } = await supabase
                .from('book_notes')
                .insert({
                    user_id: user.id,
                    book_id: bookId,
                    content,
                    page_reference: pageReference,
                    is_private: isPrivate
                })
                .select()
                .single();

            if (error) throw error;

            // Update local state
            setBooks(prev => prev.map(book => {
                if (book.id !== bookId) return book;
                return {
                    ...book,
                    notes: [...(book.notes || []), {
                        id: data.id,
                        content: data.content,
                        page: data.page_reference,
                        createdAt: data.created_at
                    }]
                };
            }));

            return { success: true, data };
        } catch (error) {
            console.error('Error adding note:', error);
            return { success: false, message: error.message };
        }
    };

    const updateBookNote = async (noteId, updates) => {
        if (!user) return { success: false, message: 'User not logged in' };

        try {
            const { data, error } = await supabase
                .from('book_notes')
                .update({
                    content: updates.content,
                    page_reference: updates.pageReference,
                    updated_at: new Date().toISOString()
                })
                .eq('id', noteId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating note:', error);
            return { success: false, message: error.message };
        }
    };

    const deleteBookNote = async (noteId) => {
        if (!user) {
            // Fallback for guest users
            setBooks(prev => prev.map(book => ({
                ...book,
                notes: (book.notes || []).filter(note => note.id !== noteId)
            })));
            return { success: true };
        }

        try {
            const { error } = await supabase
                .from('book_notes')
                .delete()
                .eq('id', noteId);

            if (error) throw error;

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
            const { data, error } = await supabase
                .from('book_notes')
                .select('*')
                .eq('book_id', bookId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
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
            const { data, error } = await supabase
                .from('reading_goals')
                .upsert({
                    user_id: user.id,
                    year,
                    month,
                    target_books: targetBooks,
                    target_pages: targetPages,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,year,month'
                })
                .select()
                .single();

            if (error) throw error;

            // Update local state
            if (!month) {
                setReadingGoal(prev => ({ ...prev, yearly: targetBooks }));
            } else {
                setReadingGoal(prev => ({ ...prev, monthly: targetBooks }));
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error setting reading goal:', error);
            return { success: false, message: error.message };
        }
    };

    const getReadingGoalDB = async (year, month = null) => {
        if (!user) return null;

        try {
            let query = supabase
                .from('reading_goals')
                .select('*')
                .eq('year', year);

            if (month) {
                query = query.eq('month', month);
            } else {
                query = query.is('month', null);
            }

            const { data, error } = await query.single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
            return data;
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
