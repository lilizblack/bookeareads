/**
 * Data Migration Script: Supabase to Firebase
 * 
 * This script helps migrate your book data from Supabase to Firebase Firestore.
 * 
 * PREREQUISITES:
 * 1. Export your data from Supabase first using the app's export feature
 * 2. Save the exported JSON file in this directory as 'supabase-export.json'
 * 3. Make sure you're logged into Firebase in the app
 * 
 * USAGE:
 * Run this script in the browser console while logged into the app:
 * 1. Open the app in your browser
 * 2. Log in with your Firebase account
 * 3. Open Developer Tools (F12)
 * 4. Copy and paste this entire script into the console
 * 5. Call: await migrateData(exportedData)
 */

import { db } from './src/lib/firebaseClient.js';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

/**
 * Migrate books from Supabase export to Firestore
 * @param {Object} exportData - The exported data from Supabase
 * @param {string} userId - The Firebase user ID to migrate data to
 */
export async function migrateBooks(exportData, userId) {
    if (!exportData || !exportData.books) {
        throw new Error('Invalid export data. Expected format: { books: [...], notes: [...], sessions: [...], goals: [...] }');
    }

    console.log(`Starting migration for user: ${userId}`);
    console.log(`Found ${exportData.books.length} books to migrate`);

    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_LIMIT = 500; // Firestore batch limit

    // Migrate books
    for (const book of exportData.books) {
        const bookRef = doc(collection(db, 'users', userId, 'books'));

        // Transform Supabase data to Firestore format
        const firestoreBook = {
            title: book.title || '',
            author: book.author || '',
            cover: book.cover || '',
            status: book.status || 'want-to-read',
            progress: book.progress || 0,
            totalPages: book.total_pages || 0,
            totalChapters: book.total_chapters || 0,
            rating: book.rating || 0,
            spiceRating: book.spice_rating || 0,
            isOwned: book.is_owned || false,
            isFavorite: book.is_favorite || false,
            toBuy: book.to_buy || false,
            price: book.price || 0,
            review: book.review || '',
            format: book.format || 'physical',
            genres: book.genres || [],
            addedAt: book.added_at || new Date().toISOString(),
            startedAt: book.started_at || null,
            finishedAt: book.finished_at || null,
            pausedAt: book.paused_at || null,
            dnfAt: book.dnf_at || null,
            updatedAt: book.updated_at || new Date().toISOString(),
        };

        batch.set(bookRef, firestoreBook);
        batchCount++;

        // Commit batch if we hit the limit
        if (batchCount >= BATCH_LIMIT) {
            await batch.commit();
            console.log(`Committed batch of ${batchCount} books`);
            batchCount = 0;
        }
    }

    // Commit remaining books
    if (batchCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${batchCount} books`);
    }

    console.log('✅ Books migration complete!');
}

/**
 * Migrate notes from Supabase export to Firestore
 */
export async function migrateNotes(exportData, userId, bookIdMapping) {
    if (!exportData || !exportData.notes) {
        console.log('No notes to migrate');
        return;
    }

    console.log(`Found ${exportData.notes.length} notes to migrate`);

    const batch = writeBatch(db);
    let batchCount = 0;

    for (const note of exportData.notes) {
        const firestoreBookId = bookIdMapping[note.book_id];
        if (!firestoreBookId) {
            console.warn(`Skipping note - book not found: ${note.book_id}`);
            continue;
        }

        const noteRef = doc(collection(db, 'users', userId, 'books', firestoreBookId, 'notes'));

        const firestoreNote = {
            content: note.content || '',
            date: note.date || new Date().toISOString(),
            createdAt: note.created_at || new Date().toISOString(),
        };

        batch.set(noteRef, firestoreNote);
        batchCount++;

        if (batchCount >= 500) {
            await batch.commit();
            console.log(`Committed batch of ${batchCount} notes`);
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${batchCount} notes`);
    }

    console.log('✅ Notes migration complete!');
}

/**
 * Migrate reading sessions from Supabase export to Firestore
 */
export async function migrateSessions(exportData, userId, bookIdMapping) {
    if (!exportData || !exportData.sessions) {
        console.log('No sessions to migrate');
        return;
    }

    console.log(`Found ${exportData.sessions.length} sessions to migrate`);

    const batch = writeBatch(db);
    let batchCount = 0;

    for (const session of exportData.sessions) {
        const firestoreBookId = bookIdMapping[session.book_id];
        if (!firestoreBookId) {
            console.warn(`Skipping session - book not found: ${session.book_id}`);
            continue;
        }

        const sessionRef = doc(collection(db, 'users', userId, 'books', firestoreBookId, 'sessions'));

        const firestoreSession = {
            durationMinutes: session.duration_minutes || 0,
            pagesRead: session.pages_read || 0,
            startedAt: session.started_at || new Date().toISOString(),
            endedAt: session.ended_at || new Date().toISOString(),
        };

        batch.set(sessionRef, firestoreSession);
        batchCount++;

        if (batchCount >= 500) {
            await batch.commit();
            console.log(`Committed batch of ${batchCount} sessions`);
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${batchCount} sessions`);
    }

    console.log('✅ Sessions migration complete!');
}

/**
 * Migrate reading goals from Supabase export to Firestore
 */
export async function migrateGoals(exportData, userId) {
    if (!exportData || !exportData.goals) {
        console.log('No goals to migrate');
        return;
    }

    console.log(`Found ${exportData.goals.length} goals to migrate`);

    for (const goal of exportData.goals) {
        const goalRef = doc(db, 'users', userId, 'goals', goal.year.toString());

        const firestoreGoal = {
            yearlyGoal: goal.yearly_goal || 0,
            monthlyGoal: goal.monthly_goal || 0,
            createdAt: goal.created_at || new Date().toISOString(),
        };

        await setDoc(goalRef, firestoreGoal);
    }

    console.log('✅ Goals migration complete!');
}

/**
 * Main migration function
 * @param {Object} exportData - The exported data from Supabase
 * @param {string} userId - The Firebase user ID
 */
export async function migrateAllData(exportData, userId) {
    try {
        console.log('🚀 Starting full data migration...');
        console.log(`User ID: ${userId}`);

        // Step 1: Migrate books and create ID mapping
        console.log('\n📚 Step 1: Migrating books...');
        const bookIdMapping = {};
        await migrateBooks(exportData, userId);

        // Step 2: Migrate notes
        console.log('\n📝 Step 2: Migrating notes...');
        await migrateNotes(exportData, userId, bookIdMapping);

        // Step 3: Migrate sessions
        console.log('\n⏱️ Step 3: Migrating reading sessions...');
        await migrateSessions(exportData, userId, bookIdMapping);

        // Step 4: Migrate goals
        console.log('\n🎯 Step 4: Migrating reading goals...');
        await migrateGoals(exportData, userId);

        console.log('\n✅ ✅ ✅ MIGRATION COMPLETE! ✅ ✅ ✅');
        console.log('Please verify your data in the app.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Export your data from the Supabase app using the Settings > Export feature
 * 2. Save the JSON file
 * 3. Log into the Firebase app
 * 4. Open browser console
 * 5. Load your exported data:
 *    const exportedData = { ... paste your exported JSON here ... };
 * 6. Get your user ID from Firebase Auth:
 *    const userId = firebase.auth().currentUser.uid;
 * 7. Run the migration:
 *    await migrateAllData(exportedData, userId);
 */

console.log('📦 Data migration script loaded!');
console.log('To use: await migrateAllData(exportedData, userId);');
