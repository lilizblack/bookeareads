import { db } from '../lib/firebaseClient';
import { collection, getDocs, addDoc, query, where, Timestamp, serverTimestamp } from 'firebase/firestore';

export const syncLocalDataToFirestore = async (userId) => {
    if (!db) return false;

    try {
        const localData = localStorage.getItem('book-tracker-data-v3');
        if (!localData) {
            return true; // No data is not an error
        }

        const books = JSON.parse(localData);
        if (!Array.isArray(books) || books.length === 0) {
            return true;
        }

        console.log('Found local data. Starting sync...', books.length, 'books');

        // Check which books already exist in Firestore
        const booksRef = collection(db, 'users', userId, 'books');
        const snapshot = await getDocs(booksRef);
        const existingIds = new Set(snapshot.docs.map(doc => doc.id));

        // Only sync books that don't already exist (filter out Firestore IDs)
        const booksToSync = books.filter(book => {
            // If book has a Firestore ID (20 chars alphanumeric), skip if exists
            const isFirestoreId = /^[a-zA-Z0-9]{20}$/.test(book.id);
            if (isFirestoreId && existingIds.has(book.id)) {
                return false; // Already in Firestore
            }
            // If book has a timestamp ID (created offline), sync it
            return !isFirestoreId;
        });

        if (booksToSync.length === 0) {
            console.log('No new books to sync');
            return true;
        }

        console.log(`Syncing ${booksToSync.length} offline books...`);

        // Sanitize and validate books before upload
        const syncPromises = booksToSync.map(async (book) => {
            // Create clean object with ONLY valid Firestore fields
            const cleanBook = {
                title: book.title || 'Untitled',
                author: book.author || null,
                cover: book.cover || null,
                status: book.status || 'want-to-read',
                progress: parseInt(book.progress) || 0,
                totalPages: book.totalPages ? parseInt(book.totalPages) : null,
                totalChapters: book.totalChapters ? parseInt(book.totalChapters) : null,
                rating: parseFloat(book.rating) || 0,
                spiceRating: parseFloat(book.spiceRating) || 0,
                isOwned: Boolean(book.isOwned),
                isFavorite: Boolean(book.isFavorite),
                toBuy: Boolean(book.toBuy || book.isWantToBuy),
                price: book.price ? parseFloat(book.price) : null,
                review: book.review || null,
                format: book.format || null,
                genres: Array.isArray(book.genres) ? book.genres : [],
                addedAt: book.addedAt ? Timestamp.fromDate(new Date(book.addedAt)) : Timestamp.now(),
                startedAt: book.startedAt ? Timestamp.fromDate(new Date(book.startedAt)) : null,
                finishedAt: book.finishedAt ? Timestamp.fromDate(new Date(book.finishedAt)) : null,
                pausedAt: book.pausedAt ? Timestamp.fromDate(new Date(book.pausedAt)) : null,
                dnfAt: book.dnfAt ? Timestamp.fromDate(new Date(book.dnfAt)) : null,
                updatedAt: serverTimestamp(),
                readingLogs: [],
                notes: []
            };

            // Remove any undefined values
            Object.keys(cleanBook).forEach(key => {
                if (cleanBook[key] === undefined) {
                    delete cleanBook[key];
                }
            });

            return addDoc(booksRef, cleanBook);
        });

        await Promise.all(syncPromises);

        console.log('Successfully synced books to Firestore:', booksToSync.length);
        return true;

    } catch (error) {
        console.error('Sync failed:', error);
        return false;
    }
};

// Keep old function name for backward compatibility
export const syncLocalDataToSupabase = syncLocalDataToFirestore;
