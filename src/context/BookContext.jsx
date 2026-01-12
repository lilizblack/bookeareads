import React, { createContext, useContext, useState, useEffect } from 'react';
import { isSameDay, differenceInCalendarDays, parseISO } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

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
    const { user } = useAuth();
    const [books, setBooks] = useState(() => {
        const saved = localStorage.getItem('book-tracker-data-v3');
        return saved ? JSON.parse(saved) : INITIAL_BOOKS;
    });
    const [loading, setLoading] = useState(true);
    const [readingGoal, setReadingGoal] = useState({ yearly: 15, monthly: 2 });

    // Initial load from localStorage
    useEffect(() => {
        const savedBooks = localStorage.getItem('book-tracker-data-v3');
        const savedGoal = localStorage.getItem('reading-goal');
        if (savedBooks) setBooks(JSON.parse(savedBooks));
        if (savedGoal) {
            try {
                const parsed = JSON.parse(savedGoal);
                if (typeof parsed === 'object' && parsed !== null) {
                    setReadingGoal(parsed);
                } else {
                    // Migration: if it was a number, convert to object
                    setReadingGoal({ yearly: parseInt(parsed) || 12, monthly: Math.ceil(parseInt(parsed) / 12) || 1 });
                }
            } catch (e) {
                setReadingGoal({ yearly: parseInt(savedGoal) || 12, monthly: 1 });
            }
        }
        setLoading(false);
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('book-tracker-data-v3', JSON.stringify(books));
        localStorage.setItem('reading-goal', JSON.stringify(readingGoal));
    }, [books, readingGoal]);

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
                return updated;
            });
        });
    };

    const deleteBook = async (id) => {
        setBooks(prev => prev.filter(book => book.id !== id));
    };

    const bulkDeleteBooks = async (ids) => {
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
        // Disabled for local-only focus
        console.log('Sync disabled');
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
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.books && Array.isArray(data.books)) {
                        setBooks(data.books);
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
